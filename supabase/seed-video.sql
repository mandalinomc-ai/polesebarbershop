-- Seed FICTITIOUS data for reel recording only.
-- Apply against LOCAL/STAGING Supabase — never production.
-- Usage (local): supabase db reset   (after adding to supabase/config.toml seed)
-- Or: psql "$DATABASE_URL" -f supabase/seed-video.sql

-- Demo clients as appointments on a far-future open weekday (Tue)
-- so the agenda can show "Cliente Demo N" without touching real bookings.

insert into public.barbers (id, name, title, sort_order, active)
values ('felice', 'Felice', 'Master barber', 1, true)
on conflict (id) do update set active = true, name = excluded.name;

-- Core online-bookable services (ids match app catalog)
insert into public.services (
  id, name, description, category, duration_min, price_cents,
  price_max_cents, is_variable_price, active, sort_order
) values
  ('taglio-standard', 'Taglio Standard', 'Taglio capelli', 'capelli', 30, 1500, null, false, true, 20),
  ('barba-standard', 'Barba Standard', 'Rifinitura barba', 'barba', 15, 500, null, false, true, 50),
  ('barba-pro', 'Barba Pro', 'Barba completa', 'barba', 20, 1500, null, false, true, 40),
  ('acconciatura', 'Acconciatura', 'Piega e styling', 'capelli', 15, 500, null, false, true, 30)
on conflict (id) do update set
  name = excluded.name,
  duration_min = excluded.duration_min,
  price_cents = excluded.price_cents,
  active = true;

-- Clear only prior video-seed appointments (by email domain)
delete from public.appointments
where customer_email like '%@video-seed.local';

-- 4 fake clients on a Tuesday far ahead (Europe/Rome wall times → UTC+2 summer / +1 winter:
-- use noon UTC anchors so the civil date stays stable)
with days as (
  select (date_trunc('week', now() at time zone 'Europe/Rome') + interval '1 week' + interval '1 day')::date as d
)
insert into public.appointments (
  status, barber_id, service_ids, services_snapshot,
  customer_first_name, customer_last_name, customer_email, customer_phone,
  gdpr_consent_at, starts_at, ends_at, duration_min, price_cents,
  is_walk_in, source, notes
)
select
  'confirmed',
  'felice',
  array['taglio-standard'],
  '[{"id":"taglio-standard","name":"Taglio Standard","durationMin":30,"priceCents":1500}]'::jsonb,
  'Cliente',
  'Demo ' || n,
  'cliente.demo' || n || '@video-seed.local',
  '+39333000000' || n,
  now(),
  ((select d from days) + (time '10:00' + ((n - 1) * interval '30 minutes'))) at time zone 'Europe/Rome',
  ((select d from days) + (time '10:30' + ((n - 1) * interval '30 minutes'))) at time zone 'Europe/Rome',
  30,
  1500,
  false,
  'admin',
  'seed-video'
from generate_series(1, 4) as n;

-- Note: gestionale admin is env-based (ADMIN_USER / ADMIN_PASSWORD), not a DB row.
-- Set TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD in .env.video to match local .env.local.
