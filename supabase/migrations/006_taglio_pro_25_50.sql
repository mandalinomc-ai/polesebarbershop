-- User correction: Taglio Pro = 25 € / 50 minutes (not 50 € / 25 min).

update public.services set
  duration_min = 50,
  price_cents = 2500
where id = 'taglio-pro';
