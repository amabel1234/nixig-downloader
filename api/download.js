
const API_KEY = process.env.VTECH_API_KEY || '';
const API_BASE = 'https://api.vtech.biz.id/api/download';
const ENDPOINTS = {
  tiktok:'/tiktok', tiktokslide:'/tiktokslide', instagram:'/igdowloader',
  youtube:'/ytdlv2', facebook:'/fbdown', pinterest:'/pinterest',
  threads:'/threads', capcut:'/capcut', cocofun:'/cocofun',
  snackvideo:'/snackvideo', spotify:'/spotify', gdrive:'/gdrive',
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
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success:false, error:'Method not allowed' });
  const url = (req.body?.url || '').trim();
  if (!url) return res.status(400).json({ success:false, error:'URL diperlukan' });
  const platform = detect(url);
  if (!platform) return res.status(400).json({ success:false, error:'Platform tidak dikenali' });
  const endpoint = ENDPOINTS[platform];
  if (!endpoint) return res.status(400).json({ success:false, error:'Platform belum didukung' });
  try {
    let data = await fetchVtech(endpoint, url);
    if (platform === 'tiktok') {
      const r = data?.result;
      const noVid = !r?.video || r.video.length === 0;
      const hasImg = r?.images && r.images.length > 0;
      if ((url.includes('/photo/') || (noVid && hasImg)) && ENDPOINTS.tiktokslide) {
        try {
          const s = await fetchVtech(ENDPOINTS.tiktokslide, url);
          if (s?.result?.images?.length) data = { ...s, _slideMode: true };
        } catch {}
      }
    }
    return res.json({ success:true, platform, data });
  } catch(e) {
    return res.status(502).json({ success:false, error: e.message || 'Gagal mengambil media' });
  }
};
