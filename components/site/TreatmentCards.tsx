import {
  SERVICES,
  formatCardPrice,
  formatDuration,
} from "@/lib/catalog";
import { getServiceMedia } from "@/lib/service-media";
import { serviceBookingHref } from "@/lib/site-config";
import { SalonVideo } from "@/components/site/SalonVideo";
import type { SiteVideo } from "@/lib/site-videos";

function TreatmentCardMedia({
  serviceId,
  serviceName,
}: {
  serviceId: string;
  serviceName: string;
}) {
  const media = getServiceMedia(serviceId);
  if (!media) {
    return <div className="treatment-card-media treatment-card-media--empty" aria-hidden="true" />;
  }

  if (media.kind === "photo") {
    return (
      <div className="treatment-card-media">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={media.src} alt={serviceName} className="treatment-card-photo" />
      </div>
    );
  }

  const video: SiteVideo = {
    id: serviceId,
    src: media.src,
    alt: `${serviceName} — Felice Polese Barber Shop`,
  };

  return (
    <div className="treatment-card-media">
      <SalonVideo video={video} className="treatment-card-video" />
    </div>
  );
}

/** Ten official bookable services with correct media, duration and price. */
export function TreatmentCards() {
  return (
    <section id="trattamenti" className="section-pad bg-marble-light marble-accent">
      <div className="eyebrow reveal">Menu</div>
      <h2 className="section-title font-serif reveal reveal-d1">Servizi</h2>
      <div className="trattamenti-grid">
        {SERVICES.map((service) => (
          <article key={service.id} className="treatment-card glass-card">
            <TreatmentCardMedia serviceId={service.id} serviceName={service.name} />
            <div className="treatment-card-body">
              <h3>{service.name}</h3>
              <p>{service.description}</p>
              <p className="treatment-card-meta">
                <span>{formatDuration(service)}</span>
                <span>{formatCardPrice(service)}</span>
              </p>
              <a className="btn btn-ink treatment-card-cta" href={serviceBookingHref(service.id)}>
                Prenota ora
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
