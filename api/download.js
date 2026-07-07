const API_KEY  = process.env.VTECH_API_KEY || 'sk-b35b3f6c515f';
const API_BASE = 'https://api.vtech.biz.id/api/download';
const ENDPOINTS = {
  tiktok:'/tiktok', tiktokslide:'/tiktokslide', instagram:'/igdowloader',
  youtube:'/ytdlv2', facebook:'/fbdown', pinterest:'/pinterest',
  threads:'/threads', capcut:'/capcut', cocofun:'/cocofun',
  snackvideo:'/snackvideo', spotify:'/spotify', gdrive:'/gdrive',
};
const GH_TOKEN = process.env.GH_TOKEN || '';
const GH_REPO  = 'amabel1234/nixig-downloader';
const GH_BRANCH = 'main';
const DLOG_PATH = 'data/downloads.json';
const MAX_LOGS  = 500;
const GH_HEADERS = {
  Authorization: `token ${GH_TOKEN}`,
  Accept: 'application/vnd.github.v3+json',
  'Content-Type': 'application/json',
  'User-Agent': 'NixxDr-DL',
};

function detect(url) {
  try {
    const h = new URL(url).hostname.replace('www.','');
    if (h.includes('tiktok.com'))       return 'tiktok';
    if (h.includes('instagram.com'))    return 'instagram';
    if (h.includes('youtube.com') || h.includes('youtu.be')) return 'youtube';
    if (h.includes('facebook.com') || h.includes('fb.watch')) return 'facebook';
    if (h.includes('pinterest.com') || h.includes('pin.it')) return 'pinterest';
    if (h.includes('threads.net'))      return 'threads';
    if (h.includes('capcut.com'))       return 'capcut';
    if (h.includes('icocofun.com'))     return 'cocofun';
    if (h.includes('snackvideo.com'))   return 'snackvideo';
    if (h.includes('spotify.com'))      return 'spotify';
    if (h.includes('drive.google.com')) return 'gdrive';
  } catch {}
  return null;
}

async function fetchVtech(endpoint, url) {
  const apiUrl = `${API_BASE}${endpoint}?apikey=${API_KEY}&url=${encodeURIComponent(url)}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 25000);
  try {
    const r = await fetch(apiUrl, { signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) throw new Error(`Upstream ${r.status}`);
    return r.json();
  } catch(e) { clearTimeout(t); throw e; }
}

async function logDownload(platform, urlHost, success, errorMsg) {
  if (!GH_TOKEN) return;
  try {
    let logs = [];
    let sha = null;
    const r = await fetch(`https://api.github.com/repos/${GH_REPO}/contents/${DLOG_PATH}?ref=${GH_BRANCH}`, { headers: GH_HEADERS });
    if (r.ok) {
      const j = await r.json();
      sha = j.sha;
      try { logs = JSON.parse(Buffer.from(j.content.replace(/\n/g,''), 'base64').toString('utf-8')); } catch { logs = []; }
    }
    const nextId = logs.length ? Math.max(...logs.map(l => l.id || 0)) + 1 : 1;
    const entry = { id: nextId, timestamp: new Date().toISOString(), platform, urlHost, success };
    if (!success && errorMsg) entry.error = String(errorMsg).slice(0, 80);
    logs.push(entry);
    if (logs.length > MAX_LOGS) logs = logs.slice(logs.length - MAX_LOGS);
    const content = Buffer.from(JSON.stringify(logs, null, 2), 'utf-8').toString('base64');
    const body = { message: `log: ${platform} download (${success ? 'ok' : 'fail'})`, content, branch: GH_BRANCH };
    if (sha) body.sha = sha;
    await fetch(`https://api.github.com/repos/${GH_REPO}/contents/${DLOG_PATH}`, {
      method: 'PUT', headers: GH_HEADERS, body: JSON.stringify(body)
    });
  } catch {}
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success:false, error:'Method not allowed' });
  const url = (req.body?.url || '').trim();
  if (!url) return res.status(400).json({ success:false, error:'URL diperlukan' });

  let urlHost = '';
  try { urlHost = new URL(url).hostname.replace('www.',''); } catch {}

  const platform = detect(url);
  if (!platform)
    return res.status(400).json({ success:false, error:'Platform tidak didukung. Coba TikTok, Instagram, YouTube, dll.' });

  const endpoint = ENDPOINTS[platform];
  if (!endpoint)
    return res.status(400).json({ success:false, error:'Platform tidak tersedia' });

  try {
    const data = await fetchVtech(endpoint, url);
    res.json({ success: true, platform, data });
    logDownload(platform, urlHost, true, null).catch(() => {});
  } catch (e) {
    const errMsg = e.message || 'Unknown error';
    res.status(502).json({ success: false, error: 'Gagal mengambil data dari server. Coba lagi.', detail: errMsg });
    logDownload(platform, urlHost, false, errMsg).catch(() => {});
  }
};
