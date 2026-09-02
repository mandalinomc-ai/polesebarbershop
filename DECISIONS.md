# DECISIONS — Felice Polese infrastructure

**Updated:** 2026-09-02 (overwrite admitted; marble restored)

## What went wrong

A GitHub production deploy of **current main** (scissors intro, title `Felice Polese Barber Shop — MODERN BARBERING…`) was aliased onto **https://felicepolesebarbershop.vercel.app**. That overwrote the marble page the client liked.

Hobby Vercel cannot `vercel rollback` past the previous production (402). The live domain was pointed back to the oldest remaining production on `temporary-prompt-quasar-rndxhgh`:

`temporary-prompt-quasar-rndxhgh-6ve62mbnk-anon-phi-vert.vercel.app`

That deploy is July-3 / “Polese Barbershop — L'Arte della Barberia d'Élite” (hero-bg, Dante Alighieri 44, WhatsApp 327, `#prenota` already present). It is **marble**, but **not** the exact Plus Jakarta page (`Felice Polese | Modern Barbering & Fade Studio`). That exact HTML was never in this git repo; the deleted `polesebarbershop` project (410) had hosted it.

## What we restored in git

Closest in-repo visual: commit `0da4547` (Plus Jakarta, `hero-media-cell`, white marble canvas), plus Google Fonts, `/video/` rewrites, booking wizard, Maps **Corso Dante 45**, WhatsApp **351 252 3087**. Document title: `Felice Polese | Modern Barbering & Fade Studio`. No scissors intro on the homepage.

## D1 — One public URL

**https://felicepolesebarbershop.vercel.app** on Vercel project **`temporary-prompt-quasar-rndxhgh`**.

Do not deploy current scissors `main` onto this project until the client agrees the marble look is back.

## D2 — Do not delete more Vercel projects

Do not recreate deleted `polesebarbershop`.

## D3 — Product copy on the restored look

- WhatsApp: **+39 351 252 3087**
- Maps: **Corso Dante 45**
- Opening: **7 settembre 2026**
- Booking: `/#prenota` and `/prenota`
