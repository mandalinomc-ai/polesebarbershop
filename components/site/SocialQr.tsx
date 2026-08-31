import { getSocialChannels, type SocialChannel } from "@/lib/site-config";

type Variant = "contact" | "footer";

function channelRel(ch: SocialChannel): { target?: string; rel?: string } {
  if (!ch.external) return {};
  return { target: "_blank", rel: "noopener noreferrer" };
}

export function SocialQrGrid({ variant }: { variant: Variant }) {
  const channels = getSocialChannels();
  return (
    <div className={`qr-grid qr-grid--${variant}`} role="list" aria-label="QR social e prenotazione">
      {channels.map((ch) => {
        const link = channelRel(ch);
        return (
          <a
            key={`${variant}-${ch.id}`}
            className="qr-card"
            href={ch.href}
            role="listitem"
            target={link.target}
            rel={link.rel}
          >
            <img
              src={ch.qr}
              alt={`QR ${ch.label}: ${ch.qrPayload}`}
              width={160}
              height={160}
            />
            <span className="qr-label">{ch.label}</span>
            <span className="qr-handle">{ch.handle}</span>
          </a>
        );
      })}
    </div>
  );
}

export function SocialTextLinks() {
  const channels = getSocialChannels();
  return (
    <p className="social-text-links">
      {channels.map((ch, i) => {
        const link = channelRel(ch);
        return (
          <span key={ch.id}>
            {i > 0 ? " · " : null}
            <a href={ch.href} className="contact-link" target={link.target} rel={link.rel}>
              {ch.id === "instagram" ? ch.handle : ch.label}
            </a>
          </span>
        );
      })}
    </p>
  );
}
