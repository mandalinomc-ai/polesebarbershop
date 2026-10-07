# Instagram Reel demo — Felice Polese (free, local)

Slow Playwright automation that records a **vertical 1080×1920** walkthrough:

1. Public homepage (smooth scroll)
2. Booking wizard with **mock** customer only (`Mario Rossi`)
3. Gestionale **Agenda** only (money / Clienti / Statistiche hidden or blurred)

No paid tools. Uses [Playwright](https://playwright.dev/) video recording (WebM). Optional free MP4 convert with `ffmpeg`.

## Privacy rules (built-in)

| Rule | How |
|------|-----|
| No real clients | Form uses `Mario Rossi` / `mario.test@email.it` / `3331234567` |
| No credentials on camera | Login once via `npm run auth` → saved session `.auth/gestionale.json` |
| No revenue on camera | Privacy CSS blurs “Incasso” / € and hides Clienti·Statistiche·Dashboard tabs |
| Cleanup | Demo booking is cancelled via API at the end (`CLEANUP_BOOKING=1`) |

**Never commit** `.env`, `.auth/`, or `output/`.

## Requirements

- Node.js 20+
- ~400 MB disk for Chromium (one-time Playwright download)
- Optional: [ffmpeg](https://ffmpeg.org/) for MP4

## Setup (once)

```bash
cd scripts/reel-demo
cp .env.example .env
```

Edit `.env`:

```env
BASE_URL=https://felicepolesebarbershop.it
ADMIN_USER=admin
ADMIN_PASSWORD=your-gestionale-password
CLEANUP_BOOKING=1
```

Install (free):

```bash
npm install
```

Save gestionale session **without filming the password**:

```bash
npm run auth
```

## Record the Reel

```bash
npm run record
```

Output:

```text
scripts/reel-demo/output/felice-polese-reel.webm
```

### Optional: WebM → MP4 (Instagram-friendly)

```bash
ffmpeg -i output/felice-polese-reel.webm \
  -c:v libx264 -pix_fmt yuv420p -movflags +faststart \
  output/felice-polese-reel.mp4
```

Upload the MP4/WebM to Instagram Reels (trim length in the Instagram editor if needed — Reels prefer ~15–90s; re-run with faster pauses by editing `sleep(...)` / `durationMs` in the script if the cut is too long).

## Local site instead of production

```env
BASE_URL=http://127.0.0.1:3000
```

Run the Next app in another terminal (`npm run dev` from repo root), then `npm run auth` + `npm run record` here.

## Skip creating a booking

Useful if you only want home + empty Agenda:

```env
SKIP_BOOKING=1
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `Missing .auth/gestionale.json` | `npm run auth` with correct `.env` password |
| Booking button stays disabled | Site may have no open slots; try another day or `SKIP_BOOKING=1` |
| Gestionale shows login during record | Auth expired — run `npm run auth` again |
| Video path odd | Playwright writes a temp name then renames to `felice-polese-reel.webm` |

## Files

| File | Role |
|------|------|
| `record-instagram-reel.mjs` | Main slow demo + video |
| `save-auth.mjs` | Off-camera login → storage state |
| `lib/helpers.mjs` | Smooth scroll, human typing, privacy mask |
| `.env.example` | Template (no secrets) |
