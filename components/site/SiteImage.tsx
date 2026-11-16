import Image, { type ImageProps } from "next/image";
import { SITE_LOGO } from "@/lib/site-images";

type SiteLogoProps = {
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
};

/**
 * Brand logo — plain <img> to /assets (not /_next/image).
 * Avoids optimizer/middleware Host failures and sticky broken caches.
 */
export function SiteLogo({ alt, className, sizes, priority }: SiteLogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- logos must not depend on image optimizer
    <img
      src={SITE_LOGO.src}
      alt={alt}
      width={SITE_LOGO.width}
      height={SITE_LOGO.height}
      className={className}
      sizes={sizes ?? "(max-width: 420px) 48px, 64px"}
      decoding="async"
      {...(priority
        ? { fetchPriority: "high" as const }
        : { loading: "lazy" as const })}
    />
  );
}

type FillImageProps = Omit<ImageProps, "fill" | "width" | "height"> & {
  alt: string;
};

/** Cover image for fixed-aspect containers (gallery, hero background). */
export function FillCoverImage({
  alt,
  className,
  sizes,
  quality = 78,
  priority,
  loading,
  ...rest
}: FillImageProps) {
  return (
    <Image
      alt={alt}
      fill
      className={className}
      sizes={sizes ?? "(max-width: 768px) 100vw, 33vw"}
      quality={quality}
      priority={priority}
      loading={priority ? undefined : loading ?? "lazy"}
      style={{ objectFit: "cover", ...(rest.style ?? {}) }}
      {...rest}
    />
  );
}
