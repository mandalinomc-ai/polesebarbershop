-- Additive CRM indexes on appointments. Does not change 001_schema.
-- Anagrafica clienti e stats restano derivate da appointments (inclusi cancelled).
create index if not exists appointments_customer_phone_idx on public.appointments (customer_phone);
create index if not exists appointments_customer_email_idx on public.appointments (customer_email);
create index if not exists appointments_starts_at_desc_idx on public.appointments (starts_at desc);
