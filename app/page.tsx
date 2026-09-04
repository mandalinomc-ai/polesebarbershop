import {
  Header,
  Footer,
  SiteFabs,
  ClientEffects,
} from "@/components/site/Chrome";
import { Hero } from "@/components/site/Hero";
import { LandingSections } from "@/components/site/LandingSections";
import { ComingSoon } from "@/components/site/ComingSoon";
import { MicroMotion } from "@/components/site/MicroMotion";
import { ScissorsIntro } from "@/components/site/ScissorsIntro";
import { SiteShell } from "@/components/site/SiteShell";
import { IS_COMING_SOON } from "@/lib/site-config";

export default function HomePage() {
  if (IS_COMING_SOON) {
    return (
      <SiteShell>
        <ComingSoon />
        <SiteFabs />
        <ClientEffects />
        <MicroMotion />
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <ScissorsIntro />
      <Header />
      <main id="main-content">
        <Hero />
        <LandingSections />
      </main>
      <Footer />
      <SiteFabs />
      <ClientEffects />
      <MicroMotion />
    </SiteShell>
  );
}
