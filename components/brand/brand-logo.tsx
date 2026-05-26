import { clsx } from "clsx";
import { BrandMark } from "@/components/brand/brand-mark";

const textSizes = {
  sm: {
    mark: "sm" as const,
    name: "text-sm",
    subtitle: "text-[0.68rem]"
  },
  md: {
    mark: "md" as const,
    name: "text-base",
    subtitle: "text-xs"
  },
  lg: {
    mark: "lg" as const,
    name: "text-lg",
    subtitle: "text-sm"
  }
};

type BrandLogoProps = {
  className?: string;
  compact?: boolean;
  showSubtitle?: boolean;
  size?: keyof typeof textSizes;
  subtitle?: string;
};

export function BrandLogo({
  className,
  compact = false,
  showSubtitle = true,
  size = "md",
  subtitle = "Executive Finance OS"
}: BrandLogoProps) {
  const sizes = textSizes[size];

  if (compact) {
    return <BrandMark className={className} size={sizes.mark} />;
  }

  return (
    <div className={clsx("flex min-w-0 items-center gap-3", className)}>
      <BrandMark size={sizes.mark} />
      <div className="min-w-0">
        <p className={clsx("truncate font-semibold tracking-normal text-ink", sizes.name)}>
          Mercury Books
        </p>
        {showSubtitle ? (
          <p className={clsx("truncate font-semibold text-mint", sizes.subtitle)}>
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
}
