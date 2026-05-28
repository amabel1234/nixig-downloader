export const config = { runtime: 'nodejs' };

  const BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Connection': 'keep-alive',
  };

  function extractShortcode(url) {
    const patterns = [
      /instagram\.com\/p\/([A-Za-z0-9_-]+)/,
      /instagram\.com\/reel\/([A-Za-z0-9_-]+)/,
      /instagram\.com\/reels\/([A-Za-z0-9_-]+)/,
      /instagram\.com\/tv\/([A-Za-z0-9_-]+)/,
    ];
    for (const p of patterns) {
      const m = url.match(p);
      if (m) return m[1];
    }
    return null;
  }

  function extractMeta(html, property) {
    const ps = [
      new RegExp('<meta[^>]+property=["\']' + property + '["\'][^>]+content=["\']([^\"\' ]+)["\'\s]', 'i'),
      new RegExp('<meta[^>]+content=["\']([^"\']+)["\'\s][^>]+property=["\']' + property + '["\']', 'i'),
    ];
    for (const p of ps) {
      const m = html.match(p);
      if (m && m[1]) return m[1];
    }
    return null;
  }

  function extractVideos(html) {
    const urls = [];
    const patterns = [
      /"video_url":"([^"]+)"/g,
      /"contentUrl":"([^"]+)"/g,
    ];
    for (const p of patterns) {
      let m;
      while ((m = p.exec(html)) !== null) {
        const url = m[1].replace(/\\u0026/g, '&').replace(/\\\//g, '/');
        if (url.startsWith('http') && !urls.includes(url)) urls.push(url);
      }
    }
    return urls;
  }

  export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') { res.status(200).end(); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    const { url } = req.body || {};
    if (!url || !url.includes('instagram.com')) {
      res.status(400).json({ error: 'URL Instagram tidak valid' });
      return;
    }

    const shortcode = extractShortcode(url);
    if (!shortcode) {
      res.status(400).json({ error: 'Format URL tidak dikenali. Gunakan link post, reel, atau video Instagram.' });
      return;
    }

    try {
      const cleanUrl = `https://www.instagram.com/p/${shortcode}/`;
      const response = await fetch(cleanUrl, { headers: BROWSER_HEADERS, redirect: 'follow' });

      if (!response.ok) {
        res.status(400).json({ error: 'Gagal mengambil data dari Instagram. Pastikan postingan bersifat publik.' });
        return;
      }

      const html = await response.text();
      const ogVideo = extractMeta(html, 'og:video');
      const ogVideoSecure = extractMeta(html, 'og:video:secure_url');
      const ogImage = extractMeta(html, 'og:image');
      const ogTitle = extractMeta(html, 'og:title');
      const ogDesc = extractMeta(html, 'og:description');
      const videoUrls = extractVideos(html);

      const media = [];
      const primaryVideo = ogVideoSecure || ogVideo || videoUrls[0];
      if (primaryVideo) media.push({ url: primaryVideo, type: 'video', thumbnail: ogImage || null });
      for (const v of videoUrls) {
        if (v !== primaryVideo && media.length < 10) media.push({ url: v, type: 'video', thumbnail: null });
      }
      if (media.length === 0 && ogImage) media.push({ url: ogImage, type: 'image', thumbnail: null });

      if (media.length === 0) {
        res.status(400).json({ error: 'Tidak dapat mengekstrak media. Pastikan postingan publik dan bukan Story.' });
        return;
      }

      let username = null, caption = null;
      if (ogTitle) {
        const m = ogTitle.match(/^([^:]+):/);
        if (m) username = m[1].trim().replace(/^@/, '');
      }
      if (!caption && ogDesc) caption = ogDesc.replace(/ on Instagram.*$/, '').trim() || null;

      res.status(200).json({ success: true, media, caption, username });
    } catch (err) {
      res.status(500).json({ error: 'Terjadi kesalahan server. Coba lagi beberapa saat lagi.' });
    }
  }
  