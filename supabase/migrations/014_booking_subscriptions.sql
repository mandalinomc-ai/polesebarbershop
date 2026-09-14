-- Fixed-cadence client subscriptions (abbonamenti) for gestionale.
-- One subscription = weekday + time + barber + services; occurrences are normal appointments.

create table if not exists public.booking_subscriptions (
  id uuid primary key default gen_random_uuid(),
  active boolean not null default true,
  customer_first_name text not null,
  customer_last_name text not null default '',
  customer_phone text not null default '',
  customer_email text not null default '',
  barber_id text not null references public.barbers(id),
  service_ids text[] not null,
  services_snapshot jsonb not null default '[]'::jsonb,
  -- 0=Sun … 6=Sat (JS getDay)
  weekday smallint not null check (weekday >= 0 and weekday <= 6),
  start_time time not null,
  duration_min integer not null check (duration_min > 0),
  duration_override_min integer null,
  price_cents integer not null default 0 check (price_cents >= 0),
  starts_on date not null,
  ends_on date not null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_subscriptions_end_after_start check (ends_on >= starts_on)
);

create index if not exists booking_subscriptions_active_idx
  on public.booking_subscriptions (active, weekday);

alter table public.appointments
  add column if not exists subscription_id uuid null references public.booking_subscriptions(id) on delete set null;

create index if not exists appointments_subscription_id_idx
  on public.appointments (subscription_id)
  where subscription_id is not null;

drop trigger if exists booking_subscriptions_set_updated_at on public.booking_subscriptions;
create trigger booking_subscriptions_set_updated_at before update on public.booking_subscriptions
  for each row execute function public.set_updated_at();

alter table public.booking_subscriptions enable row level security;
revoke all on public.booking_subscriptions from anon, authenticated;
grant all on public.booking_subscriptions to service_role;

comment on table public.booking_subscriptions is
  'Cadenza fissa cliente (giorno+ora). Le occorrenze sono righe appointments con subscription_id.';
