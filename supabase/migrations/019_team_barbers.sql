-- Ensure barbers table can store extra staff added from gestionale.
-- Seed Felice if missing; keep Davide archived if present.

insert into public.barbers (id, name, title, active, sort_order)
values ('felice', 'Felice', 'Master barber', true, 1)
on conflict (id) do update set active = true;

update public.barbers
set active = false,
    title = coalesce(nullif(title, ''), 'Archiviato')
where id = 'davide' and active = true;
