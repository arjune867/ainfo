# Security Notes

- Never commit `.dev.vars`, DOKU secrets, Jooble keys, Google credentials, Turnstile secret or push gateway token.
- Admin authorization is enforced in Worker APIs. Hiding a menu is not treated as authorization.
- `/admin/` requires an authenticated Editor/Admin/Super Admin session.
- `ADMIN_EMAIL` promotes only the exact configured account to Super Admin.
- Mutating API requests require CSRF token from same-site cookie/header.
- Login/registration/comment endpoints are rate limited.
- Turnstile is enforced when both site and secret key are configured.
- DOKU webhook verifies HMAC and request id is unique to prevent replay processing.
- Media uploads are limited by MIME type and size and stored in R2.
- User-supplied text rendered by SSR uses HTML escaping.
- Run an external dependency/security scan and penetration test before accepting payments at scale.
