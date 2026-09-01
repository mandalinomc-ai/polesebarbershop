import type { Metadata } from "next";
import { GestionalePanel } from "@/components/gestionale/GestionalePanel";
import { SITE } from "@/lib/site-config";

export const metadata: Metadata = {
  title: `Gestionale — ${SITE.name}`,
  robots: { index: false, follow: false },
};

export default function GestionalePage() {
  return <GestionalePanel />;
}
