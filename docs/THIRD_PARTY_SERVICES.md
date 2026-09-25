# THIRD_PARTY_SERVICES — Felice Polese (real integrations only)

| Service | Role | Data involved | Where configured |
|---------|------|---------------|------------------|
| **VPS Aruba** | Hosting / Docker / Nginx / TLS | Request logs, env secrets | `94.177.161.26` → https://felicepolesebarbershop.it |
| **Supabase** | Postgres + API | Appointments, customer fields, CRM notes | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (server) |
| **Aruba SMTP** | Transactional email + .ics | Customer/owner email content | `SMTP_*` / `MAIL_*` |
| **WhatsApp (Meta/Sinch)** | Outbound notify | Customer phone E.164 +39 | `WHATSAPP_*` / `SINCH_*` |
| **Google Maps** | Directions / map links | User click opens Google | Public URLs in UI |
| **Google Fonts** | Typography CSS | Browser connection to Google | `layout.tsx` + `next/font` |

## Not used (production)

- Vercel hosting / Vercel Cron / Vercel webhooks  
- Twilio / SMS gateways  
- QStash / Upstash queues  
- Google Analytics / Tag Manager  
- Meta Pixel  
- CAPTCHA providers (Cloudflare Turnstile, reCAPTCHA) on booking  
- Payment processors (cash/in-salon)

## Deploy note

Public production URL: **https://felicepolesebarbershop.it**  
Do not deploy this branch to the legacy `polesebarbershop` project.
