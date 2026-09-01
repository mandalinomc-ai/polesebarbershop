import { Header, Footer, SiteFabs, ClientEffects } from "@/components/site/Chrome";
import { BookingSectionNote, FreshaBookingFlow } from "@/components/booking/FreshaBookingFlow";
import { SiteShell } from "@/components/site/SiteShell";
import { SITE } from "@/lib/site-config";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `Prenota — ${SITE.name}`,
  description: `Prenota taglio, barba e trattamenti da ${SITE.name}, ${SITE.address}, ${SITE.city}.`,
};

export default function PrenotaPage() {
  return (
    <SiteShell lightHeader>
      <Header />
      <main id="main-content" className="manage-page manage-page--marble">
        <p className="eyebrow">Prenotazione</p>
        <h1 className="section-title font-serif">{SITE.name}</h1>
        <div className="booking-layout">
          <BookingSectionNote />
          <FreshaBookingFlow />
        </div>
      </main>
      <Footer />
      <SiteFabs />
      <ClientEffects />
    </SiteShell>
  );
}
