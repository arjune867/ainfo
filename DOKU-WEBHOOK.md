# DOKU Flow

Shopping/Gift flow:

1. Browser sends checkout data to Worker.
2. Worker creates an AINFO invoice in `pending` state.
3. Worker signs request to DOKU using backend-only secret.
4. DOKU returns payment URL.
5. User pays at DOKU.
6. DOKU calls `/api/doku/webhook`.
7. Worker validates HMAC signature and stores `Request-Id`.
8. Duplicate `Request-Id` is acknowledged but not processed twice.
9. Only a verified successful webhook can update Gift/Order to `paid`.

Production callback URL:

`https://www.ainfo.web.id/api/doku/webhook`
