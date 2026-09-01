/** Official PDF assets — user drops files in public/assets/pdf/. */
export const SITE_PDFS = {
  hoursPanel: "/assets/pdf/PannelloOrari.pdf",
  logo: "/assets/pdf/Logo_Felice_Polese.pdf",
} as const;

export type SitePdfKey = keyof typeof SITE_PDFS;
