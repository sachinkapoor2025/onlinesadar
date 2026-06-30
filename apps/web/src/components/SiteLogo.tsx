import Image from "next/image";
import Link from "next/link";
import { site } from "@/lib/site";

const LOGO = {
  desktop: { width: 180, height: 60, className: "h-12 w-auto max-w-[180px] object-contain" },
  mobile: { width: 160, height: 52, className: "h-11 w-auto max-w-[160px] object-contain" },
} as const;

type SiteLogoProps = {
  size?: keyof typeof LOGO;
  priority?: boolean;
  className?: string;
};

/** Same logo rendering in header and footer — no blend modes. */
export function SiteLogo({ size = "desktop", priority = false, className = "" }: SiteLogoProps) {
  const { width, height, className: sizeClass } = LOGO[size];
  return (
    <Image
      src={site.logoSrc}
      alt={site.name}
      width={width}
      height={height}
      className={`${sizeClass} ${className}`.trim()}
      priority={priority}
    />
  );
}

export function SiteLogoLink({
  size = "desktop",
  priority = false,
  className = "",
  onClick,
}: SiteLogoProps & { onClick?: () => void }) {
  return (
    <Link href="/" className={`inline-block shrink-0 ${className}`.trim()} onClick={onClick}>
      <SiteLogo size={size} priority={priority} />
    </Link>
  );
}
