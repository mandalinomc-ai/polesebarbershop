-- Sync NEW official Felice Polese booking durations (2026-09).
-- Prices unchanged. Color variants (nero/castano ecc.) share these service durations.
-- Public label remains "Durata prevista: X min". All stay durationKnown / fixed for slots.

update public.services set duration_min = 10 where id = 'acconciatura';
update public.services set duration_min = 20 where id = 'taglio-bambino';
update public.services set duration_min = 150 where id = 'decolorazione-meches';
update public.services set duration_min = 180 where id = 'decolorazione-cutanea';
update public.services set duration_min = 30 where id = 'tintura-capelli';
update public.services set duration_min = 20 where id = 'tintura-barba';

-- Unchanged (explicit keep for clarity):
-- taglio-pro 50, taglio-standard 30, barba-pro 20, barba-standard 15
