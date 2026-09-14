-- Soft-exclude appointments from revenue / stats without deleting the row.
-- Additive only — existing data stays intact (default false).

alter table public.appointments
  add column if not exists exclude_from_stats boolean not null default false;

create index if not exists appointments_exclude_from_stats_idx
  on public.appointments (exclude_from_stats)
  where exclude_from_stats = true;

comment on column public.appointments.exclude_from_stats is
  'When true, appointment is hidden from gestionale revenue KPIs (soft delete statistico).';
