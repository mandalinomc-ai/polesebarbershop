# Rimuovere `*.vercel.app` da Google (Felice Polese)

**Sito ufficiale (unico):** https://felicepolesebarbershop.it  
**Gestionale:** https://felicepolesebarbershop.it/gestionale/  

L’URL `https://felicepolesebarbershop.vercel.app` è un vecchio mirror Vercel. Non va usato dai clienti.

## Blocco tecnico (già in codice)

Su host non-`.it` (es. `felicepolesebarbershop.vercel.app`):

1. **308 permanente** di quasi tutte le path verso `https://felicepolesebarbershop.it…`
2. Header **`X-Robots-Tag: noindex, nofollow`**
3. **`robots.txt`** → `Disallow: /` (nessuna sitemap)
4. Meta robots **noindex** se mai venisse renderizzata una pagina
5. `vercel.json` → redirect edge host-condizionati verso `.it`

Dopo il deploy di queste regole su Vercel (o dopo aver messo in pausa/eliminato il progetto), Google smette di vedere contenuti “vivi” sul dominio Vercel.

## Se Vercel non è ancora aggiornato

Nel dashboard Vercel (progetto `temporary-prompt-quasar-rndxhgh`):

1. **Settings → Domains** — rimuovi l’alias `felicepolesebarbershop.vercel.app` se possibile  
2. Oppure **Pause Project** / **Delete Project** — la produzione resta solo sul VPS `.it`

Serve un `VERCEL_TOKEN` (o accesso dashboard) per farlo da CLI.

## Google Search Console (rimozione manuale — lag di indicizzazione)

Anche con redirect/noindex, il risultato “Felice Polese - Vercel” può restare in SERP per giorni/settimane. Per accelerare:

1. Apri [Google Search Console](https://search.google.com/search-console) con la proprietà  
   - `https://felicepolesebarbershop.it` (e, se presente, anche `felicepolesebarbershop.vercel.app`)
2. Menu **Indicizzazione → Rimozione** (o **Removals**)
3. **Nuova richiesta** → **Rimuovi temporaneamente URL**
4. Incolla: `https://felicepolesebarbershop.vercel.app`  
   (opzionale: richiedi anche prefisso `https://felicepolesebarbershop.vercel.app/`)
5. Invia. La rimozione temporanea nasconde il risultato ~6 mesi; il redirect 308 + noindex evita che rientri.
6. Su `.it`: **Ispezione URL** → `https://felicepolesebarbershop.it/` → **Richiedi indicizzazione**.

## Verifica rapida

```bash
curl -sI https://felicepolesebarbershop.vercel.app/ | head
# atteso dopo fix: 308 + location: https://felicepolesebarbershop.it/ + x-robots-tag

curl -s https://felicepolesebarbershop.vercel.app/robots.txt
# atteso: Disallow: /

curl -s https://felicepolesebarbershop.it/robots.txt
# atteso: Allow: / + Sitemap .it
```
