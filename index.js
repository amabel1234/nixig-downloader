/*
        ••JANGAN HAPUS INI••
SCRIPT BY © NIXX
•• recode kasih credits
•• contacts: t.me/nixcooll
*/
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const path = require('path');
const config = require('./api/config');

const app = express();
const PORT = process.env.PORT || 5000;

const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="#6C63FF"/>
  <path d="M50 20 L50 65 M35 52 L50 67 L65 52" stroke="white" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <rect x="28" y="72" width="44" height="7" rx="3.5" fill="white"/>
</svg>`;

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public'), {
  etag: true,
  lastModified: true,
  setHeaders(res) { res.setHeader('X-Content-Type-Options', 'nosniff'); }
}));

app.get('/favicon.ico', (req, res) => { res.setHeader('Content-Type', 'image/svg+xml'); res.setHeader('Cache-Control', 'public, max-age=86400'); res.status(200).send(FAVICON_SVG); });
app.get('/favicon.svg', (req, res) => { res.setHeader('Content-Type', 'image/svg+xml'); res.setHeader('Cache-Control', 'public, max-age=86400'); res.status(200).send(FAVICON_SVG); });
app.get('/apple-touch-icon.png', (req, res) => res.redirect('/favicon.svg'));
app.get('/apple-touch-icon-precomposed.png', (req, res) => res.redirect('/favicon.svg'));
app.get('/robots.txt', (req, res) => { res.setHeader('Content-Type', 'text/plain'); res.send('User-agent: *\nDisallow: /api/\n'); });
app.get('/manifest.json', (req, res) => {
  res.json({
    name: 'Nixx', short_name: 'Nixx',
    description: 'Free All-in-One Media Downloader — No Watermark, HD Quality',
    start_url: '/', display: 'standalone',
    background_color: '#0A0A0F', theme_color: '#6C63FF',
    icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' }]
  });
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/status', (req, res) => res.sendFile(path.join(__dirname, 'public', 'status.html')));

function detectPlatform(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace('www.', '');
    if (host.includes('tiktok.com')) return 'tiktok';
    if (host.includes('instagram.com')) return 'instagram';
    if (host.includes('youtube.com') || host.includes('youtu.be')) return 'youtube';
    if (host.includes('facebook.com') || host.includes('fb.watch')) return 'facebook';
    if (host.includes('pinterest.com') || host.includes('pin.it')) return 'pinterest';
    if (host.includes('threads.net')) return 'threads';
    if (host.includes('capcut.com')) return 'capcut';
    if (host.includes('icocofun.com')) return 'cocofun';
    if (host.includes('snackvideo.com')) return 'snackvideo';
    if (host.includes('spotify.com')) return 'spotify';
    if (host.includes('drive.google.com')) return 'gdrive';
    return null;
  } catch { return null; }
}

async function fetchAPI(endpoint, url) {
  const apiUrl = `${config.API_BASE}${endpoint}?apikey=${config.API_KEY}&url=${encodeURIComponent(url)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch(apiUrl, { signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok) throw new Error(`API error ${response.status}`);
    const data = await response.json();
    return data;
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') throw new Error('Request timed out (25s). Try again.');
    throw err;
  }
}

app.post('/api/download', async (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url || typeof url !== 'string' || !url.trim()) {
      return res.status(400).json({ success: false, error: 'URL wajib diisi' });
    }

    const trimmed = url.trim();
    const platform = detectPlatform(trimmed);
    if (!platform) {
      return res.status(400).json({ success: false, error: 'Platform tidak didukung. Cek kembali link yang dimasukkan.' });
    }

    const endpoint = config.ENDPOINTS[platform];
    if (!endpoint) {
      return res.status(400).json({ success: false, error: 'Endpoint platform belum dikonfigurasi.' });
    }

    let data = await fetchAPI(endpoint, trimmed);

    // Validasi respons API kosong
    if (!data || (!data.result && !data.status)) {
      return res.status(502).json({ success: false, error: 'API tidak mengembalikan data. Coba lagi.' });
    }

    // TikTok: deteksi slide/photo mode
    if (platform === 'tiktok') {
      const isPhotoUrl = trimmed.includes('/photo/');
      const r = data.result;
      const hasNoVideo = !r?.video || r.video.length === 0;
      const hasImages = r?.images && r.images.length > 0;
      if (isPhotoUrl || (hasNoVideo && hasImages)) {
        try {
          const slideData = await fetchAPI(config.ENDPOINTS.tiktokslide, trimmed);
          if (slideData?.result?.images?.length) {
            data = { ...slideData, _slideMode: true };
          }
        } catch { /* pakai data asli */ }
      }
    }

    // Instagram: normalisasi array
    if (platform === 'instagram') {
      const r = data.result;
      if (r && !Array.isArray(r) && r.url) {
        data.result = [r];
      } else if (Array.isArray(r)) {
        data.result = r.filter(item => item && item.url);
      }
    }

    // Facebook: pastikan ada URL
    if (platform === 'facebook') {
      const r = data.result;
      const urls = r?.url?.urls || [];
      if (!urls.length && !r?.hd && !r?.sd) {
        return res.status(502).json({ success: false, error: 'Video Facebook tidak ditemukan. Pastikan video bersifat publik.' });
      }
    }

    return res.json({ success: true, platform, data });

  } catch (err) {
    const message = err.message || 'Gagal mengambil media';
    return res.status(502).json({ success: false, error: message });
  }
});

const PLATFORM_NAMES = {
  tiktok: 'TikTok', tiktokslide: 'TikTok Slide', instagram: 'Instagram',
  youtube: 'YouTube', facebook: 'Facebook', pinterest: 'Pinterest',
  threads: 'Threads', capcut: 'CapCut', cocofun: 'CocoFun',
  snackvideo: 'SnackVideo', spotify: 'Spotify', gdrive: 'Google Drive'
};

app.get('/api/status', async (req, res) => {
  const results = [];
  await Promise.allSettled(
    Object.entries(config.TEST_URLS).map(async ([platform, testUrl]) => {
      const endpoint = config.ENDPOINTS[platform];
      const name = PLATFORM_NAMES[platform] || platform;
      const start = Date.now();
      try {
        const data = await fetchAPI(endpoint, testUrl);
        const latency = Date.now() - start;
        const ok = data && (data.status === true || (data.result && Object.keys(data.result).length > 0));
        results.push({ platform, name, status: ok ? 'online' : 'error', latency, message: ok ? 'Operational' : 'Unexpected response' });
      } catch (err) {
        results.push({ platform, name, status: 'offline', latency: Date.now() - start, message: err.message || 'Unreachable' });
      }
    })
  );
  results.sort((a, b) => a.name.localeCompare(b.name));
  res.json({ success: true, checked: results.length, timestamp: Date.now(), results });
});

app.use((req, res) => {
  if (req.accepts('html')) return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  res.status(404).json({ success: false, error: 'Not found' });
});

app.use((err, req, res, _next) => {
  res.status(500).json({ success: false, error: 'Internal server error' });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Nixx server running on port ${PORT}`);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT',  () => server.close(() => process.exit(0)));

module.exports = app;
