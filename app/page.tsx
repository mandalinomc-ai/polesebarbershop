import { headers } from "next/headers";
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
import { isCanonicalHost, requestHost } from "@/lib/canonical-host";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const host = requestHost(await headers());
  const onLegacyHost = !isCanonicalHost(host);

  // Vercel / old URLs → social offline + link to .it (avoid client confusion).
  if (onLegacyHost || IS_COMING_SOON) {
    return (
      <SiteShell>
        <ComingSoon showMovedNotice={onLegacyHost} />
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
