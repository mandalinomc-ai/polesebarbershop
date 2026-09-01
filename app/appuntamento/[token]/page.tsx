import { Header, Footer, SiteFabs } from "@/components/site/Chrome";
import { SiteShell } from "@/components/site/SiteShell";
import { ManageAppointment } from "./ManageAppointment";
import { SITE } from "@/lib/site-config";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `Il tuo appuntamento — ${SITE.name}`,
  robots: { index: false, follow: false },
};

export default async function AppointmentPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <SiteShell lightHeader>
      <Header />
      <main id="main-content" className="manage-page manage-page--marble">
        <ManageAppointment token={token} />
      </main>
      <Footer />
      <SiteFabs />
    </SiteShell>
  );
}
