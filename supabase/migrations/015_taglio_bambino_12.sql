-- Taglio Bambino listino: 12€ (was 10€)
update public.services
set price_cents = 1200,
    price_max_cents = null,
    is_variable_price = false
where id = 'taglio-bambino';
