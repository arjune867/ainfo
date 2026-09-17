# AINFO V14.17.1 — Multi Source Video Engine

## Fitur

- YouTube channel sync melalui YouTube Data API v3.
- Kandidat YouTube Shorts dikenali dari durasi <= 180 detik; opsi `Hanya Shorts` tersedia per sumber.
- YouTube WebSub/PubSubHubbub callback di `/api/video/websub/youtube` untuk update channel near-real-time.
- TikTok Display API v2 untuk creator yang mengotorisasi AINFO (`user.info.basic`, `video.list`).
- TikTok OAuth callback: `https://www.ainfo.web.id/api/video/tiktok/callback`.
- TikTok URL/oEmbed untuk menambahkan video publik tertentu tanpa scraping.
- Dailymotion API v2 profile/playlist sync.
- AINFO Original/R2 tetap dipertahankan sebagai sumber internal.
- Deduplikasi database dengan UNIQUE `(provider, external_id)`.
- Cron Cloudflare setiap 5 menit menyinkron sumber aktif.
- Feed publik `/api/videos/feed` polling ringan 60 detik di halaman Video.
- Status `review`, `published`, `hidden` dan opsi Auto Publish per sumber.
- UI Video lama tetap digunakan untuk reaction, komentar/reply, sticker, GIF, share, bookmark dan profile.
- Player eksternal memakai embed resmi; file YouTube/TikTok/Dailymotion tidak di-download atau di-reupload oleh AINFO.

## Cloudflare Secrets

Set sekali pada Worker AINFO. Jangan commit nilai rahasia ke GitHub.

```bash
npx wrangler secret put YOUTUBE_API_KEY
npx wrangler secret put DAILYMOTION_ACCESS_TOKEN
npx wrangler secret put TIKTOK_CLIENT_KEY
npx wrangler secret put TIKTOK_CLIENT_SECRET
npx wrangler secret put VIDEO_TOKEN_ENCRYPTION_KEY
```

`VIDEO_TOKEN_ENCRYPTION_KEY` digunakan untuk mengenkripsi access token dan refresh token TikTok sebelum disimpan di D1. Gunakan string acak panjang minimal 32 karakter dan jangan diubah setelah koneksi TikTok aktif kecuali token akan dihubungkan ulang.

## TikTok Developer Portal

1. Aktifkan Login Kit + Display API pada app AINFO.
2. Minta/aktifkan scope `user.info.basic` dan `video.list`.
3. Daftarkan redirect URI persis:

```text
https://www.ainfo.web.id/api/video/tiktok/callback
```

4. Setelah secret dipasang, buka Admin AINFO → Video → Sumber Video API → Hubungkan TikTok.
5. Setelah OAuth berhasil, tambahkan sumber TikTok dengan tipe `Creator Terhubung`, external ID otomatis `connected`.

## YouTube

Tambahkan sumber dengan Provider `YouTube / Shorts`, tipe `Channel ID`, lalu masukkan Channel ID yang diawali `UC...`. Worker membaca uploads playlist channel dan metadata video. Opsi `Hanya Shorts` menyaring kandidat berdurasi maksimal 180 detik.

WebSub akan diminta saat sumber YouTube disimpan. Cron 5 menit tetap menjadi fallback jika notifikasi push terlambat atau subscription perlu diperbarui.

## Dailymotion

Gunakan API v2 access token dengan scope yang diperlukan (`video.read`, dan `playlist.read` jika memakai playlist). Tambahkan `Profile ID` atau `Playlist ID` di Admin.

## Moderasi

- `Auto Publish OFF` (disarankan untuk sumber baru): video masuk status Review.
- `Auto Publish ON`: hasil sinkron langsung masuk feed publik.
- Admin dapat Publish, Hide atau kembalikan ke Review dari panel Sumber Video API.

## Deployment

Migration baru:

```text
migrations/0012_video_sources_v14_17.sql
```

Workflow GitHub AINFO menjalankan D1 migration sebelum deploy Worker. Worker aktif:

```text
worker/src/v14_17_1.js
```

## Catatan platform

YouTube dan Dailymotion ditampilkan dengan player/embed resmi. TikTok Display API hanya membaca video publik creator yang memberi otorisasi ke aplikasi AINFO. Untuk video TikTok dari creator lain, gunakan URL TikTok publik/oEmbed jika penggunaan/embedding diizinkan. Jangan membangun scraper FYP atau mengunduh video platform untuk diupload ulang tanpa hak distribusi.
