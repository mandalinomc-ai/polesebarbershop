-- Polese Barbershop appointments
create extension if not exists btree_gist;

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  status text not null check (status in ('confirmed', 'cancelled')),
  manage_token text not null unique,
  customer_first_name text not null,
  customer_last_name text not null,
  customer_email text not null,
  customer_phone text not null,
  barber_id text not null,
  service_ids text[] not null,
  service_names text not null,
  duration_minutes integer not null check (duration_minutes > 0),
  total_price numeric not null check (total_price >= 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reminder_sent_at timestamptz,
  qstash_message_id text,
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  constraint appointments_ends_after_start check (ends_at > starts_at)
);

alter table public.appointments drop constraint if exists appointments_no_overlap;
alter table public.appointments
  add constraint appointments_no_overlap
  exclude using gist (
    barber_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  )
  where (status = 'confirmed');

create index if not exists appointments_barber_starts_idx on public.appointments (barber_id, starts_at);
create index if not exists appointments_manage_token_idx on public.appointments (manage_token);

alter table public.appointments enable row level security;
revoke all on public.appointments from anon, authenticated;
grant all on public.appointments to service_role;
