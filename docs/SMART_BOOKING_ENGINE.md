# Smart Booking Engine v2 — Felice Polese

Single calendar for the public site and gestionale (same Supabase `appointments` table).
**Scope:** Felice Polese only (`felicepolesebarbershop`). Do not deploy to `polesebarbershop` / Eugenio.

## 1. Source of truth

| Data | Source |
|------|--------|
| Services, prices, durations | `lib/catalog.ts` → `SERVICES` |
| Shop hours | `lib/catalog.ts` → `SHOP_HOURS` (Sunday closed) |
| Barbers | `lib/catalog.ts` → `BARBERS` (Felice, Davide, anyone) |
| Existing bookings | Supabase `appointments` via `lib/appointments.ts` |
| Timezone | `Europe/Rome` |
| Engine | `lib/booking/*` + `lib/availability.ts` |

## 2. Three distinct time concepts

| Constant | Role |
|----------|------|
| **SERVICE_DURATION** | Catalog `durationMin` (client-visible). Multi-service = sum. |
| **BUFFER** (`BOOKING_BUFFER_MINUTES = 5`) | Internal chair occupancy after service. Hidden from client emails/ICS. |
| **TIME_SLOT_INTERVAL** (`TIME_SLOT_INTERVAL_MINUTES = 5`) | Search/display step **inside** free windows only. Does **not** round free-window starts. |

Online UI also uses `ONLINE_DISPLAY_INTERVAL_MINUTES = 15` to thin candidates (always keeps continuous free-window starts).

## 3. Free-windows pipeline (not primary 5-min grid)

```
SHOP_HOURS → working windows
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
| `REGULAR` | All search-interval starts in free windows |
| `REDUCE_GAPS` (default) | Prefer packing from free-window start; rank OPTIMAL/VALID higher |
| `ELIMINATE_GAPS` | Only left-aligned starts that leave no unusable leftover |

Modes **rank/filter** candidates; they never invent unavailability.

## 4. Ranking: POSSIBLE → VALID → OPTIMAL

- **POSSIBLE** — fits service+buffer in a free window  
- **VALID** — also packs reasonably (e.g. left-aligned or perfect fit)  
- **OPTIMAL** — best under current mode (gap-reducing / eliminate)

## 5. durationOverride

- Column: `appointments.duration_override_min` (migration `007_duration_override.sql`)
- Catalog listino **unchanged**
- Occupancy / `ends_at` use `effectiveServiceDurationMin(catalog, override)`
- Gestionale walk-in / move can set override

## 6. Services without known duration

- `durationKnown: false` → **blocked online** (site + `/api/availability` + `/api/bookings`)
- No invented defaults
- Gestionale flags “durata n/d” and requires override for occupancy when needed

## 7. Same engine: site + gestionale

| Surface | Entry |
|---------|--------|
| Online | `/api/availability` → smart thinned free-window starts |
| Booking POST | revalidate with full-search free windows; 409 on conflict |
| Gestionale | `/api/admin/find-slot` (TROVA ORARIO / PRIMA DISPONIBILITÀ), walk-in, move |

## 8. Gestionale UX (familiar)

- Keep existing GestionalePanel look
- **Trova orario** / **Prima disponibilità** / **Smart move**
- Duration override on create/edit
- Move conflict → message + clickable alternatives
- Force conflict only with explicit `confirm` (`force` + `confirmForce`)
- Mobile: tap + quick actions (no drag-drop)

## 9. Tests

See `lib/booking/engine.test.ts` and free-windows coverage:

- NO 5-MINUTE BUG (continuous next start)
- duration override occupancy
- move frees old / occupies new
- free windows fitting
- multi-service, buffer, barbers, cancelled, double booking

## 10. Keep unchanged

Gmail SMTP, Maps Corso Dante **44**, WhatsApp, scissors intro, Taglio Pro **25€/50min**, Taglio Bambino **10€**, prices, videos.
