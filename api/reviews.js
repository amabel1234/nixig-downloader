
const reviews = [
  { id:1, name:"Andi Pratama", rating:5, comment:"Keren banget! Download TikTok tanpa watermark langsung jadi, nggak perlu app lain.", platform:"TikTok", createdAt:"2025-07-04T08:00:00Z" },
  { id:2, name:"Siti Rahayu", rating:5, comment:"Gampang banget makenya, tinggal paste link langsung download. Udah coba buat Instagram sama YouTube, both work perfectly!", platform:"Instagram", createdAt:"2025-07-04T10:30:00Z" },
  { id:3, name:"Budi Santoso", rating:4, comment:"Mantap! Support banyak platform. Satu-satunya saran tambahin progress bar waktu download.", platform:"YouTube", createdAt:"2025-07-05T09:15:00Z" },
  { id:4, name:"Dewi Lestari", rating:5, comment:"Literally yang terbaik. Udah cobain banyak downloader lain, ini yang paling cepet dan bersih.", platform:"Facebook", createdAt:"2025-07-05T14:00:00Z" },
  { id:5, name:"Fajar Nugroho", rating:5, comment:"Download Spotify juga bisa? Gila! Ini tool lengkap banget. Recommended 100%.", platform:"Spotify", createdAt:"2025-07-06T07:45:00Z" },
];
let nextId = 6;
module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method === 'GET') {
    const sorted = [...reviews].sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt));
    const total = reviews.reduce((s,r) => s+r.rating, 0);
    const avg = reviews.length ? +(total/reviews.length).toFixed(1) : 0;
    const dist = [5,4,3,2,1].map(star => ({ star, count: reviews.filter(r=>r.rating===star).length }));
    return res.json({ success:true, reviews:sorted, avgRating:avg, totalCount:reviews.length, distribution:dist });
  }
  if (req.method === 'POST') {
    const { name, rating, comment, platform } = req.body || {};
    if (!name || typeof name !== 'string' || !name.trim()) return res.status(400).json({ success:false, error:'Nama tidak valid' });
    const r = Number(rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) return res.status(400).json({ success:false, error:'Rating harus 1-5' });
    if (!comment || comment.trim().length < 3) return res.status(400).json({ success:false, error:'Komentar terlalu pendek' });
    const rev = { id:nextId++, name:name.trim(), rating:r, comment:comment.trim(), platform:String(platform||'NixxDr').slice(0,30), createdAt:new Date().toISOString() };
    reviews.push(rev);
    return res.status(201).json({ success:true, review:rev });
  }
  return res.status(405).json({ success:false, error:'Method not allowed' });
};
