# SECURITY_INCIDENT_RESPONSE — Felice Polese

Lightweight playbook for the salon owner / technical operator.

## 1. Detect

Signs: unexpected gestionale logins, mass booking spam, customer reports of phishing “manage” links, Vercel/Supabase anomalous usage, Gmail “less secure / app password” alerts.

## 2. Contain (first 30 minutes)

1. Rotate `ADMIN_PASSWORD` (and optional `ADMIN_SESSION_SECRET`) in Vercel Production → redeploy or restart.
2. Rotate Supabase service role key if leakage suspected; update env.
3. Revoke/regenerate Gmail App Password; update `GMAIL_APP_PASSWORD`.
4. Temporarily set booking offline only if active abuse (coordinate with owner) — prefer rate limits first.
5. Do **not** post secrets in chat, issues, or commits.

## 3. Assess

- Which data categories were exposed? (name, email, phone, appointments)
- How many data subjects (approx.)?
- Is notification to Garante / customers required under GDPR arts. 33–34?

## 4. Notify

- Owner email: see production `ADMIN_EMAIL` / `OWNER_EMAIL` (public contact also on site).
- If personal data breach likely: document timeline; decide Garante notification within 72h when legally required.
- Customers: use clear Italian language; no over-claiming.

## 5. Eradicate & recover

- Invalidate sessions (password change already invalidates derived session secret).
- Review Supabase rows for spam appointments; cancel/delete with care.
- Confirm https://felicepolesebarbershop.vercel.app health (home, prenota, gestionale login).

## 6. Post-incident

- Update this file with lessons learned (no secrets).
- Close items in `LEGAL_TODO.md` if the incident revealed missing contracts/process.
