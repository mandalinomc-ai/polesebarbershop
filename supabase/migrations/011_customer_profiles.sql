-- Optional CRM profiles for clients without appointments yet (and contact overrides).
create table if not exists public.customer_profiles (
  client_key text primary key,
  first_name text not null default '',
  last_name text not null default '',
  phone text not null default '',
  email text not null default '',
  updated_at timestamptz not null default now()
);

drop trigger if exists customer_profiles_set_updated_at on public.customer_profiles;
create trigger customer_profiles_set_updated_at before update on public.customer_profiles
  for each row execute function public.set_updated_at();

alter table public.customer_profiles enable row level security;
revoke all on public.customer_profiles from anon, authenticated;
grant all on public.customer_profiles to service_role;
