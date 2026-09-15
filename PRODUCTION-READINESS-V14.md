# AINFO V14 — Production Gate

## Implemented in code

- [x] Cloudflare Worker backend
- [x] D1 persistent database
- [x] R2 media storage
- [x] Server-side role authorization
- [x] Secure session cookie on HTTPS
- [x] PBKDF2 password hashing
- [x] CSRF protection
- [x] Rate limiting
- [x] Optional Turnstile
- [x] Google Login backend validation
- [x] DOKU Checkout
- [x] DOKU verified webhook + idempotency
- [x] Orders/Gifts pending → paid only after webhook
- [x] Jooble server proxy
- [x] Search API
- [x] Comments/reactions/ratings/bookmarks schema + APIs
- [x] Dynamic sitemap/news sitemap/RSS
- [x] Crawlable article SSR route
- [x] Scheduled publishing cron
- [x] Audit log
- [x] Daily content backup to R2
- [x] Admin noindex
- [x] CSP/HSTS/security headers
- [x] Admin metrics / order view / audit view bridge

## Must be configured before launch

- [ ] D1 production database created and migrated
- [ ] R2 production bucket created
- [ ] Custom domain attached
- [ ] `ADMIN_EMAIL` secret set
- [ ] Google OAuth production Client ID set
- [ ] Jooble production key set as secret
- [ ] DOKU Sandbox end-to-end PASS
- [ ] DOKU production merchant credentials approved
- [ ] DOKU webhook URL registered
- [ ] Turnstile site/secret keys configured
- [ ] Publisher/legal entity data filled with real information
- [ ] Real editorial team/bylines/author profiles filled
- [ ] Privacy/Cookie/Terms reviewed by appropriate legal/compliance owner
- [ ] AdSense Publisher + slots approved and configured
- [ ] Search Console ownership verified
- [ ] Sitemap submitted
- [ ] Google News transparency review completed

## Required QA before public traffic

- [ ] Chrome Android 360px
- [ ] Chrome Android 390px
- [ ] iOS Safari
- [ ] Desktop Chrome/Edge/Firefox
- [ ] Slow 4G throttling
- [ ] PWA install + offline fallback
- [ ] Registration/login/logout/profile
- [ ] Google Login
- [ ] Admin role denial for reader
- [ ] Reporter/editor/admin permission checks
- [ ] Image upload to R2
- [ ] Article publish/schedule
- [ ] Search
- [ ] Comment/reply/reaction/rating/bookmark
- [ ] DOKU Shop transaction Sandbox
- [ ] DOKU Gift Sandbox
- [ ] Duplicate webhook replay test
- [ ] Jooble API failure fallback
- [ ] 404/500 behavior
- [ ] Sitemap/RSS validation
- [ ] NewsArticle Rich Results validation
- [ ] Lighthouse / Core Web Vitals baseline
- [ ] Backup export + restore drill

## Recommended launch targets

- LCP < 2.5s
- CLS < 0.1
- INP < 200ms
- Lighthouse Performance >= 90
- Accessibility >= 95
- Best Practices >= 95
- SEO >= 95

**Production status should be considered GO only after external credentials, payment sandbox, domain, editorial/legal transparency, and QA items above are completed.**
