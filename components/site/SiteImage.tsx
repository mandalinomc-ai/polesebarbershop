import Image, { type ImageProps } from "next/image";
import { SITE_LOGO } from "@/lib/site-images";

type SiteLogoProps = Omit<ImageProps, "src" | "width" | "height" | "alt"> & {
  alt: string;
};

/** Brand logo with correct intrinsic dimensions and responsive object-fit. */
export function SiteLogo({ alt, className, sizes, priority, ...rest }: SiteLogoProps) {
  return (
    <Image
      src={SITE_LOGO.src}
      alt={alt}
      width={SITE_LOGO.width}
      height={SITE_LOGO.height}
      className={className}
      sizes={sizes ?? "(max-width: 420px) 48px, 64px"}
      priority={priority}
      {...rest}
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
  quality = 82,
  ...rest
}: FillImageProps) {
  return (
    <Image
      alt={alt}
      fill
      className={className}
      sizes={sizes}
      quality={quality}
      style={{ objectFit: "cover", ...(rest.style ?? {}) }}
      {...rest}
    />
  );
}
