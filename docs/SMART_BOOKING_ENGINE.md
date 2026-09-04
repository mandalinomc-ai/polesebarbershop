# Smart Booking Engine v3 — Felice Polese

Single calendar for the public site and gestionale (same Supabase `appointments` table).
**Scope:** Felice Polese only (`felicepolesebarbershop`). Do not deploy to `polesebarbershop` / Eugenio.

## 1. Source of truth

| Data | Source |
|------|--------|
| Services, prices, durations | `lib/catalog.ts` → `SERVICES` |
| Shop hours | `lib/catalog.ts` → `SHOP_HOURS` (Sunday closed) |
| Barbers | `lib/catalog.ts` → `BARBERS` (Felice, Davide, anyone) |
| Existing bookings | Supabase `appointments` via `lib/appointments.ts` |
| Optional calendar blocks | `lib/booking/calendar-blocks.ts` + migration `008` (empty until configured) |
| Timezone | `Europe/Rome` |
| Engine | `lib/booking/*` + `lib/availability.ts` |

## 2. Three distinct time concepts

| Constant | Role |
|----------|------|
| **SERVICE_DURATION** | From `resolveEffectiveServiceDuration()` — override, processing config, or known catalog sum. Never invented. |
| **BUFFER** (`BOOKING_BUFFER_MINUTES = 5`) | Internal chair occupancy after service. Hidden from client emails/ICS. |
| **TIME_SLOT_INTERVAL** (`TIME_SLOT_INTERVAL_MINUTES = 5`) | Search/display step **inside** free windows only. Does **not** round free-window starts. |

Online UI also uses `ONLINE_DISPLAY_INTERVAL_MINUTES = 15` to thin candidates (always keeps continuous free-window starts).

## 3. Free-windows pipeline (not primary 5-min grid)

```
SHOP_HOURS → working windows
  − calendar blocks (only when configured)
  − real appointments (ends_at already includes buffer occupancy)
  = free windows (continuous, minute-precise)
  → FIT (serviceDuration + buffer) into each free window
  → candidate starts: window.start, then + TIME_SLOT_INTERVAL
  → rank POSSIBLE → VALID → OPTIMAL
  → online: smart thinned starts | gestionale: full search
```

### Continuous calendar (NO 5-MINUTE BUG)

If occupancy ends at **09:42** (e.g. service ended 09:37 + 5 buffer already in `ends_at`), the next free start is **09:42** — never forced to **09:45**.

### Optimization modes (internal default)

Configured as `DEFAULT_OPTIMIZATION_MODE = REDUCE_GAPS` (no confusing Felice UI toggle).

| Mode | Behavior |
|------|----------|
| `FLEXIBLE` | All search-interval starts in free windows (`REGULAR` is a deprecated alias) |
| `REDUCE_GAPS` (default) | Prefer packing from free-window start; rank OPTIMAL/VALID higher; online hides weak POSSIBLE micro-slots |
| `ELIMINATE_GAPS` | Only left-aligned starts that leave no unusable leftover |

Modes **rank/filter** candidates; they never invent unavailability.

## 4. Ranking: POSSIBLE → VALID → OPTIMAL

- **POSSIBLE** — fits service+buffer in a free window  
- **VALID** — also packs reasonably (e.g. left-aligned or perfect fit)  
- **OPTIMAL** — best under current mode (gap-reducing / eliminate)

**Trova migliore** (`findBestAvailability` / find-slot `mode=best`) picks OPTIMAL → VALID → POSSIBLE.
**RIEMPI BUCO** (`suggestFillGaps`) is an internal gestionale hint for tight holes — not a public UI feature.

## 5. resolveEffectiveServiceDuration

Priority (no invented defaults):

1. Positive `durationOverrideMin` (gestionale assisted)
2. Configured `processing` on a **single** service (prep + process + finish)
3. Sum of catalog `durationMin` when every service has `durationKnown`
4. Otherwise not determinable → **block online**; gestionale needs override

Kinds: `fixed` | `variable` | `assisted` | `unknown`.

## 6. durationOverride

- Column: `appointments.duration_override_min` (migration `007_duration_override.sql`)
- Catalog listino **unchanged**
- Occupancy / `ends_at` use effective duration (override wins)
- Gestionale walk-in / move / Trova orario can set override

## 7. Processing / blocked / extra servicing

- Optional `Service.processing` (`servicingBeforeMin` → `processingMin` → `servicingAfterMin`)
- Only when **real minutes are configured** — never invent tinture/colore defaults
- `barberFreeDuringProcessing`: mid segment omitted from barber-busy segments (helpers in `lib/booking/processing.ts`)
- Calendar blocks (pause/lunch/custom): config-first empty list; DB table `calendar_blocks` (008) ready when Felice defines pauses

## 8. Services without known duration

- `durationKnown: false` → **blocked online** (site + `/api/availability` + `/api/bookings`)
- No invented defaults
- Gestionale flags “durata n/d” and requires override for occupancy when needed

## 9. Same engine: site + gestionale

| Surface | Entry |
|---------|--------|
| Online | `/api/availability` → smart thinned free-window starts |
| Booking POST | revalidate with **full-search** free windows; 409 on conflict |
| Gestionale | `/api/admin/find-slot` — Trova orario / **Trova migliore** / Prima disponibilità; walk-in; move |

Smart assignment for `anyone`: least-loaded real barber among free chairs at that label.

## 10. Gestionale UX (familiar)

- Keep existing GestionalePanel look
- **Trova orario** / **Trova migliore** / **Prima disponibilità** / Smart move
- Duration override on create/edit
- Move conflict → message + clickable alternatives
- Force conflict only with explicit `confirm` (`force` + `confirmForce`)
- Mobile: tap + quick actions (no drag-drop)

## 11. Tests

See `lib/booking/engine.test.ts`:

- NO 5-MINUTE BUG (continuous next start)
- `resolveEffectiveServiceDuration` (catalog / override / processing / unknown)
- FLEXIBLE \| REDUCE_GAPS \| ELIMINATE_GAPS
- Processing busy segments + calendar blocks
- Trova migliore + RIEMPI BUCO
- duration override occupancy, move frees old / occupies new
- multi-service, buffer, barbers, cancelled, double booking

## 12. Keep unchanged

Gmail SMTP, Maps Corso Dante **44**, WhatsApp, scissors intro, Taglio Pro **25€/50min**, Taglio Bambino **10€**, prices, videos.
