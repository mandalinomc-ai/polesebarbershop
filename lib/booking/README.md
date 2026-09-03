# Smart Booking Engine — source of truth

Single calendar for the public site and gestionale (same Supabase `appointments` table).

| Data | Source |
|------|--------|
| Services, prices, durations | `lib/catalog.ts` → `SERVICES` |
| Shop hours / pauses | `lib/catalog.ts` → `SHOP_HOURS` (Sunday closed) |
| Barbers | `lib/catalog.ts` → `BARBERS` (Felice, Davide, anyone) |
| Existing bookings | Supabase `appointments` via `lib/appointments.ts` |
| Timezone | `Europe/Rome` (`lib/site-config.ts` → `TIMEZONE`) |

## Pipeline

```
services → sum(durationMin) → + BOOKING_BUFFER_MINUTES (5, internal)
→ barber resources → real busy intervals (non-cancelled)
→ open hours → candidate starts every SLOT_INTERVAL_MINUTES (5)
→ available starts for the client
```

- **Client-facing end** = start + service duration only (e.g. Taglio Pro 50 min).
- **Chair block end** = start + service duration + 5 min buffer (stored in `ends_at`).
- Intervals are semi-open `[start, end)`; overlaps via centralized `overlaps()`.
- One appointments fetch, then in-memory slot math (no query per slot).
- If Supabase / appointments are unavailable → no unverified slots; show retry.
