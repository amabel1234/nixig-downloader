# Nixx — Free All-in-One Media Downloader

## Overview
Nixx adalah aplikasi web downloader media all-in-one gratis dengan UI iOS-style. Mendukung 12 platform dengan antarmuka glassmorphism, animasi iOS, action sheets, dan notifikasi toast.

## Platform yang Didukung
- TikTok (video + audio + photo slides)
- Instagram (foto & video / reel)
- YouTube (video MP4 dengan pilihan kualitas + audio MP3)
- Facebook (video HD & SD)
- Pinterest (gambar & video)
- Threads (gambar & video)
- CapCut (video template)
- CocoFun (video tanpa watermark)
- SnackVideo (video)
- Spotify (audio track)
- Google Drive (semua file)

## Struktur File
```
├── index.js          — Express server dengan route /api/download dan /api/status
├── api/config.js     — API key, base URL, endpoints, dan test URLs
├── package.json      — Dependensi Node.js
├── vercel.json       — Konfigurasi deploy Vercel
└── public/
    ├── index.html    — Halaman utama downloader (UI iOS-style)
    ├── status.html   — Halaman monitoring status API
    └── style.css     — Semua style (iOS design system)
```

## Setup & Jalankan
1. Install dependensi: `npm install`
2. Isi API key di `api/config.js` → ganti `APIKEYMU` dengan API key VtechAPI kamu
3. Jalankan server: `npm start` (port 5000)

## Deploy ke Vercel
1. Push ke GitHub
2. Import repo di vercel.com
3. Set environment variable `API_KEY` jika dibutuhkan
4. Deploy otomatis

## Info
Script base oleh © NIXX
- Kontak: t.me/nixcooll
