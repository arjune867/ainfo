# Setup Produksi AINFO AI Newsroom

Target: `https://art.ainfo.web.id`

Source sudah disiapkan di folder `art/`. Anda hanya perlu mengisi konfigurasi akun Cloudflare, secrets, Access, DNS, dan endpoint publish AINFO.

## 1. GitHub Actions secrets

Buka repository GitHub → **Settings → Secrets and variables → Actions → New repository secret**.

Tambahkan:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Token Cloudflare minimal harus bisa:

- Workers Scripts: Edit
- D1: Edit
- R2: Edit bila deployment memerlukannya
- Account Settings: Read

Jangan masukkan API key AI ke GitHub Actions secrets kecuali memang ingin mengelola deploy dengan mekanisme sendiri. Runtime AI keys lebih aman disimpan sebagai **Worker secrets**.

## 2. Worker secrets

Setelah Worker `ainfo-art` sudah muncul di Cloudflare, buka:

**Cloudflare Dashboard → Workers & Pages → ainfo-art → Settings → Variables and Secrets**

Tambahkan sebagai **Secret**:

### AI providers

- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GROQ_API_KEY`
- `MISTRAL_API_KEY`
- `DEEPSEEK_API_KEY`
- `OPENROUTER_API_KEY`

Tidak wajib mengisi ketujuh sekaligus. Router hanya memakai provider yang memiliki key. Untuk failover yang baik, isi minimal 2-3 provider.

### Publish ke AINFO

- `AINFO_PUBLISH_URL`
- `AINFO_PUBLISH_TOKEN`

Contoh URL:

`https://www.ainfo.web.id/api/internal/publish`

### Opsional WordPress/Blogger/API

- `WORDPRESS_PUBLISH_URL`
- `WORDPRESS_AUTH_HEADER`
- `BLOGGER_PUBLISH_URL`
- `BLOGGER_AUTH_HEADER`
- `GENERIC_PUBLISH_URL`
- `GENERIC_AUTH_HEADER`

## 3. Database D1

Newsroom memakai database existing `ainfo-db`, tetapi seluruh tabelnya memakai prefix `art_` sehingga terpisah dari tabel portal utama.

Workflow deploy akan menjalankan migration otomatis. Jika ingin manual:

```bash
cd art
npm install
npx wrangler login
npm run db:migrate:remote
```

Migration utama: `migrations/0001_newsroom.sql`.

## 4. R2

Konfigurasi saat ini memakai bucket existing:

`ainfo-media-prod`

Thumbnail newsroom disimpan di prefix:

`art/thumbnails/`

Jadi tidak bercampur dengan struktur media portal utama.

## 5. Cloudflare Access — WAJIB untuk produksi

Newsroom tidak menggunakan password di source code. Login produksi mengandalkan **Cloudflare Access**.

Buka:

**Cloudflare Zero Trust → Access → Applications → Add an application → Self-hosted**

Isi:

- Application name: `AINFO AI Newsroom`
- Domain: `art.ainfo.web.id`
- Session duration: sesuai kebutuhan, misalnya 24 jam

Buat policy awal:

- Action: Allow
- Include: email Anda sendiri terlebih dahulu

Setelah login pertama berhasil, akun pertama otomatis menjadi `ADMIN`. Akun Cloudflare Access berikutnya masuk sebagai `PENDING` dan harus di-approve dari menu **Pengguna & Tim**.

Jangan membuka `art.ainfo.web.id` untuk publik tanpa Access.

## 6. Custom domain

Setelah Worker deploy:

**Workers & Pages → ainfo-art → Settings → Domains & Routes → Add → Custom Domain**

Masukkan:

`art.ainfo.web.id`

Jika DNS dikelola Cloudflare pada zone yang sama, record biasanya dibuat otomatis. Pastikan hostname mengarah ke Worker `ainfo-art`, bukan ke Worker portal utama.

## 7. Publish API AINFO

Agar tombol **Publish Sekarang** benar-benar masuk ke `ainfo.web.id`, portal utama harus memiliki endpoint private yang menerima payload berikut:

```json
{
  "title": "Judul artikel",
  "contentMarkdown": "...",
  "contentHtml": "...",
  "metaTitle": "...",
  "metaDescription": "...",
  "slug": "...",
  "primaryKeyword": "...",
  "secondaryKeywords": [],
  "author": "Editor AINFO",
  "featuredImageUrl": "...",
  "sourceUrls": [],
  "status": "publish"
}
```

Endpoint harus memvalidasi header:

`Authorization: Bearer <AINFO_PUBLISH_TOKEN>`

Token harus sama dengan secret `AINFO_PUBLISH_TOKEN` di Worker Newsroom.

## 8. Model AI

Default model didefinisikan di `art/wrangler.jsonc`. Jika provider mengganti nama model, ubah nilai berikut lalu redeploy:

- `OPENAI_MODEL`
- `GEMINI_MODEL`
- `ANTHROPIC_MODEL`
- `GROQ_MODEL`
- `MISTRAL_MODEL`
- `DEEPSEEK_MODEL`
- `OPENROUTER_MODEL`

API key tetap berada di Worker Secret dan tidak pernah masuk source GitHub.

## 9. Deploy pertama

Setelah PR digabung ke `main`, workflow `.github/workflows/deploy-art.yml` otomatis:

1. install dependency
2. typecheck
3. build frontend
4. apply D1 migration
5. deploy Worker `ainfo-art`

Anda juga dapat menjalankan manual dari tab **Actions → Deploy AINFO AI Newsroom → Run workflow**.

## 10. Uji produksi

Lakukan urutan berikut setelah setup:

1. buka `art.ainfo.web.id`
2. login lewat Cloudflare Access
3. buka **Pengaturan AI** → **Tes 7 Provider**
4. pastikan minimal satu provider ONLINE
5. buat artikel dari satu URL
6. cek Fact Sheet dan Source Lock
7. generate artikel
8. cek Preview Markdown, H2/H3 dan bold
9. buat thumbnail
10. kirim Review → Approve
11. Publish ke `ainfo.web.id`
12. cek artikel final, slug, meta, gambar, author, internal link dan formatting

Jika langkah 1-12 berhasil, Newsroom siap dipakai tim redaksi.

## Catatan keamanan

- Jangan commit `.dev.vars`.
- Jangan menaruh API key di frontend atau `wrangler.jsonc`.
- Jangan menaruh publish token di GitHub source.
- Cloudflare Access harus aktif sebelum mengundang editor.
- Gunakan token publish berbeda dari API key AI.
- Rotasi publish token jika pernah terbuka di log/chat/public repository.
