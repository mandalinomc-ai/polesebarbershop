import type { Metadata } from "next";
import { Header, Footer, SiteFabs, ClientEffects } from "@/components/site/Chrome";
import { SiteShell } from "@/components/site/SiteShell";
import { SITE_COOKIES } from "@/lib/cookie-consent";
import { SITE } from "@/lib/site-config";

export const metadata: Metadata = {
  title: `Cookie policy — ${SITE.name}`,
  robots: { index: true, follow: true },
};

export default function CookiePolicyPage() {
  return (
    <SiteShell>
      <Header />
      <main id="main-content" className="legal-page">
        <p className="eyebrow">ePrivacy · Cookie</p>
        <h1 className="section-title font-serif">Cookie policy</h1>
        <div className="legal-prose">
          <p>
            Titolare: <strong>{SITE.name}</strong>, {SITE.addressFull}. Email{" "}
            {SITE.email}. Questa pagina elenca solo i cookie realmente usati dal
            sito {SITE.siteUrl}.
          </p>

          <h2>Cosa sono i cookie</h2>
          <p>
            I cookie sono piccoli file di testo memorizzati sul dispositivo.
            Distinguiamo cookie necessari (funzionamento del servizio) e cookie
            di preferenza (scelta sul banner).
          </p>

          <h2>Cookie utilizzati</h2>
          <ul>
            {SITE_COOKIES.map((c) => (
              <li key={c.name}>
                <strong>{c.name}</strong> ({c.category}) — {c.purpose} Durata:{" "}
                {c.duration}.
              </li>
            ))}
          </ul>
          <p>
            Non utilizziamo cookie di analitica di terze parti (es. Google
            Analytics), né cookie pubblicitari o di profilazione. Non è presente
            CAPTCHA sul percorso di prenotazione.
          </p>

          <h2>Come gestire le preferenze</h2>
          <p>
            Dal banner in basso puoi <strong>Accettare</strong>,{" "}
            <strong>Rifiutare</strong> i non necessari o{" "}
            <strong>Personalizzare</strong>. Puoi riaprire il pannello in
            qualsiasi momento da{" "}
            <a href="/?gestisci-cookie=1">Gestisci cookie</a> nel footer. I
            cookie necessari restano attivi per sicurezza e funzionamento (es.
            sessione area gestionale).
          </p>

          <h2>Servizi di terze parti (non cookie di marketing)</h2>
          <ul>
            <li>Vercel — hosting</li>
            <li>Supabase — database prenotazioni</li>
            <li>Gmail SMTP — email di conferma</li>
            <li>Google Maps / Google Fonts — mappa e tipografie</li>
          </ul>
          <p>
            L&apos;uso di Google Fonts e Google Maps può comportare connessioni
            verso Google. Maggiori dettagli nella{" "}
            <a href="/privacy-policy">Privacy policy</a>.
          </p>
        </div>
      </main>
      <Footer />
      <SiteFabs />
      <ClientEffects />
    </SiteShell>
  );
}
