# AINFO V13 Pre-Production Checklist

## CMS & Editorial
- [ ] Uji tambah/edit/hapus berita dan status editorial.
- [ ] Uji upload gambar dan Breaking News dari Admin.
- [ ] Verifikasi kategori header dan halaman kategori.
- [ ] Isi data legal/publisher/redaksi nyata.

## Shopping
- [ ] Uji CRUD produk, kategori, diskon, stock dan Flash Sale.
- [ ] Isi nomor WhatsApp merchant.
- [ ] Pasang credential DOKU server-side dan callback/webhook tervalidasi.
- [ ] Pindahkan upload media ke R2 sebelum production.

## Jobs
- [ ] Pasang JOOBLE_API_KEY sebagai secret server-side.
- [ ] Uji default keyword/lokasi/radius/cache.
- [ ] Verifikasi link sumber lowongan dan attribution.

## Auth & User
- [ ] Buat Google OAuth Web Client ID untuk localhost dan www.ainfo.web.id.
- [ ] Aktifkan CSRF, Turnstile/rate-limit login/register di production.
- [ ] Uji role reader/contributor/reporter/editor/admin dan suspend.

## Push
- [ ] Tambahkan VAPID/Web Push provider untuk push remote production.
- [ ] Buat subscription store dan unsubscribe flow.

## SEO & Google News
- [ ] Isi publisher, redaksi, author profile, alamat dan kontak sebenarnya.
- [ ] Verifikasi Search Console.
- [ ] Validasi NewsArticle schema, sitemap.xml, news-sitemap.xml dan RSS.
- [ ] Pastikan canonical URL dan tanggal publish/modified benar.

## Security & Cloudflare
- [ ] Gunakan Cloudflare Access atau auth server untuk /admin/.
- [ ] D1 untuk relational data; R2 untuk media.
- [ ] Secrets hanya melalui Cloudflare Secrets.
- [ ] CSP, HSTS, secure cookies, audit log, backup dan monitoring.
