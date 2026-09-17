# AINFO V14.12 – Unified Engagement

## Fitur
- Reply komentar artikel memakai composer penuh: emoticon, sticker, GIF dan reaction pada komentar/balasan.
- Reply komentar video tetap memakai composer penuh: emoticon, sticker, GIF; setiap komentar dan balasan dapat diberi reaction.
- AINFO Shop: rating 1–5, ulasan, diskusi, reply bertingkat, reaction, emoticon, sticker dan GIF.
- Data Shop engagement tersimpan di Cloudflare D1.
- GIPHY diproxy melalui Worker sehingga API key tidak perlu dikirim sebagai key asli ke frontend.

## Migration wajib
```bash
npx wrangler d1 migrations apply ainfo-db --remote
```

Migration baru: `migrations/0011_shop_engagement_v14_12.sql`.

## GIPHY yang tidak hilang saat deploy
Simpan key sebagai Cloudflare Worker Secret bernama `GIPHY_API_KEY`:

```bash
npx wrangler secret put GIPHY_API_KEY
```

Atau Cloudflare Dashboard → Workers & Pages → ainfo → Settings → Variables and Secrets → Add → Secret → nama `GIPHY_API_KEY`.

Jangan menyimpan nilai GIPHY key di GitHub atau `wrangler.jsonc`.

`wrangler.jsonc` menggunakan `keep_vars: true` untuk mempertahankan dashboard variables. Worker V14.12 juga masih membaca `GIPHY_API_KEY_PUBLIC` sebagai fallback agar konfigurasi lama tidak langsung rusak, tetapi `GIPHY_API_KEY` Secret adalah konfigurasi produksi yang direkomendasikan.

## Worker
Entrypoint production: `worker/src/v14_12.js`.
