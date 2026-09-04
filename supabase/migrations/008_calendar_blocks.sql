-- Optional calendar blocks (pause / lunch / custom closed) for Felice Polese.
-- Empty by default in app config; this table lets gestionale persist real blocks later.
-- Do not invent a lunch break Felice never configured.

create table if not exists public.calendar_blocks (
  id uuid primary key default gen_random_uuid(),
  -- YYYY-MM-DD for one-off, or null when recurring by weekday
  block_date date null,
  -- 0=Sun … 6=Sat when block_date is null
  weekday smallint null check (weekday is null or (weekday >= 0 and weekday <= 6)),
  -- null = all chairs
  barber_id text null,
  start_time time not null,
  end_time time not null,
  kind text not null default 'custom'
    check (kind in ('pause', 'lunch', 'custom', 'closed')),
  label text null,
  created_at timestamptz not null default now(),
  constraint calendar_blocks_end_after_start check (end_time > start_time),
  constraint calendar_blocks_date_or_weekday check (
    (block_date is not null and weekday is null)
    or (block_date is null and weekday is not null)
  )
);

create index if not exists calendar_blocks_date_idx
  on public.calendar_blocks (block_date)
  where block_date is not null;

create index if not exists calendar_blocks_weekday_idx
  on public.calendar_blocks (weekday)
  where weekday is not null;

comment on table public.calendar_blocks is
  'Optional shop pauses/blocks. App uses CONFIG_CALENDAR_BLOCKS until rows are loaded.';
