import type { Metadata } from "next";
import { Header, Footer, SiteFabs, ClientEffects } from "@/components/site/Chrome";
import { SiteShell } from "@/components/site/SiteShell";
import { SITE } from "@/lib/site-config";

export const metadata: Metadata = {
  title: `Privacy Policy — ${SITE.name}`,
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <SiteShell>
      <Header />
      <main id="main-content" className="legal-page">
        <p className="eyebrow">GDPR UE 2016/679</p>
        <h1 className="section-title font-serif">Informativa privacy</h1>
        <div className="legal-prose">
          <p>
            Titolare del trattamento: <strong>{SITE.name}</strong>, {SITE.addressFull}.
            C.F. {SITE.fiscalCode} — P.IVA {SITE.vatNumber}. Email {SITE.email} —
            Tel. {SITE.phone}.
          </p>
          <p>
            Questa informativa descrive i trattamenti effettuati tramite il sito{" "}
            {SITE.siteUrl}. Non costituisce una dichiarazione di conformità
            assoluta: restano aperti gli adempimenti elencati in documentazione
            interna (es. DPO, registro trattamenti) ove applicabili.
          </p>

          <h2>Dati raccolti</h2>
          <p>
            Per le prenotazioni online trattiamo nome, cognome, email, numero di
            telefono e dettagli dell&apos;appuntamento (servizi, barbiere, data e
            ora). Il consenso è richiesto tramite checkbox obbligatorio prima
            della conferma. Eventuali note libere sono facoltative.
          </p>

          <h2>Finalità e base giuridica</h2>
          <ul>
            <li>Esecuzione del contratto/precontratto di prenotazione (art. 6.1.b).</li>
            <li>Obblighi contabili e fiscali ove applicabili (art. 6.1.c).</li>
            <li>Invio della conferma e del file calendario .ics (art. 6.1.b).</li>
            <li>
              Sicurezza del servizio (limitazione abusi, rate limit) — legittimo
              interesse (art. 6.1.f), bilanciato e non invasivo.
            </li>
          </ul>

          <h2>Conservazione</h2>
          <p>
            I dati degli appuntamenti sono conservati per il tempo necessario alla
            prestazione e agli obblighi di legge, e comunque non oltre 24 mesi
            dalla data dell&apos;appuntamento, salvo obblighi fiscali diversi.
          </p>

          <h2>Destinatari e servizi tecnici utilizzati</h2>
          <p>
            I dati sono trattati tramite fornitori tecnici necessari al
            funzionamento del sito. Non vendiamo i dati a terzi a fini di
            marketing. Servizi effettivamente in uso:
          </p>
          <ul>
            <li>
              <strong>Vercel</strong> — hosting e distribuzione del sito
              (infrastruttura cloud; dati di log tecnici di richiesta).
            </li>
            <li>
              <strong>Supabase</strong> — database delle prenotazioni e
              dell&apos;anagrafica gestionale (accesso solo lato server con chiave
              di servizio).
            </li>
            <li>
              <strong>Gmail SMTP</strong> (Google) — invio email di conferma e
              avvisi al salone, con allegato calendario .ics.
            </li>
            <li>
              <strong>Google Maps</strong> — link/mappa per raggiungere il salone
              (il click apre i servizi Google).
            </li>
            <li>
              <strong>Google Fonts</strong> — tipografie caricate da Google per
              la resa grafica del sito.
            </li>
          </ul>
          <p>
            Trasferimenti extra-UE, se previsti dal fornitore, avvengono secondo le
            garanzie del fornitore (es. clausole contrattuali standard). Dettagli
            e lacune documentali: vedi anche{" "}
            <a href="/cookie-policy">Cookie policy</a>.
          </p>

          <h2>Cookie</h2>
          <p>
            Usiamo cookie tecnici necessari e, previo consenso, un cookie di
            preferenza per ricordare la scelta sul banner. Nessun cookie di
            profilazione pubblicitaria.{" "}
            <a href="/cookie-policy">Informativa cookie</a> —{" "}
            <a href="/?gestisci-cookie=1">Gestisci cookie</a>.
          </p>

          <h2>Diritti</h2>
          <p>
            Puoi chiedere accesso, rettifica, cancellazione, limitazione e
            portabilità, nonché opposizione, scrivendo a {SITE.email}. Hai
            diritto di reclamo al Garante per la protezione dei dati personali.
          </p>
          <p>
            Per disdire un appuntamento usa il link ricevuto via email
            (/appuntamento/…) oppure chiama il {SITE.phone}. La disdetta libera
            lo slot e il promemoria di 30 minuti non parte.
          </p>
        </div>
      </main>
      <Footer />
      <SiteFabs />
      <ClientEffects />
    </SiteShell>
  );
}
