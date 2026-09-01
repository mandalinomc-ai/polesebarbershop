-- Polese Barbershop — UNICO schema (barbers, services, appointments + RLS).
-- Sostituisce eventuali vecchie 001_appointments.sql. Nessun Twilio/QStash.
create extension if not exists pgcrypto;
create extension if not exists btree_gist;

create table if not exists public.barbers (
  id text primary key,
  name text not null,
  title text not null default '',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.services (
  id text primary key,
  name text not null,
  description text not null default '',
  category text not null check (category in ('capelli', 'barba', 'colore')),
  duration_min integer not null check (duration_min > 0),
  price_cents integer not null check (price_cents >= 0),
  price_max_cents integer,
  is_variable_price boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 0
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'confirmed' check (status in ('pending','confirmed','cancelled','completed','walk_in')),
  manage_token text not null unique default encode(gen_random_bytes(24), 'hex'),
  barber_id text not null references public.barbers(id),
  service_ids text[] not null,
  services_snapshot jsonb not null,
  customer_first_name text not null,
  customer_last_name text not null,
  customer_email text not null default '',
  customer_phone text not null default '',
  gdpr_consent_at timestamptz,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  duration_min integer not null check (duration_min > 0),
  price_cents integer not null check (price_cents >= 0),
  is_walk_in boolean not null default false,
  notes text,
  source text not null default 'online' check (source in ('online','walk_in','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cancelled_at timestamptz,
  constraint appointments_ends_after_start check (ends_at > starts_at)
);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists appointments_set_updated_at on public.appointments;
create trigger appointments_set_updated_at before update on public.appointments
  for each row execute function public.set_updated_at();

alter table public.appointments drop constraint if exists appointments_no_overlap;
alter table public.appointments add constraint appointments_no_overlap
  exclude using gist (barber_id with =, tstzrange(starts_at, ends_at, '[)') with &&)
  where (status in ('pending','confirmed','walk_in','completed'));

create index if not exists appointments_barber_starts_idx on public.appointments (barber_id, starts_at);
create index if not exists appointments_manage_token_idx on public.appointments (manage_token);

insert into public.barbers (id, name, title, sort_order) values
  ('felice','Felice','Master barber',1),
  ('davide','Davide','Barber',2)
on conflict (id) do update set name = excluded.name, title = excluded.title, active = true;

insert into public.services (id, name, description, category, duration_min, price_cents, price_max_cents, is_variable_price, sort_order) values
  ('taglio-pro','Taglio completo','Taglio con shampoo e maschera','capelli',25,5000,null,false,10),
  ('taglio-standard','Taglio classico','Taglio capelli','capelli',30,1500,null,false,20),
  ('acconciatura','Acconciatura','Piega e styling','capelli',15,500,null,false,30),
  ('barba-pro','Barba completa','Barba con panno caldo','barba',20,1500,null,false,40),
  ('barba-standard','Rifinitura barba','Rifinitura e modellatura','barba',15,500,null,false,50),
  ('decolorazione-meches','Meches','Colpi di sole e schiariture. Prezzo in salone.','colore',45,4000,10000,true,60),
  ('decolorazione-cutanea','Decolorazione','Decolorazione completa. Prezzo in salone.','colore',45,5000,12000,true,70),
  ('tintura-capelli','Tintura capelli','Colore capelli. Prezzo in salone.','colore',30,1000,3000,true,80),
  ('tintura-barba','Tintura barba','Colore barba. Prezzo in salone.','colore',20,500,1500,true,90)
on conflict (id) do update set
  name = excluded.name, description = excluded.description, category = excluded.category,
  duration_min = excluded.duration_min, price_cents = excluded.price_cents,
  price_max_cents = excluded.price_max_cents, is_variable_price = excluded.is_variable_price, active = true;

alter table public.barbers enable row level security;
alter table public.services enable row level security;
alter table public.appointments enable row level security;

revoke all on public.barbers from anon, authenticated;
revoke all on public.services from anon, authenticated;
revoke all on public.appointments from anon, authenticated;
grant select on public.barbers to anon, authenticated;
grant select on public.services to anon, authenticated;
grant select, update on public.appointments to anon, authenticated;
grant all on public.barbers, public.services, public.appointments to service_role;

drop policy if exists barbers_public_read on public.barbers;
create policy barbers_public_read on public.barbers for select using (active = true);
drop policy if exists services_public_read on public.services;
create policy services_public_read on public.services for select using (active = true);

create or replace function public.request_manage_token() returns text language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true)::json ->> 'manage_token', ''),
    nullif(current_setting('request.headers', true)::json ->> 'x-manage-token', '')
  );
$$;

drop policy if exists appointments_select_own on public.appointments;
create policy appointments_select_own on public.appointments for select
  using (manage_token = public.request_manage_token());
drop policy if exists appointments_update_own on public.appointments;
create policy appointments_update_own on public.appointments for update
  using (manage_token = public.request_manage_token())
  with check (manage_token = public.request_manage_token());

create or replace function public.get_appointment_by_token(p_token text)
returns setof public.appointments language sql stable security definer set search_path = public as $$
  select * from public.appointments where manage_token = p_token;
$$;

create or replace function public.cancel_appointment_by_token(p_token text)
returns public.appointments language plpgsql security definer set search_path = public as $$
declare appt public.appointments;
begin
  if p_token is null or length(trim(p_token)) < 16 then raise exception 'Token non valido'; end if;
  update public.appointments set status = 'cancelled', cancelled_at = now()
  where manage_token = p_token and status in ('pending','confirmed') and starts_at > now() + interval '1 hour'
  returning * into appt;
  if appt is null then raise exception 'Appuntamento non trovato o non cancellabile (disdetta almeno 1 ora prima)'; end if;
  return appt;
end;
$$;

grant execute on function public.get_appointment_by_token(text) to anon, authenticated, service_role;
grant execute on function public.cancel_appointment_by_token(text) to anon, authenticated, service_role;
