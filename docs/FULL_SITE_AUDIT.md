# FULL SITE AUDIT — Felice Polese Barber Shop

**Repo:** polesebarbershop / Felice Polese  
**Audit date:** 2026-09-14  
**Claim level:** code-backed factual review — **not** a penetration test, **not** a declaration of “100% GDPR compliant”.  
**Italian context:** titolare sole-trader style fields present (CF / P.IVA); formal RoPA/DPO/DPIA remain open (see `LEGAL_TODO.md`).

**Primary live URL (docs):** `https://felicepolesebarbershop.vercel.app`  
**Config default `SITE.siteUrl`:** same Vercel host (`lib/site-config.ts`).  
**Stale SEO assets:** `public/robots.txt` + `public/sitemap.xml` still point at legacy `https://polesebarbershop.vercel.app`.

---

## A. Public site (frontend)

### Routes / pages present

| Route | File | Notes |
|-------|------|--------|
| `/` | `app/page.tsx` | Full marble landing (or Coming Soon if `NEXT_PUBLIC_IS_COMING_SOON=true`) |
| `/prenota` | `app/prenota/page.tsx` | Standalone booking wizard + `MiniCartDock` |
| `/appuntamento/[token]` | `app/appuntamento/[token]/page.tsx` | Manage / cancel (`robots: noindex`) |
| `/privacy-policy` | `app/privacy-policy/page.tsx` | GDPR informativa |
| `/cookie-policy` | `app/cookie-policy/page.tsx` | Cookie list from `SITE_COOKIES` |
| `/terms` | `app/terms/page.tsx` | Termini / disdetta |
| `/gestionale` | `app/gestionale/page.tsx` | Gestionale shell (`robots: noindex`; middleware `X-Robots-Tag`) |
| `/admin` | `app/admin/page.tsx` + `next.config.ts` redirect | Soft redirect → `/gestionale` |

Homepage sections (`components/site/LandingSections.tsx` + `Hero`): `#about`, video reels, `#listino` / `#prenota` (dual listino + booking), `#social` (QR), `#contact` (maps / WA / email / hours).

Nav anchors (`components/site/Chrome.tsx`): Servizi → `#about`, Sfumature → `#gallery`, Listino → `#listino`, Prenota → `#prenota`, Orari/Contatti → `#contact`.

### Booking flow, dual listino, mini-cart dock

- **Online calendar booking:** `FreshaBookingFlow` (`components/booking/FreshaBookingFlow.tsx`) — multi-step; server create via `POST /api/bookings`.
- **Dual listino** (`components/booking/ServiceListino.tsx`):
  - **Listino prenota ora** — online-bookable services → booking cart / calendar sync (`BOOKING_SELECTION_SYNC_EVENT`).
  - **Listino consulenza** — WhatsApp-only services → consulenza cart (`CONSULTATION_SELECTION_SYNC_EVENT`) → `wa.me` prefill.
- **Mini-cart dock:** `MiniCartDock` stacks `BookingMiniCart` + `ConsultationMiniCart` (homepage + `/prenota`). Fixed dock CSS intended to avoid FAB overlap.
- GDPR checkbox required in UI **and** Zod `gdprConsent: literal(true)` on server (`lib/validations.ts`).
- Honeypot field `website` on booking create (silent fake success).

### Cookie banner / privacy / cookie / terms

| Surface | Status |
|---------|--------|
| Cookie banner Accetta / Rifiuta / Personalizza | `components/site/CookieBanner.tsx` (in Footer) |
| Gestisci cookie | Footer button + `/?gestisci-cookie=1` |
| Privacy | `/privacy-policy` — CF, P.IVA, terzi reali |
| Cookie policy | `/cookie-policy` — lists `polese_admin`, `polese_cookie_consent` only |
| Terms | `/terms` — prenotazione, disdetta 30 min, orari, IVA inclusa |

No inventati analytics/marketing cookies in code (`lib/cookie-consent.ts` + tests).

### Contact, WhatsApp, Maps, JSON-LD hours

- **WhatsApp FAB + contact:** `wa.me/${SITE.whatsapp}` (`+39 327 015 6225`).
- **Maps FAB + links:** Google Maps search URL from `MAPS_DESTINATION`.
- **Email:** `felicepolese550@gmail.com` (`mailto:` helpers).
- **Instagram:** `SITE.instagram`.
- **JSON-LD** (`app/layout.tsx`): `WebSite` + `HairSalon` with address, geo, `vatID` / `taxID`, `openingHoursSpecification`:
  - Lun–Mer 09:00–19:00  
  - Gio 09:00–20:00  
  - Ven–Sab 09:00–21:00  
  - Dom omitted (closed) — aligned with `SITE.hours`.

### Obvious UX / broken-link risks

1. **Stale sitemap/robots host** — `public/sitemap.xml` and `public/robots.txt` use `polesebarbershop.vercel.app`; live brand URL / future `.it` diverge → SEO confusion.
2. **Sitemap incomplete** — missing `/cookie-policy`; no dynamic generation from `SITE.siteUrl`.
3. **Nav “Sfumature” → `#gallery`** — if gallery id missing or renamed, dead anchor.
4. **`/prenota` vs `/#prenota`** — two entry points; dual listino lives mainly on homepage; `/prenota` uses wizard without beside-listino layout.
5. **ICS UID domain** hard-coded `@polesebarbershop.it` in booking/cancel routes — may not match production host / future domain.
6. **Google Fonts loaded twice** — `next/font` **and** `<link href="fonts.googleapis.com/...">` in `app/layout.tsx` (extra third-party requests; compliance risk).
7. **Coming-soon gate** — env flag can hide full site; booking path must be re-tested if toggled.

---

## B. Gestionale

### Login / session model

| Control | Implementation |
|---------|----------------|
| Credentials | `ADMIN_USER` / `ADMIN_PASSWORD` (defaults `admin` / `smda2026` if unset) |
| Verify | Timing-safe compare (`lib/admin-auth.ts`) |
| Session | HMAC token `{expMs}.{nonce}.{hmac}`, cookie `polese_admin` |
| Cookie flags | HttpOnly, SameSite=Lax, Secure on prod/Vercel, maxAge 12h |
| Edge middleware | Cookie **presence** + length ≥ 40 for `/api/admin/*` except login/logout |
| Handler auth | Full `isAdminRequest()` HMAC + expiry on every admin data route |
| Login rate limit | 5 / 15 min / IP |
| Weak defaults | Only legacy unset→`admin`/`admin` pair flagged; **`admin`/`smda2026` is accepted in production by design** (see tests) |

UI login lives in client `GestionalePanel`; **HTML of `/gestionale` is public** (login form). Data only after cookie + API auth.

### Features (UI tabs / panels)

From `components/gestionale/GestionalePanel.tsx` (+ related):

| Area | Capability | APIs used |
|------|------------|-----------|
| Dashboard | KPI oggi, clienti, quick links | appointments + crm |
| Agenda | Day/week view, patch status/reschedule, force overlaps | `GET/PATCH /api/admin/appointments` |
| Walk-in | Modal + quick slot | `POST /api/admin/walk-in`, `GET /api/admin/find-slot` |
| Blocks | Blocca fascia | `GET/POST/DELETE /api/admin/calendar-blocks` |
| Abbonamenti | Subscription panel on agenda | `GET/POST/PATCH /api/admin/subscriptions` |
| Listino admin | Durate/prezzi overlay | `GET/PATCH /api/admin/services` |
| Clienti | Anagrafica, notes, edit contact | `GET/PATCH /api/admin/crm`, `POST/PATCH /api/admin/clients` |
| CRM notify | Email templates + WA deep links | `POST /api/admin/notify` |
| Bell | Recent booking notifications | `GET /api/admin/notifications` |
| Statistiche | Period KPIs | crm query |
| Storico | Full history | `GET /api/admin/history` |

### `/gestionale` HTML public vs APIs protected

| Layer | Public? | Protection |
|-------|---------|------------|
| `GET /gestionale` HTML/JS | **Yes** (noindex headers) | Login UI only; no customer data in SSR |
| `POST /api/admin/login` | Yes | Rate limit + credentials |
| Other `/api/admin/*` | **No** | Middleware presence + `isAdminRequest()` |
| Supabase writes | Server-only | `SUPABASE_SERVICE_ROLE_KEY` / secret — **not** used from browser |

**Verdict:** UI auth alone is not trusted; server-side checks are present on admin data endpoints. Residual risk = known default password in source if env not overridden.

---

## C. API security (CRITICAL)

**Legend:** Auth = server-side. RL = `lib/rate-limit.ts` (in-memory per warm isolate — not global Redis). Zod = schema `safeParse` (or shared schema).

Middleware (`middleware.ts`): deny-by-default cookie presence for `/api/admin/*` except `/login` and `/logout`. **Does not** verify HMAC (handlers do).

### Complete route matrix (`app/api/**/route.ts`)

| Method(s) | Path | Auth required? | Middleware | `isAdminRequest` | Rate limit | Zod / validation |
|-----------|------|----------------|------------|------------------|------------|------------------|
| POST | `/api/bookings` | No (public) | — | — | **8/h/IP** | `bookingSchema` + honeypot + slot recheck |
| GET | `/api/bookings/[token]` | Manage token (48\|64 hex) | — | — | **60/h/IP** | Token format |
| DELETE | `/api/bookings/[token]` | Manage token + 30‑min rule | — | — | **20/h/IP** | Token format; DB `.eq(manage_token)` |
| GET | `/api/availability` | No | — | — | **None** | `availabilityQuerySchema` |
| GET | `/api/catalog` | No | — | — | **None** | Active catalog only (no Zod body) |
| POST | `/api/admin/login` | Credentials | Exempt | — | **5/15m/IP** | `adminLoginSchema` |
| POST | `/api/admin/logout` | No (clears cookie) | Exempt | — | None | — |
| GET, PATCH | `/api/admin/appointments` | **Yes** | Presence | **Yes** | None | Query + `patchSchema` |
| DELETE, PATCH | `/api/admin/appointments/[id]` | **Yes** | Presence | **Yes** | None | UUID + patch Zod |
| GET, POST, DELETE | `/api/admin/calendar-blocks` | **Yes** | Presence | **Yes** | None | `createSchema` / UUID |
| POST, PATCH | `/api/admin/clients` | **Yes** | Presence | **Yes** | None | `contactSchema` |
| GET, PATCH | `/api/admin/crm` | **Yes** | Presence | **Yes** | None | `notesSchema` on PATCH |
| GET | `/api/admin/find-slot` | **Yes** | Presence | **Yes** | None | `querySchema` |
| GET | `/api/admin/history` | **Yes** | Presence | **Yes** | None | — (auth only) |
| GET | `/api/admin/notifications` | **Yes** | Presence | **Yes** | None | — |
| POST | `/api/admin/notify` | **Yes** | Presence | **Yes** | **30/h/IP** | `crmNotifySchema` |
| GET, PATCH | `/api/admin/services` | **Yes** | Presence | **Yes** | None | `patchSchema` |
| GET, POST, PATCH | `/api/admin/subscriptions` | **Yes** | Presence | **Yes** | None | create + patch Zod |
| POST | `/api/admin/walk-in` | **Yes** | Presence | **Yes** | None | walk-in + override Zod |

### Unprotected admin data endpoints?

**None found.** Every admin data handler checked in this audit calls `isAdminRequest()` before returning PII or mutating state. Login/logout are intentionally public/clear-cookie.

**Related notes (not “unprotected admin”):**

- Public `GET /api/availability` and `GET /api/catalog` expose schedule emptiness / prices — intentional; catalog has no secrets.
- Manage-token endpoints are capability URLs (unguessable); treat token leakage as account takeover for that appointment.
- `POST /api/admin/notify` after auth can email an arbitrary `to` address (admin-session abuse surface).

### Other security controls (non-route)

- CSP + HSTS + frame deny + nosniff + Permissions-Policy (`next.config.ts`).
- CSP allows `'unsafe-inline'` and `'unsafe-eval'` on `script-src` (XSS blast radius if injection ever appears).
- `poweredByHeader: false`.
- Booking: no CAPTCHA (documented trade-off).

---

## D. Legal / compliance (IT)

### Present in product

| Item | Status |
|------|--------|
| Informativa privacy | `/privacy-policy` — titolare, CF, P.IVA, finalità, conservazione ≤24 mesi (salvo fiscale), diritti, Garante |
| Cookie policy | Real cookies only |
| Banner non-blocking | Accetta / Rifiuta / Personalizza |
| Booking GDPR checkbox | UI + server Zod |
| Terms / disdetta | `/terms` — 30 minuti |
| Company fields in `SITE` | `fiscalCode`, `vatNumber`, address Benevento |
| Footer legal line | P.IVA · CF |

### Third parties (actual)

Documented in privacy + `docs/THIRD_PARTY_SERVICES.md`:

- Vercel (hosting/logs)
- Supabase (DB; service role server-side)
- Gmail SMTP (transactional + .ics)
- Google Maps (outbound on click / frames allowed in CSP)
- Google Fonts (browser → Google)

**Not used:** GA, Meta Pixel, Hotjar, Twilio, payment PSP, CAPTCHA.

### `LEGAL_TODO` gaps (do not invent)

From `docs/LEGAL_TODO.md`:

1. DPO appointment / contact  
2. Registro dei trattamenti (RoPA)  
3. DPIA necessity for booking + CRM  
4. Signed DPAs (Vercel, Supabase, Google)  
5. Marketing legal basis (none today)  
6. Fiscal retention vs 24-month appointment copy  
7. Google Fonts self-host (Italian case-law risk)  
8. UE representative (N/A if IT establishment)  
9. Paper salon notice alignment  
10. Breach contact list beyond public email  

**No PEC / REA / Codice SDI** in UI — correctly not invented.

**This audit does not certify compliance.** Product implements reasonable UX + technical measures; formal Italian GDPR duties remain owner/counsel work.

---

## E. Config / white-label readiness

### `lib/site-config.ts` — change for new brand / `.it` domain

| Field / helper | Purpose |
|----------------|---------|
| `SITE.brand`, `name`, `legalName`, `tagline`, headlines | Branding |
| `SITE.siteUrl` / `NEXT_PUBLIC_SITE_URL` | Canonical + OG + emails |
| Address / geo / hours | NAP + JSON-LD |
| `phone*`, `whatsapp`, `email`, `instagram*` | Contact |
| `fiscalCode`, `vatNumber`, `pricesIncludeVat` | Legal footer / privacy |
| `openingDate`, countdown helpers | Pre-opening UX |
| `PUBLIC_CONTACT_WHATSAPP`, `SALON_NOTIFY_WHATSAPP_FALLBACK`, `getSalonNotifyWhatsApp()` | Dual WA numbers |
| `ADMIN_EMAIL_FALLBACK`, `getAdminEmail()`, `getBookingNotificationEmail()` | Mail routing |
| Booking constants | Slot step, horizon, cancel window copy |

Also update copy strings that hard-code “Felice Polese” (hero, coming-soon, WA templates).

### `.env.example` — for resale / new domain

| Variable | Role |
|----------|------|
| `NEXT_PUBLIC_SITE_URL` | e.g. `https://www.cliente.it` |
| `NEXT_PUBLIC_IS_COMING_SOON` | Optional gate |
| `SUPABASE_*` / `NEXT_PUBLIC_SUPABASE_*` | Project per client |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | SMTP |
| `BOOKING_NOTIFICATION_EMAIL`, `ADMIN_EMAIL`, `OWNER_EMAIL` | Recipients |
| `ADMIN_USER`, `ADMIN_PASSWORD` | **Set strong unique values in prod** |
| `ADMIN_SESSION_SECRET` | Recommended ≥16 chars |

**Missing from `.env.example` but used in code:** `SALON_NOTIFY_WHATSAPP` (salon alert number). Document when white-labeling.

### `vercel.json`

- Framework: Next.js; cache headers for `/assets`, `/video`, `/_next/static`.
- **No domain list** — attach custom domain in Vercel project settings; set `NEXT_PUBLIC_SITE_URL` to match.
- Production CSP/HSTS also come from `next.config.ts` (not only `vercel.json`).

### Extra white-label touchpoints

- `public/robots.txt`, `public/sitemap.xml` — regenerate with new host; add cookie-policy URL.
- ICS UIDs `@polesebarbershop.it` in API routes — parameterize to client domain.
- Assets under `/public/assets`, OG image, QR PNGs, videos.
- Cookie/consent key names (`polese_*`) — optional rename for multi-tenant clarity.
- Docs that still say “do not deploy to legacy polesebarbershop project”.

---

## F. Gaps / bugs found in code (with paths)

### Security / ops

1. **Default gestionale password committed** — `lib/admin-auth-constants.ts` (`smda2026`); production login **allows** these defaults (`lib/admin-auth.test.ts` “accepts default smda2026 in production”). Risk if Vercel env empty.  
2. **Explicit `ADMIN_PASSWORD=admin` not blocked** — `isUsingDefaultAdminCredentials()` only when env unset + legacy pair; explicit weak env accepted in production tests.  
3. **In-memory rate limits** — `lib/rate-limit.ts`; weak under multi-instance / cold start.  
4. **CSP `unsafe-inline` + `unsafe-eval`** — `next.config.ts`.  
5. **Middleware auth is shallow** — length check only (`middleware.ts`); relies on handlers (correct but easy to miss on a new route).  
6. **`/gestionale` HTML public** — expected; ensure strong `ADMIN_*`.

### SEO / branding consistency

7. **`public/robots.txt`** Sitemap → `polesebarbershop.vercel.app`.  
8. **`public/sitemap.xml`** Same legacy host; no `/cookie-policy`.  
9. **ICS UID** `@polesebarbershop.it` — `app/api/bookings/route.ts`, `app/api/bookings/[token]/route.ts`, `app/api/admin/appointments/route.ts`.  
10. **Docs matrix drift** — `docs/SECURITY_AUDIT.md` / `API_SECURITY_MATRIX.md` omit newer routes (subscriptions, calendar-blocks, clients, services, catalog) and misstate find-slot as POST.

### Compliance / privacy UX

11. **Google Fonts dual load** — `app/layout.tsx` (`next/font` + CSS2 `<link>`).  
12. **LEGAL_TODO still open** — DPO, RoPA, DPIA, DPAs, Fonts self-host.  
13. **`.env.example` omits `SALON_NOTIFY_WHATSAPP`**.

### Functionality / UX

14. **Nav `#gallery`** may 404-scroll if section id absent (`components/site/Chrome.tsx`).  
15. **Duplicate booking surfaces** — `/` dual listino vs `/prenota` wizard-only; risk of UX inconsistency.  
16. **Coming-soon flag** can blank public booking without changing APIs (`IS_COMING_SOON`).

### Positive controls (for balance)

- All current admin data APIs use `isAdminRequest()`.  
- Booking Zod + honeypot + server duration from catalog (client minutes not trusted).  
- Manage cancel also filters by `manage_token`.  
- Cookie inventory matches code.  
- Gestionale noindex via metadata + middleware headers.  
- Supabase admin client server-only (no browser service-role usage found).

---

## Appendix — file checklist read for this audit

- `middleware.ts`, `lib/admin-auth.ts`, `lib/admin-auth-constants.ts`, `lib/rate-limit.ts`, `lib/validations.ts`, `lib/cookie-consent.ts`, `lib/site-config.ts`, `lib/supabase.ts`  
- All `app/api/**/route.ts` (18 files)  
- `app/layout.tsx`, public pages, `app/gestionale/page.tsx`, `app/admin/page.tsx`  
- `components/gestionale/*`, `components/booking/*`, `components/site/CookieBanner.tsx`, `Chrome.tsx`, `LandingSections.tsx`  
- `docs/LEGAL_TODO.md`, `COMPLIANCE_AUDIT.md`, `SECURITY_AUDIT.md`, `API_SECURITY_MATRIX.md`, `THIRD_PARTY_SERVICES.md`  
- `.env.example`, `vercel.json`, `next.config.ts`, `public/robots.txt`, `public/sitemap.xml`

---

*End of audit. Update this file when routes or legal claims change; keep claims factual and Italian-law-cautious.*
