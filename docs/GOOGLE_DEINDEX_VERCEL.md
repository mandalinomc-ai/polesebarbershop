# Rimuovere `*.vercel.app` da Google (Felice Polese)

**Sito ufficiale (unico):** https://felicepolesebarbershop.it  
**Gestionale:** https://felicepolesebarbershop.it/gestionale/  

L’URL `https://felicepolesebarbershop.vercel.app` è un vecchio mirror Vercel. Non va usato dai clienti.

## Stato attuale (verifica HTTP)

```text
https://felicepolesebarbershop.vercel.app          → 503  x-vercel-error: DEPLOYMENT_PAUSED
https://temporary-prompt-quasar-rndxhgh.vercel.app → 503  DEPLOYMENT_PAUSED
https://polesebarbershop.vercel.app                → 404  DEPLOYMENT_NOT_FOUND
https://felicepolesebarbershop.it                  → 200  VPS (nginx) — intatto
```

Il progetto Vercel è **già in pausa**: non serve più una pagina viva su `*.vercel.app`.  
Manca solo la **rimozione da Google Search** (lag SERP) — richiede il login del proprietario in Search Console.

## Blocco tecnico (già in codice)

Su host non-`.it` (es. `felicepolesebarbershop.vercel.app`), quando il deploy è attivo:

1. **308 permanente** di quasi tutte le path verso `https://felicepolesebarbershop.it…`
2. **`/robots.txt` NON viene reindirizzato** → `Disallow: /` (niente sitemap)
3. Header **`X-Robots-Tag: noindex, nofollow`**
4. Meta robots **noindex** se mai venisse renderizzata una pagina
5. `vercel.json` → redirect edge host-condizionati verso `.it` (escluso `robots.txt`)

Sul VPS `.it` non cambia nulla di pericoloso: `Allow: /` + sitemap solo `.it`.

## Vercel dashboard (se hai accesso)

Progetto `temporary-prompt-quasar-rndxhgh`:

1. Lascia **Pause Project** (già attivo) **oppure** **Delete Project**
2. **Settings → Domains** — rimuovi l’alias `felicepolesebarbershop.vercel.app` se compare
3. Non riattivare il progetto senza il deploy deindex (308 + noindex)

Serve `VERCEL_TOKEN` (o dashboard) per delete/CLI. In questo ambiente agent: **nessun `VERCEL_TOKEN` / credenziali Google**.

## Google Search Console — SOLO TU puoi cliccare

Apri **sul tuo PC (Edge/Chrome)** con l’account che gestisce il sito:

1. Vai a https://search.google.com/search-console  
2. Seleziona (o aggiungi) la proprietà `https://felicepolesebarbershop.it`  
   (opzionale: anche dominio/URL `felicepolesebarbershop.vercel.app` se già verificata)
3. Menu sinistro → **Indicizzazione → Rimozioni** (Removals)
4. **Nuova richiesta** → **Rimuovi temporaneamente URL**
5. Incolla esattamente:

```text
https://felicepolesebarbershop.vercel.app
```

6. Invia. (Opzionale: seconda richiesta con prefisso `https://felicepolesebarbershop.vercel.app/`)
7. Poi **Ispezione URL** → incolla `https://felicepolesebarbershop.it/` → **Richiedi indicizzazione**

### Testo breve da copiare (nota personale)

```text
Rimuovere da Google il vecchio mirror Vercel:
https://felicepolesebarbershop.vercel.app
(e prefisso https://felicepolesebarbershop.vercel.app/ se disponibile).
Sito ufficiale da tenere: https://felicepolesebarbershop.it
Poi Ispezione URL → richiedi indicizzazione della home .it.
```

L’agente cloud **non può** aprire il tuo Edge né autenticarsi a Search Console al posto tuo.

## Verifica rapida

```bash
curl -sI https://felicepolesebarbershop.vercel.app/ | head
# ora: 503 DEPLOYMENT_PAUSED
# se unpaused + deindex deploy: 308 + location .it + x-robots-tag

curl -s https://felicepolesebarbershop.it/robots.txt
# atteso: Allow: / + Sitemap .it (VPS OK)
```
