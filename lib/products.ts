/** Felice Polese linea cura capelli — ordine via WhatsApp in salone. */
export type Product = {
  id: string;
  name: string;
  description: string;
  image: string;
  priceLabel: string;
};

export const PRODUCTS: Product[] = [
  {
    id: "shampoo",
    name: "Shampoo Felice Polese",
    description: "Detergenza delicata per cuoio capelluto e capelli.",
    image: "",
    priceLabel: "Su ordinazione",
  },
  {
    id: "balsamo",
    name: "Balsamo Nutriente",
    description: "Idratazione e pettinabilità senza appesantire.",
    image: "",
    priceLabel: "Su ordinazione",
  },
  {
    id: "pomata",
    name: "Pomata Styling",
    description: "Tenuta modulabile, finitura naturale e opaca.",
    image: "",
    priceLabel: "Su ordinazione",
  },
  {
    id: "olio-barba",
    name: "Olio Barba",
    description: "Ammorbidisce e profuma barba e baffi.",
    image: "",
    priceLabel: "Su ordinazione",
  },
  {
    id: "cera",
    name: "Cera Modellante",
    description: "Definizione e volume per look strutturati.",
    image: "",
    priceLabel: "Su ordinazione",
  },
  {
    id: "spray",
    name: "Spray Finish",
    description: "Fissaggio leggero per acconciature editoriali.",
    image: "",
    priceLabel: "Su ordinazione",
  },
];

export function productOrderMessage(name: string): string {
  return `Ciao, vorrei ordinare ${name} della linea Felice Polese.`;
}
