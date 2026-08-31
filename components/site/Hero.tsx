import { SITE, getMapsUrl } from "@/lib/site-config";

export function Hero() {
  return (
    <section id="hero" className="hero bg-noise">
      <div className="hero-bg" />
      <div className="hero-glow" />
      <div className="hero-inner hero-inner--live" style={{ display: "block" }}>
        <img
          src="/assets/images/logo.png"
          alt="Felice Polese — logo ufficiale Polese Barbershop"
          className="brand-logo brand-logo--hero"
          width={512}
          height={331}
        />
        <p className="eyebrow">{SITE.brand}</p>
        <h1 className="hero-title font-serif">{SITE.name}</h1>
        <p className="hero-text">{SITE.tagline}</p>
        <p className="hero-text">
          Felice e Davide — taglio, barba, colore e trattamenti a {SITE.address}, {SITE.city}.
        </p>
        <div className="hero-actions">
          <a href="/#prenota" className="btn btn-gold btn-magnetic">Prenota ora</a>
          <a href="/#services" className="btn btn-outline btn-magnetic">Servizi</a>
          <a href={getMapsUrl()} className="btn btn-outline btn-magnetic" target="_blank" rel="noopener noreferrer">Maps</a>
        </div>
      </div>
    </section>
  );
}
