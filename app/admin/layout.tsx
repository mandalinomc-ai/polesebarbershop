import type { Metadata } from "next";
import { SITE } from "@/lib/site-config";
export const metadata: Metadata = { title: `Gestionale — ${SITE.name}`, robots: { index: false, follow: false } };
export default function AdminLayout({ children }: { children: React.ReactNode }) { return children; }
