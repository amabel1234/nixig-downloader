const REPO      = 'amabel1234/nixig-downloader';
const BRANCH    = 'main';
const GH_TOKEN  = process.env.GH_TOKEN || '';
const ADMIN_KEY = process.env.ADMIN_KEY || '';
const GH = {
  Authorization: `token ${GH_TOKEN}`,
  Accept: 'application/vnd.github.v3+json',
  'Content-Type': 'application/json',
  'User-Agent': 'NixxDr-Admin',
};

async function readJson(path) {
  if (!GH_TOKEN) return [];
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}?ref=${BRANCH}`, { headers: GH });
    if (!r.ok) return [];
    const j = await r.json();
    return JSON.parse(Buffer.from(j.content.replace(/\n/g,''), 'base64').toString('utf-8'));
  } catch { return []; }
}

async function writeJson(path, data, message) {
  if (!GH_TOKEN) return false;
  try {
    const meta = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, { headers: GH });
    const metaJson = await meta.json();
    const content = Buffer.from(JSON.stringify(data, null, 2), 'utf-8').toString('base64');
    const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
      method: 'PUT', headers: GH,
      body: JSON.stringify({ message, content, sha: metaJson.sha, branch: BRANCH }),
    });
    return r.ok;
  } catch (e) { console.error('writeJson:', e.message); return false; }
}

function getParam(req, name) {
  try { return new URL('http://x' + req.url).searchParams.get(name); } catch { return req.query?.[name] ?? null; }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-Admin-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const key = req.headers['x-admin-key'] || '';
  if (!ADMIN_KEY || key !== ADMIN_KEY)
    return res.status(401).json({ success: false, error: 'Unauthorized' });

  const tab = getParam(req, 'tab') || 'reviews';

  // ── GET ──────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {

    if (tab === 'downloads') {
      const logs = await readJson('data/downloads.json');
      const sorted = [...logs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      const total   = logs.length;
      const success = logs.filter(l => l.success).length;
      const rate    = total ? Math.round(success / total * 100) : 0;
      const platforms = {};
      for (const l of logs) platforms[l.platform] = (platforms[l.platform] || 0) + 1;
      const topPlatforms = Object.entries(platforms).sort((a,b) => b[1]-a[1]).slice(0,6).map(([p,c]) => ({ platform: p, count: c }));
      return res.json({ success: true, logs: sorted, totalCount: total, successCount: success, successRate: rate, topPlatforms });
    }

    // default: reviews
    const reviews = await readJson('data/reviews.json');
    const sorted  = [...reviews].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const total   = reviews.reduce((s, r) => s + r.rating, 0);
    const avg     = reviews.length ? +(total / reviews.length).toFixed(1) : 0;
    const dist    = [5,4,3,2,1].map(star => ({ star, count: reviews.filter(r => r.rating === star).length }));
    return res.json({ success: true, reviews: sorted, totalCount: reviews.length, avgRating: avg, distribution: dist });
  }

  // ── DELETE ───────────────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const id = Number(getParam(req, 'id'));
    if (!id) return res.status(400).json({ success: false, error: 'ID diperlukan' });

    if (tab === 'downloads') {
      const logs = await readJson('data/downloads.json');
      const next = logs.filter(l => l.id !== id);
      if (next.length === logs.length) return res.status(404).json({ success: false, error: 'Log tidak ditemukan' });
      const saved = await writeJson('data/downloads.json', next, 'admin: delete download log');
      return res.json({ success: saved, message: saved ? 'Log dihapus' : 'Gagal menyimpan' });
    }

    const reviews = await readJson('data/reviews.json');
    const next    = reviews.filter(r => r.id !== id);
    if (next.length === reviews.length) return res.status(404).json({ success: false, error: 'Review tidak ditemukan' });
    const saved = await writeJson('data/reviews.json', next, 'admin: delete review');
    return res.json({ success: saved, message: saved ? 'Review dihapus' : 'Gagal menyimpan' });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
};
