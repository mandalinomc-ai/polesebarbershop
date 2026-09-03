/** Felice Polese linea styling — foto ufficiali Drive, senza prezzi inventati. */
export type Product = {
  id: string;
  name: string;
  description: string;
  image: string;
};

export const PRODUCTS: Product[] = [
  {
    id: "cera-lucida",
    name: "Cera Lucida",
    description: "Lucentezza naturale, controllo totale.",
    image: "/assets/images/products/cera-lucida.jpg",
  },
  {
    id: "lacca-professionale",
    name: "Lacca Professionale",
    description: "Tenuta forte, risultato perfetto.",
    image: "/assets/images/products/lacca-professionale.jpg",
  },
];

export function productOrderMessage(name: string): string {
  return `Ciao, vorrei informazioni su ${name} della linea Felice Polese.`;
}
