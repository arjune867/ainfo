# AINFO AI Newsroom

Target production URL: `https://art.ainfo.web.id`

Folder ini adalah versi Cloudflare-native AINFO AI Newsroom dan sengaja dipisahkan dari portal publik di root repository.

## Status saat ini

Source production candidate sudah disiapkan di branch `feature/ainfo-art-newsroom`:

- React + Vite responsive PWA
- Sidebar desktop + bottom navigation mobile
- Markdown preview/editor: H1/H2/H3, bold, italic, list, blockquote, link
- News dari 1-5 URL
- Source Lock + conflict analysis
- Artikel topik, evergreen, press release dan bulk generator
- High Value Content prompt lock
- 7-AI router: OpenAI, Gemini, Anthropic, Groq, Mistral, DeepSeek, OpenRouter
- Draft + revision history
- Fact checker
- Internal linking
- SEO Tools
- Thumbnail generator ke R2
- Multi author + role Admin/Editor
- Analytics
- Schedule publish setiap 5 menit
- AINFO/WordPress/Blogger/Generic API adapters
- Cloudflare Access authentication
- D1 persistence
- GitHub Actions validation + deploy workflow

Yang perlu Anda lakukan sendiri adalah konfigurasi account-level Cloudflare, secrets, Access, domain, dan publish endpoint. Lihat `SETUP-PRODUCTION.md`.

## Architecture

- Frontend: React + Vite PWA
- Backend: Cloudflare Worker `ainfo-art`
- Authentication: Cloudflare Access
- Database: Cloudflare D1 `ainfo-db`, tabel memakai prefix `art_*`
- Media: Cloudflare R2 `ainfo-media-prod`, object memakai prefix `art/`
- Scheduler: Worker Cron setiap 5 menit
- Publishing: authenticated AINFO Publishing API
- AI routing: tujuh provider dengan automatic failover

## Local development

```bash
cd art
npm install
cp .dev.vars.example .dev.vars
npm run db:migrate:local
npm run dev
```

Untuk local auth, isi `DEV_AUTH_EMAIL` di `.dev.vars`. Variabel ini hanya untuk development dan tidak perlu menjadi production secret.

Untuk menjalankan frontend + Worker lokal:

```bash
npm run cf:dev
```

## Production

Baca langkah lengkap:

`SETUP-PRODUCTION.md`

Ringkasnya:

1. isi GitHub Actions secrets `CLOUDFLARE_API_TOKEN` dan `CLOUDFLARE_ACCOUNT_ID`
2. merge PR ke `main`
3. biarkan workflow apply migration + deploy Worker
4. isi Worker secrets untuk AI dan publishing
5. aktifkan Cloudflare Access untuk `art.ainfo.web.id`
6. pasang custom domain `art.ainfo.web.id`
7. siapkan endpoint publish private di portal AINFO
8. lakukan full end-to-end test

## Security

Jangan pernah commit nilai asli untuk:

- `AINFO_PUBLISH_TOKEN`
- API key tujuh provider AI
- WordPress/Blogger/Generic API credentials

`.dev.vars` sudah di-ignore. Repository hanya menyimpan `.dev.vars.example`.

## Editorial standard

Semua generator memakai standar High Value Content AINFO:

- target 1.000+ kata bila bahan faktual mencukupi
- H1/H2/H3 dan Markdown semantik
- SEO title, meta description, slug dan keyword metadata
- source lock dan fact checking untuk workflow berita
- atribusi dan sumber transparan
- YMYL mengutamakan sumber resmi/primer
- tidak mengarang E-E-A-T, pengalaman, data atau kutipan
- human review sebelum publikasi sensitif

## Manual deploy

```bash
npm install
npm run typecheck
npm run build
npm run db:migrate:remote
npm run deploy
```
