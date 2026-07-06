import { Router } from "express";

const router = Router();

interface Review {
  id: number;
  name: string;
  rating: number;
  comment: string;
  platform: string;
  createdAt: string;
}

const reviews: Review[] = [
  { id: 1, name: "Andi Pratama", rating: 5, comment: "Keren banget! Download TikTok tanpa watermark langsung jadi, nggak perlu app lain.", platform: "TikTok", createdAt: "2025-07-04T08:00:00Z" },
  { id: 2, name: "Siti Rahayu", rating: 5, comment: "Gampang banget makenya, tinggal paste link langsung download. Udah coba buat Instagram sama YouTube, both work perfectly!", platform: "Instagram", createdAt: "2025-07-04T10:30:00Z" },
  { id: 3, name: "Budi Santoso", rating: 4, comment: "Mantap! Support banyak platform. Satu-satunya saran tambahin progress bar waktu download.", platform: "YouTube", createdAt: "2025-07-05T09:15:00Z" },
  { id: 4, name: "Dewi Lestari", rating: 5, comment: "Literally yang terbaik. Udah cobain banyak downloader lain, ini yang paling cepet dan bersih.", platform: "Facebook", createdAt: "2025-07-05T14:00:00Z" },
  { id: 5, name: "Fajar Nugroho", rating: 5, comment: "Download Spotify juga bisa? Gila! Ini tool lengkap banget. Recommended 100%.", platform: "Spotify", createdAt: "2025-07-06T07:45:00Z" },
];

let nextId = 6;

router.get("/reviews", (_req, res) => {
  const sorted = [...reviews].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
  const avgRating = reviews.length ? +(totalRating / reviews.length).toFixed(1) : 0;
  const distribution = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
  }));
  return res.json({ success: true, reviews: sorted, avgRating, totalCount: reviews.length, distribution });
});

router.post("/reviews", (req, res) => {
  const { name, rating, comment, platform } = req.body as {
    name?: unknown;
    rating?: unknown;
    comment?: unknown;
    platform?: unknown;
  };

  if (typeof name !== "string" || !name.trim() || name.length > 50) {
    return res.status(400).json({ success: false, error: "Nama tidak valid" });
  }
  const ratingNum = Number(rating);
  if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return res.status(400).json({ success: false, error: "Rating harus antara 1-5" });
  }
  if (typeof comment !== "string" || comment.trim().length < 3 || comment.length > 500) {
    return res.status(400).json({ success: false, error: "Komentar minimal 3 karakter" });
  }

  const review: Review = {
    id: nextId++,
    name: name.trim(),
    rating: ratingNum,
    comment: comment.trim(),
    platform: typeof platform === "string" && platform.trim() ? platform.trim().slice(0, 30) : "VyDown",
    createdAt: new Date().toISOString(),
  };
  reviews.push(review);
  req.log.info({ id: review.id, name: review.name, rating: review.rating }, "New review submitted");
  return res.status(201).json({ success: true, review });
});

export default router;
