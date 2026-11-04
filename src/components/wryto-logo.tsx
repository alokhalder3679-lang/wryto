import { cn } from "@/lib/utils";

export interface WrytoLogoProps {
  /**
   * "full" = the complete brand mark banner with stylized feather and Wryto wordmark
   * "icon" = square 1:1 feather quill icon only
   * "lockup" = feather quill mark paired with literary serif typography
   * "editorial" = high-contrast literary serif masthead ("Wryto") paired with feather quill mark
   */
  variant?: "full" | "icon" | "lockup" | "editorial";
  /** Preset size variants (xs = 24px icon, sm = 28px, md = 36px, lg = 48px, xl = 64px) */
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  /** Whether to force dark theme background or transparent */
  theme?: "transparent" | "solid";
  priority?: boolean;
  /** Optional edition or kicker subtitle for editorial mastheads */
  subtitle?: string;
  /** High contrast serif text override */
  highContrast?: boolean;
}

export function WrytoIcon({
  className,
  size = "md",
  theme = "transparent",
}: Omit<WrytoLogoProps, "variant" | "subtitle" | "highContrast">) {
  const sizeClasses = {
    xs: "size-6", // 24px icon
    sm: "size-7", // 28px icon
    md: "size-9", // 36px icon
    lg: "size-12", // 48px icon
    xl: "size-16", // 64px icon
  };

  const src = theme === "solid" ? "/wryto-icon.png" : "/wryto-icon-transparent.png";

  return (
    <div
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center select-none",
        sizeClasses[size],
        className,
      )}
    >
      <img
        src={src}
        alt="Wryto quill icon"
        className="size-full object-contain"
        loading="eager"
        decoding="async"
        onError={(e) => {
          // Fallback to SVG if png fails
          (e.currentTarget as HTMLImageElement).src = "/wryto-icon.svg";
        }}
      />
    </div>
  );
}

export function WrytoLogo({
  variant = "full",
  size = "md",
  theme = "transparent",
  className,
  subtitle,
  highContrast = true,
}: WrytoLogoProps) {
  if (variant === "icon") {
    return <WrytoIcon size={size} theme={theme} className={className} />;
  }

  if (variant === "full") {
    const heightClasses = {
      xs: "h-6",
      sm: "h-8",
      md: "h-11",
      lg: "h-16",
      xl: "h-24",
    };

    const bannerSrc =
      theme === "solid" ? "/wryto-logo-banner.png" : "/wryto-logo-banner-transparent.png";

    return (
      <div className={cn("inline-flex items-center select-none", heightClasses[size], className)}>
        <img
          src={bannerSrc}
          alt="Wryto"
          className="h-full w-auto max-w-full object-contain drop-shadow-xs"
          loading="eager"
          decoding="async"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "/wryto-logo.png";
          }}
        />
      </div>
    );
  }

  // "editorial" & "lockup" variants: quill icon paired with high-contrast literary serif typography
  const gapClasses = {
    xs: "ml-2",
    sm: "ml-2.5",
    md: "ml-3",
    lg: "ml-3.5",
    xl: "ml-4",
  };

  const textClasses = {
    xs: "text-lg",
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-4xl",
    xl: "text-5xl md:text-6xl",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center select-none transition-colors",
        className,
      )}
    >
      <WrytoIcon size={size} theme={theme} />
      <div className={cn("flex flex-col justify-center leading-none", gapClasses[size])}>
        <span
          className={cn(
            "font-display font-bold tracking-tight text-foreground transition-colors",
            highContrast && "text-foreground font-serif",
            textClasses[size],
          )}
        >
          Wryto
        </span>
        {subtitle && (
          <span className="mt-1 font-sans text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-medium">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
