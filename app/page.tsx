import { Header, Footer, SiteFabs, ClientEffects } from "@/components/site/Chrome";
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
      <SiteFabs />
      <ClientEffects />
    </>
  );
}
