# Smart Booking Engine — source of truth

See **[docs/SMART_BOOKING_ENGINE.md](../../docs/SMART_BOOKING_ENGINE.md)** for the full Free Windows v2 spec.

## Quick pipeline

```
SHOP_HOURS → free windows − busy(ends_at)
→ FIT service + BOOKING_BUFFER_MINUTES
→ candidates (continuous start, then TIME_SLOT_INTERVAL)
→ rank POSSIBLE → VALID → OPTIMAL (default REDUCE_GAPS)
```

| Concept | Constant |
|---------|----------|
| Service duration | catalog `durationMin` (+ optional `duration_override_min`) |
| Buffer | `BOOKING_BUFFER_MINUTES = 5` |
| Search step | `TIME_SLOT_INTERVAL_MINUTES = 5` (not a forced grid snap) |

Client-facing end = start + service only. Chair `ends_at` = start + service + buffer.
