# AINFO V10 — SEO & Google News Pre-Production Checklist

## Sudah diterapkan
- Logo/favicons/PWA icons stabil dan crawlable.
- Meta description, robots directives, Open Graph, Twitter Card, canonical.
- `NewsMediaOrganization` + `WebSite` + `NewsArticle` JSON-LD.
- `datePublished`, `dateModified`, author name + author URL, publisher logo.
- Halaman author, redaksi, kontak, tentang, pedoman media siber, koreksi/hak jawab, privasi, syarat, disclaimer.
- `sitemap.xml`, `news-sitemap.xml`, `rss.xml`, `robots.txt`.
- Halaman artikel SEO dengan URL `/read/<slug>/`.
- Admin terpisah `/admin/`, `noindex,nofollow`, robots disallow, dan opsi Basic Auth lokal.
- `max-image-preview:large` untuk peluang preview gambar besar.
- Konten iklan/sponsor disiapkan terpisah dari editorial.

## Wajib sebelum production
- Isi nama badan penerbit yang benar.
- Isi alamat redaksi, nomor telepon, dan email yang benar/aktif.
- Lengkapi bio/foto/keahlian penulis nyata.
- Gunakan gambar berita sendiri/berlisensi dan sebaiknya host di domain/R2 sendiri.
- Sambungkan Google Search Console, verifikasi domain, submit sitemap + news sitemap.
- Jalankan Rich Results Test dan URL Inspection untuk contoh artikel.
- Pastikan HTTPS, Core Web Vitals, redirect www/non-www konsisten, tidak ada halaman penting yang `noindex`.
- Pasang authentication production untuk `/admin/` (Cloudflare Access atau session/role auth).
- Gunakan CAPTCHA/Turnstile + rate limit pada form publik.
- Tinjau consent/cookie/privacy bila Analytics/AdSense diaktifkan.

## Catatan Google News
Google News tidak memerlukan pengajuan manual Publisher Center untuk dipertimbangkan. Eligibility/ranking tetap bergantung pada kualitas, kebijakan, transparansi, freshness, relevance, authority, location dan language. Implementasi teknis tidak menjamin artikel muncul di Google News.
