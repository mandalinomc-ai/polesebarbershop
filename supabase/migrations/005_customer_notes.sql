-- CRM client notes keyed by phone/email hash (matches lib/crm clientKey logic).
create table if not exists public.customer_notes (
  client_key text primary key,
  notes text not null default '',
  updated_at timestamptz not null default now()
);

drop trigger if exists customer_notes_set_updated_at on public.customer_notes;
create trigger customer_notes_set_updated_at before update on public.customer_notes
  for each row execute function public.set_updated_at();

alter table public.customer_notes enable row level security;
revoke all on public.customer_notes from anon, authenticated;
grant all on public.customer_notes to service_role;
