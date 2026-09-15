AINFO V13 - PRE-PRODUCTION CMS/PWA
==================================

Jalankan Windows:
  START-LOCAL-FULL.bat

Jalankan Linux/macOS:
  ./start-local-full.sh

URL utama:
  http://127.0.0.1:8080/

Dashboard Admin:
  http://127.0.0.1:8080/admin/

FITUR PUBLIK V13
- Tab kategori header aktif dan membuka halaman kategori mandiri.
- Breaking News running text/marquee aktif dan dapat diatur dari Admin.
- Login/Registrasi username/email dan tombol "Login Via Google" dengan logo Google berwarna.
- Beranda kaya: headline, terkini, rekomendasi, video 9:16, rating/pembaca, produk, jobs, Living Assistance.
- Shopping, cart, checkout WhatsApp, flow DOKU, flash sale dan kategori produk.
- Jobs + Jooble melalui backend proxy.
- Video 9:16 swipe feed, profile author, reaction, share, bookmark dan product link.
- Cuaca, jadwal sholat, audio berita, comment/reply, reaction, rating, bookmark, gift.
- PWA publik + PWA Admin.

DASHBOARD ADMIN V13
- Berita: tambah/edit/hapus, upload image, kategori, draft/review/scheduled/published, headline, breaking.
- Shopping: tambah/edit produk, kategori, harga, diskon, stock, flash sale, upload image.
- Video: tambah/edit video, poster 9:16, author, caption, product link dan metrik.
- Jobs: lowongan manual + default query/lokasi/cache Jooble + test API + server API-key activation.
- Pengguna: role reader/contributor/reporter/editor/admin dan active/suspended.
- Push Notification: campaign manager + test Notification API + server queue.
- Tampilan: warna brand, feature toggles, kategori header, running Breaking News.
- Footer & Halaman: transparansi redaksi, publisher, kontak, judul kolom footer dan editor halaman legal/transparansi.
- SEO & Google News: title, description, keywords, canonical domain, site verification dan readiness checklist.
- Monetisasi: inventory AdSense/ads slots.
- Integrasi: Jooble, DOKU, Google Login, weather/prayer, PWA.
- Pengaturan website dan keamanan.

CATATAN PRA-PRODUKSI
- Konten berita/shop/video/jobs/settings disimpan di localStorage agar review CMS -> website dapat dicoba tanpa database cloud.
- Buka publik dan Admin dari origin localhost yang sama agar sinkronisasi localStorage bekerja.
- Users memakai SQLite backend lokal.
- Upload gambar pada CMS dipadatkan ke WebP/Data URL untuk preview. Production harus dipindah ke R2/storage server.
- Google Login memerlukan GOOGLE_CLIENT_ID yang valid untuk origin localhost/domain production.
- Remote Web Push production membutuhkan VAPID/Web Push provider; mode saat ini menguji Notification API perangkat dan queue server.
- DOKU dan Jooble harus memakai secret/backend; jangan menaruh credential di browser.
- Production Cloudflare harus memindahkan persistence ke D1/R2, mengaktifkan HTTPS, secure cookies, CSRF, rate limiting dan backup.
