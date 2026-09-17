-- Solo Felice: archive Davide, move appointments, cap conflict rows as pending (da confermare).
-- Pending may overlap confirmed so staff can see conflicts on Felice's chair.

alter table public.appointments drop constraint if exists appointments_no_overlap;
alter table public.appointments add constraint appointments_no_overlap
  exclude using gist (barber_id with =, tstzrange(starts_at, ends_at, '[)') with &&)
  where (status in ('confirmed', 'walk_in', 'completed'));

-- Free moves: no overlap with Felice blocking rows.
update public.appointments d
set barber_id = 'felice',
    updated_at = now()
where d.barber_id = 'davide'
  and d.status in ('pending', 'confirmed', 'walk_in', 'completed')
  and not exists (
    select 1
    from public.appointments f
    where f.barber_id = 'felice'
      and f.id <> d.id
      and f.status in ('pending', 'confirmed', 'walk_in', 'completed')
      and tstzrange(f.starts_at, f.ends_at, '[)') && tstzrange(d.starts_at, d.ends_at, '[)')
  );

-- Conflicts → Felice as pending (da confermare).
update public.appointments d
set barber_id = 'felice',
    status = 'pending',
    notes = nullif(
      trim(both E'\n' from concat_ws(
        E'\n',
        nullif(trim(d.notes), ''),
        '[Da confermare: ex Davide — orario già occupato da Felice]'
      )),
      ''
    ),
    updated_at = now()
where d.barber_id = 'davide'
  and d.status in ('pending', 'confirmed', 'walk_in', 'completed');

-- Leftovers (cancelled etc.)
update public.appointments
set barber_id = 'felice', updated_at = now()
where barber_id = 'davide';

update public.booking_subscriptions
set barber_id = 'felice'
where barber_id = 'davide';

update public.calendar_blocks
set barber_id = 'felice'
where barber_id = 'davide';

update public.barbers
set active = false,
    title = 'Archiviato',
    name = 'Davide'
where id = 'davide';
