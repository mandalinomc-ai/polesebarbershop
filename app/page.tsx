import {
  Header,
  Footer,
  SiteFabs,
  ClientEffects,
} from "@/components/site/Chrome";
import { Hero } from "@/components/site/Hero";
import { LandingSections } from "@/components/site/LandingSections";
import { ComingSoon } from "@/components/site/ComingSoon";
import { ScissorsIntro } from "@/components/site/ScissorsIntro";
import { IS_COMING_SOON } from "@/lib/site-config";

export default function HomePage() {
  if (IS_COMING_SOON) {
    return (
      <>
        <ComingSoon />
        <SiteFabs />
        <ClientEffects />
      </>
    );
  }

  return (
    <>
      <ScissorsIntro />
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
