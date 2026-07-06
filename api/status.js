
const API_KEY = process.env.VTECH_API_KEY || 'sk-b35b3f6c515f';
const API_BASE = 'https://api.vtech.biz.id/api/download';
const ENDPOINTS = {
  tiktok:'/tiktok', instagram:'/igdowloader', youtube:'/ytdlv2',
  facebook:'/fbdown', pinterest:'/pinterest', spotify:'/spotify',
};
const TEST_URLS = {
  tiktok:'https://vt.tiktok.com/ZSeJ7P56G',
  instagram:'https://www.instagram.com/reel/DREcZAakbis/',
  youtube:'https://www.youtube.com/watch?v=HyhLsy6b0XI',
  facebook:'https://www.facebook.com/watch/?v=1393572814172251',
  pinterest:'https://pin.it/4CVodSq',
  spotify:'https://open.spotify.com/track/3zakx7RAwdkUQlOoQ7SJRt',
};
const NAMES = { tiktok:'TikTok', instagram:'Instagram', youtube:'YouTube', facebook:'Facebook', pinterest:'Pinterest', spotify:'Spotify' };
async function check(platform) {
  const start = Date.now();
  try {
    const url = `${API_BASE}${ENDPOINTS[platform]}?apikey=${API_KEY}&url=${encodeURIComponent(TEST_URLS[platform])}`;
    const ctrl = new AbortController();
    const t = setTimeout(()=>ctrl.abort(), 8000);
    const r = await fetch(url, {signal:ctrl.signal});
    clearTimeout(t);
    const latency = Date.now()-start;
    if (!r.ok) return {platform, name:NAMES[platform], status:'error', latency, message:'Upstream error'};
    const d = await r.json();
    const ok = d && (d.status===true || (d.result && Object.keys(d.result).length > 0));
    return {platform, name:NAMES[platform], status:ok?'online':'error', latency, message:ok?'Operational':'Bad response'};
  } catch {
    return {platform, name:NAMES[platform], status:'offline', latency:Date.now()-start, message:'Unreachable'};
  }
}
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin','*');
  const results = await Promise.all(Object.keys(ENDPOINTS).map(check));
  results.sort((a,b) => a.name.localeCompare(b.name));
  const online = results.filter(r=>r.status==='online').length;
  return res.json({ summary:{total:results.length, online, offline:results.length-online, checkedAt:new Date().toISOString()}, platforms:results });
};
