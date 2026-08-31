import type { Metadata } from "next";
import { Header, Footer, ClientEffects } from "@/components/site/Chrome";
import { SITE } from "@/lib/site-config";

export const metadata: Metadata = {
  title: `Privacy Policy — ${SITE.name}`,
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <>
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
          <h2>Dati raccolti</h2>
          <p>
            Per le prenotazioni online trattiamo nome, cognome, email, numero di
            telefono e dettagli dell&apos;appuntamento (servizi, barbiere, data e
            ora). Il consenso è richiesto tramite checkbox obbligatorio.
          </p>
          <h2>Finalità e base giuridica</h2>
          <ul>
            <li>Esecuzione del contratto/precontratto di prenotazione (art. 6.1.b).</li>
            <li>Obblighi contabili e fiscali (art. 6.1.c).</li>
            <li>Invio della conferma e del file calendario .ics (art. 6.1.b).</li>
          </ul>
          <h2>Conservazione</h2>
          <p>
            I dati degli appuntamenti sono conservati per il tempo necessario alla
            prestazione e agli obblighi di legge, e comunque non oltre 24 mesi
            dalla data dell&apos;appuntamento, salvo obblighi fiscali.
          </p>
          <h2>Destinatari</h2>
          <p>
            I dati sono trattati su infrastrutture nell&apos;UE (hosting e database).
            L&apos;email di conferma è inviata tramite il fornitore Resend. Non
            vendiamo i dati a terzi.
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
      <ClientEffects />
    </>
  );
}
