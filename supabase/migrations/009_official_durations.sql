-- Sync official Felice Polese listino durations (booking operational times).
-- Prices unchanged. All 10 services remain active with fixed durations.
-- Variable PRICE ranges stay; durations are fixed for slot calculation.

update public.services set
  name = 'Taglio Pro',
  description = 'Shampoo specifico per tipo di capello + Black Mask',
  category = 'capelli',
  duration_min = 50,
  price_cents = 2500,
  price_max_cents = null,
  is_variable_price = false,
  active = true,
  sort_order = 10
where id = 'taglio-pro';

update public.services set
  name = 'Taglio Standard',
  description = 'Taglio classico',
  category = 'capelli',
  duration_min = 30,
  price_cents = 1500,
  price_max_cents = null,
  is_variable_price = false,
  active = true,
  sort_order = 20
where id = 'taglio-standard';

update public.services set
  name = 'Acconciatura',
  description = 'Solo styling',
  category = 'capelli',
  duration_min = 15,
  price_cents = 500,
  price_max_cents = null,
  is_variable_price = false,
  active = true,
  sort_order = 30
where id = 'acconciatura';

update public.services set
  name = 'Taglio Bambino',
  description = 'Taglio per bambini',
  category = 'capelli',
  duration_min = 20,
  price_cents = 1000,
  price_max_cents = null,
  is_variable_price = false,
  active = true,
  sort_order = 25
where id = 'taglio-bambino';

update public.services set
  name = 'Barba Pro',
  description = 'Panno caldo con vaporizzatore + Oli con fragranze',
  category = 'barba',
  duration_min = 20,
  price_cents = 1500,
  price_max_cents = null,
  is_variable_price = false,
  active = true,
  sort_order = 40
where id = 'barba-pro';

update public.services set
  name = 'Barba Standard',
  description = 'Rifinitura / Modellatura classica',
  category = 'barba',
  duration_min = 15,
  price_cents = 500,
  price_max_cents = null,
  is_variable_price = false,
  active = true,
  sort_order = 50
where id = 'barba-standard';

update public.services set
  name = 'Decolorazione Meches',
  description = 'In base a lunghezza, tipo di capello e tempo',
  category = 'colore',
  duration_min = 90,
  price_cents = 4000,
  price_max_cents = 10000,
  is_variable_price = true,
  active = true,
  sort_order = 60
where id = 'decolorazione-meches';

update public.services set
  name = 'Decolorazione Cutanea',
  description = 'In base a lunghezza e tipo di capello',
  category = 'colore',
  duration_min = 120,
  price_cents = 5000,
  price_max_cents = 12000,
  is_variable_price = true,
  active = true,
  sort_order = 70
where id = 'decolorazione-cutanea';

update public.services set
  name = 'Tintura Capelli',
  description = 'Colore capelli',
  category = 'colore',
  duration_min = 60,
  price_cents = 1000,
  price_max_cents = 3000,
  is_variable_price = true,
  active = true,
  sort_order = 80
where id = 'tintura-capelli';

update public.services set
  name = 'Tintura Barba',
  description = 'Colore barba',
  category = 'colore',
  duration_min = 15,
  price_cents = 500,
  price_max_cents = 1500,
  is_variable_price = true,
  active = true,
  sort_order = 90
where id = 'tintura-barba';

-- Keep techniques inactive
update public.services
set active = false
where id in (
  'razor-taper',
  'skin-fade',
  'combo-classico',
  'combo-sartoriale',
  'consulenza-sede',
  'taglio-sartoriale'
);
