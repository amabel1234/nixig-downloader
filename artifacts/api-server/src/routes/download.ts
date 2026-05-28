import { Router } from "express";
import { DownloadMediaBody } from "@workspace/api-zod";

const router = Router();

const API_KEY = process.env.VTECH_API_KEY || "";
const API_BASE = "https://api.vtech.biz.id/api/download";

const ENDPOINTS: Record<string, string> = {
  tiktok: "/tiktok",
  tiktokslide: "/tiktokslide",
  instagram: "/igdowloader",
  youtube: "/ytdlv2",
  facebook: "/fbdown",
  pinterest: "/pinterest",
  threads: "/threads",
  capcut: "/capcut",
  cocofun: "/cocofun",
  snackvideo: "/snackvideo",
  spotify: "/spotify",
  gdrive: "/gdrive",
};

function detectPlatform(url: string): string | null {
  try {
    const h = new URL(url).hostname.replace("www.", "");
    if (h.includes("tiktok.com")) return "tiktok";
    if (h.includes("instagram.com")) return "instagram";
    if (h.includes("youtube.com") || h.includes("youtu.be")) return "youtube";
    if (h.includes("facebook.com") || h.includes("fb.watch")) return "facebook";
    if (h.includes("pinterest.com") || h.includes("pin.it")) return "pinterest";
    if (h.includes("threads.net")) return "threads";
    if (h.includes("capcut.com")) return "capcut";
    if (h.includes("icocofun.com")) return "cocofun";
    if (h.includes("snackvideo.com")) return "snackvideo";
    if (h.includes("spotify.com")) return "spotify";
    if (h.includes("drive.google.com")) return "gdrive";
    return null;
  } catch {
    return null;
  }
}

async function fetchAPI(endpoint: string, url: string): Promise<unknown> {
  const apiUrl = `${API_BASE}${endpoint}?apikey=${API_KEY}&url=${encodeURIComponent(url)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(apiUrl, { signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok) throw new Error(`Upstream API error ${response.status}`);
    return response.json();
  } catch (err) {
    clearTimeout(timer);
    if ((err as Error).name === "AbortError") throw new Error("Request timed out");
    throw err;
  }
}

router.post("/download", async (req, res) => {
  const parsed = DownloadMediaBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: "URL tidak valid" });
    return;
  }

  const { url } = parsed.data;
  const platform = detectPlatform(url.trim());

  if (!platform) {
    res
      .status(400)
      .json({ success: false, error: "Platform tidak didukung atau URL tidak dikenali" });
    return;
  }

  const endpoint = ENDPOINTS[platform];
  if (!endpoint) {
    res.status(400).json({ success: false, error: "Platform endpoint tidak dikonfigurasi" });
    return;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let data = (await fetchAPI(endpoint, url.trim())) as any;

    // TikTok: auto-detect slide/photo mode
    if (platform === "tiktok") {
      const r = data?.result;
      const hasNoVideo = !r?.video || r.video.length === 0;
      const hasImages = r?.images && r.images.length > 0;
      const isPhotoUrl = url.includes("/photo/");
      if (isPhotoUrl || (hasNoVideo && hasImages)) {
        try {
          const slideData = (await fetchAPI(ENDPOINTS.tiktokslide, url.trim())) as any;
          if (slideData?.result?.images?.length) {
            data = { ...slideData, _slideMode: true };
          }
        } catch {
          /* keep original */
        }
      }
    }

    req.log.info({ platform, url: url.trim() }, "Media fetched successfully");
    return res.json({ success: true, platform, data });
  } catch (err) {
    req.log.error({ err, platform }, "Error fetching media");
    const message = (err as Error).message || "Failed to fetch media";
    return res.status(502).json({ success: false, error: message });
  }
});

export default router;
