# AINFO AI Newsroom

Target production URL: `https://art.ainfo.web.id`

This directory is the Cloudflare-native home for AINFO AI Newsroom. It is intentionally isolated from the public portal code in the repository root.

## Architecture

- Frontend: React + Vite PWA
- Backend: Cloudflare Worker
- Database: Cloudflare D1 (`ainfo-db`) using `art_*` table prefixes
- Media: Cloudflare R2 (`ainfo-media-prod`) using an `art/` key prefix
- Scheduler: Worker cron every 5 minutes
- Publishing: authenticated AINFO Publishing API
- AI routing: OpenAI, Gemini, Anthropic, Groq, Mistral, DeepSeek, OpenRouter with automatic fallback

## Security

Never commit API keys or publish tokens. Use Cloudflare Worker secrets for:

- `SESSION_SECRET`
- `AINFO_PUBLISH_URL`
- `AINFO_PUBLISH_TOKEN`
- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GROQ_API_KEY`
- `MISTRAL_API_KEY`
- `DEEPSEEK_API_KEY`
- `OPENROUTER_API_KEY`

The public repository should only contain `.dev.vars.example` with empty/example values.

## Local setup

```bash
cd art
npm install
cp .dev.vars.example .dev.vars
npm run db:migrate:local
npm run dev
```

## Production migration

The production Worker is named `ainfo-art`. The current configuration reuses the existing `ainfo-db` D1 database and `ainfo-media-prod` R2 bucket to avoid requiring new Cloudflare resources during migration. All newsroom database tables are prefixed `art_`.

Before production deployment:

1. Port the current newsroom React UI into `art/src`.
2. Port AppDeploy backend routes to `art/worker/src/index.ts` using D1/R2 and provider APIs.
3. Apply `art/migrations/0001_newsroom.sql` to the remote D1 database.
4. Add all Worker secrets in Cloudflare.
5. Deploy the `ainfo-art` Worker.
6. Attach custom domain `art.ainfo.web.id`.
7. Configure Cloudflare Access or the newsroom login policy.
8. Configure the internal publish endpoint on `ainfo.web.id` and verify end-to-end publishing.

## Editorial standard

The migrated application must preserve the locked AINFO High Value Content standard, including:

- 1,000+ word target when the factual material supports it
- structured H1/H2/H3 output
- Markdown rendering for bold, italic, lists, links and blockquotes
- SEO title, meta description, slug and keyword metadata
- source lock and fact checking for news workflows
- explicit attribution and source transparency
- YMYL source requirements
- human review before sensitive publication

## Deployment

```bash
npm run deploy
```

GitHub Actions can also deploy this directory after Cloudflare repository secrets are configured.
