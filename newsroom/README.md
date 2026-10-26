# AINFO publishing from chat

This repository is the authenticated publishing channel. No API token is placed in a public file or in chat. Existing GitHub Actions Cloudflare credentials deploy thumbnails and write articles into the AINFO database.

When the user explicitly says **Terbitkan di AINFO**, prepare an original sourced article and thumbnail, then commit these together to `main`:

1. A PNG/JPEG/WebP thumbnail under `public/newsroom-images/<unique-name>.<ext>`.
2. A request under `newsroom/requests/<unique-request-id>.json` using the schema below.

The main deployment workflow validates the entire queue, deploys images, verifies the database connection, and publishes requests. Track the **deploy** workflow and return the verified `/read/<slug>/` URL. If publication fails, report the actual failed step. Do not claim a published article merely because the commit succeeded.

Do not add a request for a draft or without a user instruction to publish. Do not modify a successful request: retries are idempotent, and conflicting content is rejected rather than overwriting an article. Do not include credentials in JSON. Text blocks are escaped; arbitrary HTML and JavaScript are unsupported. Source URLs and image captions are stored with the article. Image dimensions/alt text should also be assessed when preparing the thumbnail.

```json
{
  "schemaVersion": 1,
  "publish": true,
  "requestId": "unique-publication-id",
  "slug": "judul-artikel-yang-unik",
  "title": "Judul artikel",
  "category": "Nasional",
  "author": "Tim AINFO",
  "metaTitle": "Judul SEO",
  "metaDescription": "Ringkasan artikel yang akurat.",
  "thumbnail": "/newsroom-images/unique-thumbnail.webp",
  "imageCaption": "Ilustrasi AI, bukan foto dokumentasi.",
  "tags": ["Nasional", "Hukum"],
  "blocks": [
    {"type": "p", "text": "Isi artikel harus cukup panjang, akurat, dan sudah ditinjau sebelum dipublikasikan. Minimal delapan puluh karakter."},
    {"type": "h2", "text": "Subjudul"},
    {"type": "p", "text": "Paragraf selanjutnya."}
  ],
  "sources": [{"title": "Judul dan penerbit sumber", "url": "https://example.com/source"}]
}
```

Supported blocks: `p`, `h2`, `h3`, `blockquote`. Requests are retained as publication records; they are not schedules or recurring crawlers. Run `node --test scripts/newsroom-publish.test.mjs` for local validation. `node scripts/newsroom-publish.mjs --check` verifies authorized D1 access and validates requests without publishing. The setup commit intentionally contains no requests.
