import { Router } from "express";

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

const TEST_URLS: Record<string, string> = {
  tiktok: "https://vt.tiktok.com/ZSeJ7P56G",
  tiktokslide: "https://vt.tiktok.com/ZSHGno9d2L4w1-thgJL/",
  instagram: "https://www.instagram.com/reel/DREcZAakbis/?igsh=YXpvbDRmMHQxcGw5",
  youtube: "https://www.youtube.com/watch?v=HyhLsy6b0XI",
  facebook: "https://www.facebook.com/watch/?v=1393572814172251",
  pinterest: "https://pin.it/4CVodSq",
  threads: "https://www.threads.net/t/Cujx6ryoYx6/",
  capcut:
    "https://www.capcut.com/template-detail/7299286607478181121?template_id=7299286607478181121",
  cocofun: "https://www.icocofun.com/share/post/379250110809",
  snackvideo: "https://s.snackvideo.com/p/j9jKr9dR",
  spotify: "https://open.spotify.com/track/3zakx7RAwdkUQlOoQ7SJRt",
  gdrive: "https://drive.google.com/file/d/1thDYWcS5p5FFhzTpTev7RUv0VFnNQyZ4/view",
};

const PLATFORM_NAMES: Record<string, string> = {
  tiktok: "TikTok",
  tiktokslide: "TikTok Slide",
  instagram: "Instagram",
  youtube: "YouTube",
  facebook: "Facebook",
  pinterest: "Pinterest",
  threads: "Threads",
  capcut: "CapCut",
  cocofun: "CocoFun",
  snackvideo: "SnackVideo",
  spotify: "Spotify",
  gdrive: "Google Drive",
};

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

router.get("/status", async (req, res) => {
  const results: Array<{
    platform: string;
    name: string;
    status: string;
    latency: number;
    message: string;
  }> = [];

  await Promise.allSettled(
    Object.entries(TEST_URLS).map(async ([platform, testUrl]) => {
      const endpoint = ENDPOINTS[platform];
      const name = PLATFORM_NAMES[platform] || platform;
      const start = Date.now();
      try {
        const data = (await fetchAPI(endpoint, testUrl)) as any;
        const latency = Date.now() - start;
        const ok =
          data &&
          (data.status === true ||
            (data.result && Object.keys(data.result).length > 0));
        results.push({
          platform,
          name,
          status: ok ? "online" : "error",
          latency,
          message: ok ? "Operational" : "Unexpected response",
        });
      } catch {
        results.push({
          platform,
          name,
          status: "offline",
          latency: Date.now() - start,
          message: "Unreachable",
        });
      }
    }),
  );

  results.sort((a, b) => a.name.localeCompare(b.name));

  const online = results.filter((r) => r.status === "online").length;
  const offline = results.filter((r) => r.status !== "online").length;
  const allOnline = offline === 0;

  return res.json({
    summary: {
      total: results.length,
      online,
      offline,
      allOnline,
      checkedAt: new Date().toISOString(),
    },
    platforms: results,
  });
});

export default router;
