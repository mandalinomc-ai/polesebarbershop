-- Tagli all 30 min; no operational buffer padding in catalog.
-- Apply in Supabase SQL Editor (additive only).

update public.services
set duration_min = 30
where id in ('taglio-pro', 'taglio-standard', 'taglio-bambino');
