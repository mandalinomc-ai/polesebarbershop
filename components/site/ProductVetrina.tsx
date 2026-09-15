import { FillCoverImage } from "@/components/site/SiteImage";
import { PRODUCTS, productOrderMessage } from "@/lib/products";
import { getWhatsAppUrl } from "@/lib/site-config";

export function ProductVetrina() {
  return (
    <section id="prodotti" className="section-pad bg-marble-light marble-accent">
      <div className="eyebrow reveal">Linea salone</div>
      <h2 className="section-title font-serif reveal reveal-d1">I nostri prodotti</h2>
      <p className="prose technique-lead reveal reveal-d2">
        Vetrina in salone — non vendita online. Scrivici su WhatsApp per prezzi e disponibilità.
      </p>
      <div className="products-vetrina-grid">
        {PRODUCTS.map((product) => (
          <article key={product.id} className="product-vetrina-card reveal">
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
                className="btn btn-whatsapp product-vetrina-cta"
                href={getWhatsAppUrl(productOrderMessage(product.name))}
                target="_blank"
                rel="noopener noreferrer"
              >
                Info prezzi su WhatsApp
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
