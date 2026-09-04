# API_SECURITY_MATRIX

Canonical matrix for Felice Polese APIs. Sensitive endpoints only are rate-limited.

| Method | Path | Public? | Auth | Validation | Abuse controls |
|--------|------|---------|------|------------|----------------|
| POST | `/api/bookings` | Yes | — | Zod bookingSchema | Rate 8/h/IP, honeypot, slot recheck, overlap 409 |
| GET | `/api/bookings/[token]` | Yes | manage token | hex 48\|64 | Rate 60/h/IP |
| DELETE | `/api/bookings/[token]` | Yes | manage token | hex 48\|64 + 30min rule | Rate 20/h/IP, token+id match |
| GET | `/api/availability` | Yes | — | Zod query | None (read) |
| POST | `/api/admin/login` | Yes | credentials | Zod | Rate 5/15m, no default creds in prod |
| POST | `/api/admin/logout` | Cookie | — | — | Clears HttpOnly cookie |
| * | `/api/admin/*` (other) | No | Admin session | Per-route Zod | Middleware cookie presence + handler HMAC |

Admin session: HttpOnly, Secure (prod), SameSite=Lax, 12h signed expiry.
