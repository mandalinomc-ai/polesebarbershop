# Media checklist — nuovo cliente

Copia i file del cliente in `public/` con questi nomi (o aggiorna i path in `lib/site-videos.ts` / `lib/salon-photos.ts` / `lib/products.ts`).

## Obbligatori

- [ ] `public/assets/images/logo.png`
- [ ] `public/assets/images/logo-512.png`
- [ ] `public/assets/images/og-cover.png`

## Consigliati

- [ ] `public/assets/images/marble.png` (texture sfondo)
- [ ] `public/assets/images/salone/*.jpg` (locale, utensili, logo muro, targhetta)
- [ ] `public/assets/images/services/*.jpg` (servizi senza video)
- [ ] `public/assets/images/products/*.jpg`
- [ ] `public/assets/images/qr/{instagram,whatsapp,prenota}.png`
- [ ] `public/assets/video/taglio-01.mp4` … `taglio-03.mp4`
- [ ] `public/assets/video/colorazione-01.mp4` … `colorazione-03.mp4`
- [ ] `public/assets/video/salone-generale.mp4`
- [ ] `public/assets/video/<bio-barbiere>.mp4` (rinomina + aggiorna `lib/site-videos.ts`)

## Formati

- Foto: JPEG/WebP, lato lungo ≤ 1600px, qualità web ~75–85
- Video: MP4 H.264, 9:16 o 16:9, preferibilmente < 5 MB ciascuno
- Logo: PNG trasparente se possibile

## Manifest

Aggiorna anche `public/site.webmanifest` con nome / short_name / description del cliente.
