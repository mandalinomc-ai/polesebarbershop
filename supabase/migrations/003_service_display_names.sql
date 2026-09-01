-- Simple Italian display names (IDs unchanged for bookings/CRM)
update public.services set name = 'Taglio completo', description = 'Taglio con shampoo e maschera' where id = 'taglio-pro';
update public.services set name = 'Taglio classico', description = 'Taglio capelli' where id = 'taglio-standard';
update public.services set description = 'Piega e styling' where id = 'acconciatura';
update public.services set name = 'Barba completa', description = 'Barba con panno caldo' where id = 'barba-pro';
update public.services set name = 'Rifinitura barba', description = 'Rifinitura e modellatura' where id = 'barba-standard';
update public.services set name = 'Meches', description = 'Colpi di sole e schiariture. Prezzo in salone.' where id = 'decolorazione-meches';
update public.services set name = 'Decolorazione', description = 'Decolorazione completa. Prezzo in salone.' where id = 'decolorazione-cutanea';
update public.services set name = 'Tintura capelli', description = 'Colore capelli. Prezzo in salone.' where id = 'tintura-capelli';
update public.services set name = 'Tintura barba', description = 'Colore barba. Prezzo in salone.' where id = 'tintura-barba';
