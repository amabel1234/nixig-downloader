import { Router } from "express";
import { DownloadMediaBody } from "@workspace/api-zod";

const router = Router();

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  Connection: "keep-alive",
};

function extractShortcode(url: string): string | null {
  const patterns = [
    /instagram\.com\/p\/([A-Za-z0-9_-]+)/,
    /instagram\.com\/reel\/([A-Za-z0-9_-]+)/,
    /instagram\.com\/reels\/([A-Za-z0-9_-]+)/,
    /instagram\.com\/tv\/([A-Za-z0-9_-]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function extractMetaContent(html: string, property: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

function extractJsonLd(html: string): Record<string, unknown> | null {
  const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

function extractAllVideos(html: string): string[] {
  const urls: string[] = [];
  const patterns = [
    /"video_url":"([^"]+)"/g,
    /"contentUrl":"([^"]+)"/g,
    /property="og:video"[^>]+content="([^"]+)"/g,
    /content="([^"]+)"[^>]+property="og:video"/g,
  ];
  for (const pattern of patterns) {
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(html)) !== null) {
      const url = m[1].replace(/\\u0026/g, "&").replace(/\\\//g, "/");
      if (url.startsWith("http") && !urls.includes(url)) {
        urls.push(url);
      }
    }
  }
  return urls;
}

router.post("/download", async (req, res) => {
  const parsed = DownloadMediaBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "URL Instagram tidak valid" });
    return;
  }

  const { url } = parsed.data;

  if (!url.includes("instagram.com")) {
    res.status(400).json({ error: "Harap masukkan URL Instagram yang valid" });
    return;
  }

  const shortcode = extractShortcode(url);
  if (!shortcode) {
    res.status(400).json({
      error: "Format URL tidak dikenali. Gunakan link post, reel, atau video Instagram.",
    });
    return;
  }

  try {
    const cleanUrl = `https://www.instagram.com/p/${shortcode}/`;
    const response = await fetch(cleanUrl, {
      headers: BROWSER_HEADERS,
      redirect: "follow",
    });

    if (!response.ok) {
      req.log.warn({ status: response.status, shortcode }, "Instagram fetch failed");
      res.status(400).json({
        error: "Gagal mengambil data dari Instagram. Pastikan postingan bersifat publik.",
      });
      return;
    }

    const html = await response.text();

    // Extract media info from meta tags
    const ogVideo = extractMetaContent(html, "og:video");
    const ogVideoSecure = extractMetaContent(html, "og:video:secure_url");
    const ogImage = extractMetaContent(html, "og:image");
    const ogTitle = extractMetaContent(html, "og:title");
    const ogDescription = extractMetaContent(html, "og:description");

    // Also try JSON-LD
    const jsonLd = extractJsonLd(html);

    // Extract all video URLs from page source
    const videoUrls = extractAllVideos(html);

    const media: Array<{ url: string; type: "video" | "image"; thumbnail: string | null }> = [];

    // Add videos first
    const primaryVideo = ogVideoSecure || ogVideo || videoUrls[0];
    if (primaryVideo) {
      media.push({
        url: primaryVideo,
        type: "video",
        thumbnail: ogImage || null,
      });
    }

    // Add additional videos if any
    for (const vUrl of videoUrls) {
      if (vUrl !== primaryVideo && media.length < 10) {
        media.push({ url: vUrl, type: "video", thumbnail: null });
      }
    }

    // Add image if no video found, or if it looks like an image post
    if (media.length === 0 && ogImage) {
      media.push({ url: ogImage, type: "image", thumbnail: null });
    }

    if (media.length === 0) {
      res.status(400).json({
        error:
          "Tidak dapat mengekstrak media. Pastikan postingan publik dan bukan Story. Instagram mungkin memblokir akses sementara — coba lagi nanti.",
      });
      return;
    }

    // Extract username and caption
    let username: string | null = null;
    let caption: string | null = null;

    if (ogTitle) {
      const userMatch = ogTitle.match(/^([^:]+):/);
      if (userMatch) username = userMatch[1].trim().replace(/^@/, "");
    }

    if (jsonLd && typeof jsonLd === "object") {
      const ld = jsonLd as Record<string, unknown>;
      if (typeof ld.author === "object" && ld.author !== null) {
        const author = ld.author as Record<string, unknown>;
        if (typeof author.name === "string") username = author.name;
      }
      if (typeof ld.caption === "string") caption = ld.caption;
    }

    if (!caption && ogDescription) {
      caption = ogDescription.replace(/ on Instagram.*$/, "").trim() || null;
    }

    req.log.info({ shortcode, mediaCount: media.length }, "Media extracted");

    res.json({
      success: true,
      media,
      caption,
      username,
    });
  } catch (err) {
    req.log.error({ err, shortcode }, "Error fetching Instagram media");
    res.status(500).json({
      error: "Terjadi kesalahan server. Coba lagi beberapa saat lagi.",
    });
  }
});

export default router;
