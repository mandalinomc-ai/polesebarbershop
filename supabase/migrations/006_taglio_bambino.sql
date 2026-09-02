-- Official listino: add Taglio Bambino, fix Barba Standard duration.
insert into public.services (id, name, description, category, duration_min, price_cents, price_max_cents, is_variable_price, sort_order, active)
values (
  'taglio-bambino',
  'Taglio Bambino',
  'Taglio dedicato ai più piccoli',
  'capelli',
  20,
  1200,
  null,
  false,
  25,
  true
)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  duration_min = excluded.duration_min,
  price_cents = excluded.price_cents,
  price_max_cents = excluded.price_max_cents,
  is_variable_price = excluded.is_variable_price,
  sort_order = excluded.sort_order,
  active = true;

update public.services set
  duration_min = 10,
  active = true
where id = 'barba-standard';

update public.services set
  duration_min = 15,
  active = true
where id = 'acconciatura';
