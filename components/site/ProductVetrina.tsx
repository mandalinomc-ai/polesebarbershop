import { FillCoverImage } from "@/components/site/SiteImage";
import { PRODUCTS, productOrderMessage } from "@/lib/products";
import { getWhatsAppUrl } from "@/lib/site-config";

export function ProductVetrina() {
  return (
    <section id="prodotti" className="section-pad section-marble marble-accent">
      <div className="eyebrow">Linea salone</div>
      <h2 className="section-title font-serif">Vetrina Prodotti Felice Polese</h2>
      <p className="prose technique-lead">
        Styling professionale pensato in salone: finitura netta, tenuta controllata,
        risultato che dura.
      </p>
      <div className="products-vetrina-grid">
        {PRODUCTS.map((product) => (
          <article key={product.id} className="product-vetrina-card">
            <div className="product-vetrina-media">
              <FillCoverImage
                src={product.image}
                alt={`${product.name} — Felice Polese Barber Solutions`}
                sizes="(max-width: 700px) 100vw, 50vw"
                style={{ objectFit: "cover", objectPosition: "center center" }}
              />
            </div>
            <div className="product-vetrina-copy">
              <h3>{product.name}</h3>
              <p>{product.description}</p>
              <a
                className="btn btn-ghost product-vetrina-cta"
                href={getWhatsAppUrl(productOrderMessage(product.name))}
                target="_blank"
                rel="noopener noreferrer"
              >
                Info su WhatsApp
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
