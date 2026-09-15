-- Strip legacy +5 min chair buffer from active appointments.
-- Align taglio service durations to 30.
-- Safe/idempotent: only shortens ends_at when occupancy == duration_min + 5.

update public.services
set duration_min = 30
where id in ('taglio-pro', 'taglio-standard', 'taglio-bambino')
  and duration_min is distinct from 30;

update public.appointments a
set ends_at = a.starts_at + make_interval(mins => a.duration_min)
where a.status in ('pending', 'confirmed', 'walk_in')
  and a.ends_at > now()
  and a.ends_at = a.starts_at + make_interval(mins => a.duration_min + 5);

-- Taglio-only future bookings: force 30 min per taglio service, no buffer.
update public.appointments a
set
  duration_min = (cardinality(a.service_ids) * 30),
  ends_at = a.starts_at + make_interval(mins => cardinality(a.service_ids) * 30)
where a.status in ('pending', 'confirmed', 'walk_in')
  and a.ends_at > now()
  and a.service_ids is not null
  and cardinality(a.service_ids) > 0
  and a.service_ids <@ array['taglio-pro', 'taglio-standard', 'taglio-bambino']::text[];
