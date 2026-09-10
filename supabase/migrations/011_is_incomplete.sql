-- Flag walk-in / CRM sheets missing phone (and email). Additive; safe for live bookings.
alter table public.appointments
  add column if not exists is_incomplete boolean not null default false;

create index if not exists appointments_is_incomplete_idx
  on public.appointments (is_incomplete)
  where is_incomplete = true;
