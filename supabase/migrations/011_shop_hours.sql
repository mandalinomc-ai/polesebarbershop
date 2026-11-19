-- Shop opening hours + lunch break, editable from gestionale.
-- Defaults match current SHOP_HOURS / CONFIG lunch (13:00–14:00 on open weekdays).

create table if not exists public.shop_hours (
  weekday smallint primary key check (weekday >= 0 and weekday <= 6),
  is_closed boolean not null default false,
  open_time time null,
  close_time time null,
  lunch_enabled boolean not null default false,
  lunch_start time null,
  lunch_end time null,
  updated_at timestamptz not null default now(),
  constraint shop_hours_open_close check (
    is_closed
    or (open_time is not null and close_time is not null and close_time > open_time)
  ),
  constraint shop_hours_lunch check (
    not lunch_enabled
    or (
      lunch_start is not null
      and lunch_end is not null
      and lunch_end > lunch_start
    )
  )
);

comment on table public.shop_hours is
  'Per-weekday salon open/close + optional lunch. Public booking and site hours read this.';

insert into public.shop_hours (
  weekday, is_closed, open_time, close_time, lunch_enabled, lunch_start, lunch_end
) values
  (0, true,  null, null, false, null, null),
  (1, false, '15:00', '19:00', false, null, null),
  (2, false, '09:00', '19:00', true, '13:00', '14:00'),
  (3, false, '09:00', '19:00', true, '13:00', '14:00'),
  (4, false, '09:00', '20:00', true, '13:00', '14:00'),
  (5, false, '09:00', '20:00', true, '13:00', '14:00'),
  (6, false, '09:00', '20:00', true, '13:00', '14:00')
on conflict (weekday) do nothing;
