import type { Metadata } from "next";
import { Header, Footer, ClientEffects } from "@/components/site/Chrome";
import { SiteShell } from "@/components/site/SiteShell";
import { SITE, CANCEL_NOTICE_IT } from "@/lib/site-config";

export const metadata: Metadata = {
  title: `Termini e condizioni — ${SITE.name}`,
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <SiteShell>
      <Header />
      <main id="main-content" className="legal-page">
        <p className="eyebrow">Condizioni di prenotazione</p>
        <h1 className="section-title font-serif">Termini e disdetta</h1>
        <div className="legal-prose">
          <p>
            {SITE.name} | {SITE.addressFull}. C.F. {SITE.fiscalCode} | P.IVA{" "}
            {SITE.vatNumber}.
          </p>
          <h2>Prenotazioni</h2>
          <p>
            La prenotazione online è un impegno a presentarsi all&apos;orario
            scelto. I servizi a prezzo variabile (decolorazioni e tinture) sono
            quotati in salone: online viene indicato il prezzo minimo (&quot;da X
            €&quot;). {SITE.pricesIncludeVat}
          </p>
          <h2>Disdetta</h2>
          <p>
            Puoi disdire gratuitamente fino a {CANCEL_NOTICE_IT} prima
            dell&apos;appuntamento, dal link ricevuto via email
            (/appuntamento/…). Oltre tale termine chiama il {SITE.phone}. La
            disdetta libera subito lo slot e annulla il promemoria di 30 minuti
            (file .ics di cancellazione). I no-show reiterati possono comportare
            la richiesta di un acconto per prenotazioni successive.
          </p>
          <h2>Orari</h2>
          <p>
            {SITE.hours.weekdays}. {SITE.hours.monday}. {SITE.hours.sunday}.
            Fuso orario Europe/Rome. Le prenotazioni partono dal{" "}
            {SITE.openingDate.split("-").reverse().join("/")}.
          </p>
          <h2>Responsabilità</h2>
          <p>
            Il trattamento è eseguito da personale qualificato. Segnala allergie
            o condizioni della cute/capelli prima del servizio. Per reclami
            scrivi a {SITE.email}.
          </p>
        </div>
      </main>
      <Footer />
      <ClientEffects />
    </SiteShell>
  );
}
