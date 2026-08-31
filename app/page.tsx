import { Header, Footer, WhatsAppFab, ClientEffects } from "@/components/site/Chrome";
import { Hero } from "@/components/site/Hero";
import { LandingSections } from "@/components/site/LandingSections";

export default function HomePage() {
  return (
    <>
      <Header />
      <main id="main-content">
        <Hero />
        <LandingSections />
      </main>
      <Footer />
      <WhatsAppFab />
      <ClientEffects />
    </>
  );
}
