-- duration_override_min: optional per-appointment occupancy duration.
-- Catalog service durations stay unchanged; chair block uses override when set.
alter table public.appointments
  add column if not exists duration_override_min integer
  check (duration_override_min is null or duration_override_min > 0);

comment on column public.appointments.duration_override_min is
  'Optional service-duration override for occupancy (minutes). Catalog listino unchanged.';
