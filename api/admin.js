const REPO     = 'amabel1234/nixig-downloader';
const BRANCH   = 'main';
const PATH     = 'data/reviews.json';
const GH_TOKEN = process.env.GH_TOKEN || '';
const ADMIN_KEY = process.env.ADMIN_KEY || '';

const GH = {
  Authorization: `token ${GH_TOKEN}`,
  Accept: 'application/vnd.github.v3+json',
  'Content-Type': 'application/json',
  'User-Agent': 'NixxDr-Admin',
};

async function readReviews() {
  if (!GH_TOKEN) return [];
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${PATH}?ref=${BRANCH}`, { headers: GH });
    if (!r.ok) return [];
    const json = await r.json();
    const content = Buffer.from(json.content.replace(/\n/g, ''), 'base64').toString('utf-8');
    return JSON.parse(content);
  } catch { return []; }
}

async function writeReviews(reviews) {
  if (!GH_TOKEN) return false;
  try {
    const meta = await fetch(`https://api.github.com/repos/${REPO}/contents/${PATH}`, { headers: GH });
    const metaJson = await meta.json();
    const sha = metaJson.sha;
    const content = Buffer.from(JSON.stringify(reviews, null, 2), 'utf-8').toString('base64');
    const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${PATH}`, {
      method: 'PUT',
      headers: GH,
      body: JSON.stringify({ message: 'admin: delete review', content, sha, branch: BRANCH }),
    });
    return r.ok;
  } catch (e) { console.error('writeReviews:', e.message); return false; }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-Admin-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const key = req.headers['x-admin-key'] || '';
  if (!ADMIN_KEY || key !== ADMIN_KEY)
    return res.status(401).json({ success: false, error: 'Unauthorized' });

  if (req.method === 'GET') {
    const reviews = await readReviews();
    const sorted  = [...reviews].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const total   = reviews.reduce((s, r) => s + r.rating, 0);
    const avg     = reviews.length ? +(total / reviews.length).toFixed(1) : 0;
    const dist    = [5,4,3,2,1].map(star => ({ star, count: reviews.filter(r => r.rating === star).length }));
    return res.json({ success: true, reviews: sorted, totalCount: reviews.length, avgRating: avg, distribution: dist });
  }

  if (req.method === 'DELETE') {
    const id = Number(req.query?.id ?? new URL('http://x' + req.url).searchParams.get('id'));
    if (!id) return res.status(400).json({ success: false, error: 'ID diperlukan' });
    const reviews = await readReviews();
    const next    = reviews.filter(r => r.id !== id);
    if (next.length === reviews.length)
      return res.status(404).json({ success: false, error: 'Review tidak ditemukan' });
    const saved = await writeReviews(next);
    return res.json({ success: saved, message: saved ? 'Review dihapus' : 'Gagal menyimpan' });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
};
