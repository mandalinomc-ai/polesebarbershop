# SECURITY_AUDIT — Felice Polese Barber Shop

**Site:** https://felicepolesebarbershop.vercel.app  
**Scope:** this repository only (Felice Polese). Do not treat `polesebarbershop` as deploy target.  
**Date:** 2026-09-04  
**Claim level:** hardening measures applied — not a penetration-test certificate.

## 1. Executive summary

Public booking stays low-friction (no CAPTCHA). Sensitive surfaces (login, booking create/cancel, CRM notify) are rate-limited server-side. Gestionale sessions are signed, expiring, HttpOnly (+ Secure in production). Default `admin`/`admin` is rejected in production.

## 2. Auth & sessions (`/gestionale`)

| Control | Status |
|---------|--------|
| Credential check (timing-safe) | Yes |
| Session token HMAC + expiry (12h) + nonce | Yes |
| Cookie HttpOnly | Yes |
| Cookie Secure (prod / Vercel) | Yes |
| SameSite=Lax | Yes |
| Login rate limit (5 / 15 min / IP) | Yes |
| Default credentials blocked in production | Yes |
| Middleware deny-by-default for `/api/admin/*` (except login/logout) | Yes |
| Route-level `isAdminRequest()` on all admin data APIs | Yes |

## 3. API matrix

| Endpoint | Auth | Rate limit | Notes |
|----------|------|------------|-------|
| `POST /api/bookings` | Public | 8/h/IP | Zod + honeypot + slot revalidation + DB exclusion |
| `GET/DELETE /api/bookings/[token]` | Token (48/64 hex) | GET 60/h, DELETE 20/h | IDOR via unguessable token; cancel also `.eq(manage_token)` |
| `GET /api/availability` | Public | — | Read-only calendar; not spam-sensitive |
| `POST /api/admin/login` | Public | 5/15m/IP | Sets session cookie |
| `POST /api/admin/logout` | Cookie clear | — | |
| `GET/PATCH /api/admin/appointments` | Admin | Middleware + handler | |
| `GET/PATCH /api/admin/crm` | Admin | Middleware + handler | Notes upsert by `clientKey` after auth |
| `POST /api/admin/walk-in` | Admin | Middleware + handler | |
| `POST /api/admin/find-slot` | Admin | Middleware + handler | |
| `GET /api/admin/history` | Admin | Middleware + handler | |
| `GET /api/admin/notifications` | Admin | Middleware + handler | |
| `POST /api/admin/notify` | Admin | 30/h/IP | Email CRM templates |

Rate limits are in-memory (warm isolate). Suitable as first line; not a global Redis store.

## 4. Booking abuse controls

- Server Zod validation (names, email, IT phone, GDPR literal `true`)
- Invisible honeypot field `website` (silent fake success if filled)
- Re-check free slot server-side (`fullSearch: true`) before insert
- Supabase exclusion / overlap → HTTP 409
- Manage tokens: `randomBytes(32)` (64 hex); legacy 48-hex still accepted

## 5. Secrets & config

- Service role / Gmail app password / admin password: server env only (see `.env.example`)
- No secrets in client bundles for Supabase writes (admin client server-side)
- `.env*` gitignored

## 6. Security headers (`next.config.ts`)

CSP (careful), HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy, `poweredByHeader: false`.  
CSP allows Google Fonts + Maps frames required by the live design.

## 7. Residual risks

1. In-memory rate limits reset across cold starts / multiple instances.
2. Google Fonts / Maps = third-party connections (see compliance docs).
3. Gestionale page HTML is public; data APIs are not — keep strong `ADMIN_*`.
4. Optional `ADMIN_SESSION_SECRET` recommended in production.

## 8. Tests

See `lib/admin-auth.test.ts`, `lib/rate-limit.test.ts`, `lib/manage-token.test.ts`, `lib/security-booking.test.ts`, `lib/cookie-consent.test.ts`.
