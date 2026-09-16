# AINFO V14.2 — Article Detail, SEO & Audio Upgrade

Upgrade ini mempertahankan arsitektur V14 yang sudah ada dan menambahkan lapisan `worker/src/v14_2.js` di atas Worker lama agar fitur lama (auth, Shopping, Jobs/Jooble, Gift/Midtrans, D1, R2, PWA, Living Assistance) tetap berjalan.

## Fitur V14.2

- Detail berita dengan H1 untuk judul dan H2/H3 untuk isi.
- Daftar Isi otomatis dari H2/H3.
- Rich text artikel disimpan ke D1 (`content_html`) sehingga bold, list, quote, link dan heading tidak hilang.
- Audio berita: URL MP3 opsional + fallback browser text-to-speech pada frontend.
- Action bar artikel: reaction, komentar, Gift, Share, Bookmark di atas dan akhir artikel.
- Reaction popup 7 emoji di frontend.
- Tags, keywords, SEO title, meta description, canonical URL.
- SSR SEO `/read/<slug>/` dengan NewsArticle + BreadcrumbList JSON-LD, Open Graph dan Twitter Card.
- Dynamic `/sitemap.xml` dan `/news-sitemap.xml` dari artikel published.
- `/api/articles` untuk sinkron artikel published ke frontend.
- `/api/admin/articles` untuk sinkronisasi artikel Admin.
- IndexNow endpoint `/api/admin/indexnow/submit` dan key verification endpoint.

## Setelah pull/deploy

1. Terapkan migrasi D1:

```bash
npm install
npx wrangler d1 migrations apply ainfo-db --remote
```

2. Pastikan secret berikut tersedia di Cloudflare Worker:

```bash
npx wrangler secret put JOOBLE_API_KEY
npx wrangler secret put MIDTRANS_SERVER_KEY
npx wrangler secret put INDEXNOW_KEY
```

Tambahkan secret lain yang sudah dipakai V14 (Google Login, Turnstile, dll.) sesuai konfigurasi sebelumnya.

3. `MIDTRANS_ENV` saat ini tetap `sandbox` agar tidak mengubah konfigurasi pembayaran yang sudah ada. Ubah ke `production` hanya setelah Production Server Key/Client Key Midtrans telah aktif dan diuji.

## Backup

Branch `backup-v14.1-before-v14.2` dibuat dari `main` sebelum upgrade, sehingga rollback dapat dilakukan bila diperlukan.
