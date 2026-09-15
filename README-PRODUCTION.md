# AINFO V14 — Final Production Readiness

Target: **https://www.ainfo.web.id**  
Stack: **Cloudflare Workers + Static Assets + D1 + R2**

V14 mempertahankan UI/CMS V13, tetapi persistence dan security dipindah ke backend Cloudflare. `localStorage` hanya menjadi cache/fallback UI; state utama disinkronkan ke D1 melalui `/api/admin/state`.

## Yang sudah diimplementasikan

- D1 migrations untuk user, session, app state, artikel, revisi, komentar bertingkat, reaction, rating, bookmark, produk, order, Gift, jobs, push subscription, audit log, rate-limit dan monitoring.
- R2 upload media melalui `/api/admin/media`.
- Session login server-side dengan cookie HttpOnly/SameSite/Secure di HTTPS.
- PBKDF2 password hashing.
- Google Login backend verification.
- CSRF token otomatis untuk mutasi API.
- Role server-side: reader, contributor, reporter, editor, admin, superadmin.
- Rate limiting berbasis D1 untuk login, registrasi, komentar.
- Cloudflare Turnstile opsional pada login/registrasi.
- DOKU Checkout untuk Shopping dan Gift Author.
- DOKU webhook dengan verifikasi HMAC + idempotency request id.
- Order/Gift hanya berubah `paid` dari webhook terverifikasi.
- Jooble API hanya dipanggil server-side; key tidak pernah dikirim ke browser.
- Search API berita + produk + jobs.
- SSR sederhana untuk `/read/<slug>/` agar artikel dapat dicrawl tanpa bergantung pada hash routing.
- Dynamic `sitemap.xml`, `news-sitemap.xml`, `rss.xml`.
- Scheduled publishing setiap 5 menit.
- Backup konten harian ke R2 + D1 export/Time Travel tetap direkomendasikan.
- Audit log admin.
- Admin Command Center, daftar order DOKU dan audit log ditambahkan melalui production bridge.
- Security headers termasuk CSP, HSTS, X-Content-Type-Options dan noindex Admin.

## 1. Install

```bash
npm install
npx wrangler login
```

## 2. Buat database D1

```bash
npx wrangler d1 create ainfo-db
```

Salin `database_id` ke `wrangler.jsonc`:

```json
"database_id": "YOUR_DATABASE_ID"
```

Lalu migration:

```bash
npm run db:migrate:remote
```

## 3. Buat R2

```bash
npx wrangler r2 bucket create ainfo-media
```

## 4. Pasang secret

Jangan simpan credential di source code.

```bash
npx wrangler secret put ADMIN_EMAIL
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put JOOBLE_API_KEY
npx wrangler secret put DOKU_CLIENT_ID
npx wrangler secret put DOKU_SECRET_KEY
npx wrangler secret put TURNSTILE_SITE_KEY
npx wrangler secret put TURNSTILE_SECRET_KEY
```

Opsional untuk provider Web Push eksternal:

```bash
npx wrangler secret put PUSH_GATEWAY_URL
npx wrangler secret put PUSH_GATEWAY_TOKEN
```

`ADMIN_EMAIL` adalah email yang otomatis mendapat role `superadmin` saat akun tersebut login/registrasi.

## 5. Local production-style test

Buat `.dev.vars` dari `.dev.vars.example`, lalu:

```bash
npm run db:migrate:local
npm run dev
```

Wrangler biasanya membuka `http://localhost:8787`.

Uji minimal:

1. Registrasi/login.
2. Login dengan email `ADMIN_EMAIL`.
3. Buka `/admin/`.
4. Tambah kategori, artikel, produk, video dan lowongan.
5. Upload gambar; pastikan URL `/media/...` dapat dibuka.
6. Reload browser lain/incognito; konten harus tetap berasal dari D1, bukan localStorage saja.
7. Uji komentar/reaction/rating/bookmark.
8. Uji checkout DOKU Sandbox dan pastikan status belum `paid` sebelum webhook.
9. Kirim webhook Sandbox; pastikan status berubah idempotent.
10. Uji Jooble.
11. Uji Search.
12. Uji `/sitemap.xml`, `/news-sitemap.xml`, `/rss.xml`, `/read/<slug>/`.

## 6. DOKU

Mulai dari sandbox:

```jsonc
"DOKU_ENV": "sandbox"
```

Webhook production/sandbox diarahkan ke:

```text
https://www.ainfo.web.id/api/doku/webhook
```

Jangan mengganti ke `production` sebelum sandbox end-to-end berhasil.

## 7. Google Login

Pada Google Cloud OAuth Web Client:

Authorized JavaScript origins:

```text
https://www.ainfo.web.id
https://ainfo.web.id
```

Untuk local test, tambahkan origin localhost Wrangler yang digunakan.

## 8. Turnstile

Daftarkan hostname:

```text
ainfo.web.id
www.ainfo.web.id
```

Login/Register otomatis menampilkan widget saat `TURNSTILE_SITE_KEY` dan `TURNSTILE_SECRET_KEY` keduanya tersedia.

## 9. Deploy

```bash
npm run typecheck
npm run deploy
```

Kemudian pasang custom domain `www.ainfo.web.id` pada Worker melalui Cloudflare Dashboard.

## 10. Google Search / News

Submit di Search Console:

```text
https://www.ainfo.web.id/sitemap.xml
https://www.ainfo.web.id/news-sitemap.xml
```

Feed:

```text
https://www.ainfo.web.id/rss.xml
```

Isi data penerbit/redaksi/penulis dengan identitas nyata pada CMS sebelum launch.

## 11. Backup

Selain backup JSON harian ke R2, aktifkan/ketahui prosedur **D1 Time Travel** dan jalankan export berkala:

```bash
npm run db:backup
```

Simpan backup di storage terpisah.

## 12. Production gate

Jangan buka trafik publik sampai semua item pada `PRODUCTION-READINESS-V14.md` berstatus PASS.
