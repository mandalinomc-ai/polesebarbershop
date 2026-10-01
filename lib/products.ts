/** Felice Polese Barber Solutions — vetrina in salone, acquisto in sede / accordo WhatsApp. */
export type Product = {
  id: string;
  name: string;
  description: string;
  image: string;
  /** cover = foto prodotto; contain = placeholder logo brand */
  imageFit?: "cover" | "contain";
};

export const PRODUCTS: Product[] = [
  {
    id: "cera-lucida",
    name: "Cera Lucida",
    description:
      "Lucentezza naturale, controllo totale. Tenuta flessibile, effetto disciplinante, idrata e protegge — non unge e non lascia residui.",
    image: "/assets/images/products/cera-lucida.jpg",
  },
  {
    id: "cera-matte",
    name: "Cera Matte",
    description:
      "Finish opaco, controllo e definizione. Per look strutturati senza lucentezza eccessiva.",
    image: "/assets/images/products/product-placeholder.jpg",
    imageFit: "contain",
  },
  {
    id: "lacca-professionale",
    name: "Lacca Professionale",
    description:
      "Tenuta forte, risultato perfetto. Effetto prolungato, anti crespo, non appiccica e non lascia residui.",
    image: "/assets/images/products/lacca-professionale.jpg",
  },
  {
    id: "shampoo-idratante",
    name: "Shampoo Idratante",
    description:
      "Detergenza delicata e idratante per cuoio capelluto e capelli. Linea Felice Polese Barber Solutions.",
    image: "/assets/images/products/shampoo-idratante.jpg",
  },
  {
    id: "balsamo",
    name: "Balsamo Nutriente",
    description: "Idratazione e pettinabilità senza appesantire.",
    image: "/assets/images/products/product-placeholder.jpg",
    imageFit: "contain",
  },
  {
    id: "pomata",
    name: "Pomata Styling",
    description: "Tenuta modulabile, finitura naturale e opaca.",
    image: "/assets/images/products/product-placeholder.jpg",
    imageFit: "contain",
  },
  {
    id: "olio-barba",
    name: "Olio Barba",
    description: "Ammorbidisce e profuma barba e baffi.",
    image: "/assets/images/products/product-placeholder.jpg",
    imageFit: "contain",
  },
];

export function productOrderMessage(name: string): string {
  return `Ciao, vorrei informazioni su ${name} della linea Felice Polese (acquisto in sede / accordo su WhatsApp).`;
}
