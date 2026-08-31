import type { Metadata } from "next";
import { GestionalePanel } from "@/components/gestionale/GestionalePanel";

export const metadata: Metadata = {
  title: "Gestionale — Polese Barbershop",
  robots: { index: false, follow: false },
};

export default function GestionalePage() {
  return <GestionalePanel />;
}
