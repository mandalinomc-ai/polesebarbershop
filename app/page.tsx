import { Header, Footer, SiteFabs, ClientEffects } from "@/components/site/Chrome";
import { Hero } from "@/components/site/Hero";
import { LandingSections } from "@/components/site/LandingSections";
import { SiteShell } from "@/components/site/SiteShell";

export default function HomePage() {
  return (
    <SiteShell>
      <Header />
      <main id="main-content">
        <Hero />
        <LandingSections />
      </main>
      <Footer />
      <SiteFabs />
      <ClientEffects />
    </SiteShell>
  );
}
