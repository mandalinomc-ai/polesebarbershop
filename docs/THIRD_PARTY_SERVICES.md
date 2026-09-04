# THIRD_PARTY_SERVICES — Felice Polese (real integrations only)

| Service | Role | Data involved | Where configured |
|---------|------|---------------|------------------|
| **Vercel** | Hosting / CDN / serverless | Request logs, env secrets | Project `temporary-prompt-quasar-rndxhgh` → alias felicepolesebarbershop |
| **Supabase** | Postgres + API | Appointments, customer fields, CRM notes | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (server) |
| **Gmail SMTP** | Transactional email + .ics | Customer/owner email content | `GMAIL_USER`, `GMAIL_APP_PASSWORD` |
| **Google Maps** | Directions / map links | User click opens Google | Public URLs in UI |
| **Google Fonts** | Typography CSS | Browser connection to Google | `layout.tsx` + `next/font` |

## Not used

- Twilio / SMS gateways  
- QStash / Upstash queues  
- Google Analytics / Tag Manager  
- Meta Pixel  
- CAPTCHA providers (Cloudflare Turnstile, reCAPTCHA) on booking  
- Payment processors (cash/in-salon)

## Deploy note

Public production URL: **https://felicepolesebarbershop.vercel.app**  
Do not deploy this branch to the legacy `polesebarbershop` project.
