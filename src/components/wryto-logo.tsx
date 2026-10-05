import { cn } from "@/lib/utils";

interface WrytoLogoProps {
  /**
   * "full" = the complete brand mark with stylized feather, horizontal coral line and Wryto wordmark
   * "icon" = square 1:1 feather quill icon only
   * "lockup" = 1:1 feather icon paired with modern typography
   */
  variant?: "full" | "icon" | "lockup";
  /** Preset size variants */
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  /** Whether to force dark theme background or transparent */
  theme?: "transparent" | "solid";
  priority?: boolean;
}

export function WrytoIcon({
  className,
  size = "md",
  theme = "transparent",
}: Omit<WrytoLogoProps, "variant">) {
  const sizeClasses = {
    xs: "size-5",
    sm: "size-7",
    md: "size-9",
    lg: "size-14",
    xl: "size-20",
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
        alt="Wryto icon"
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
          className="h-full w-auto max-w-full object-contain drop-shadow-sm"
          loading="eager"
          decoding="async"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "/wryto-logo.png";
          }}
        />
      </div>
    );
  }

  // "lockup" variant: feather icon + clean modern typography
  const textClasses = {
    xs: "text-sm ml-1.5",
    sm: "text-base ml-2",
    md: "text-xl ml-2.5",
    lg: "text-3xl ml-3",
    xl: "text-5xl ml-4",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center select-none font-display font-semibold tracking-tight",
        className,
      )}
    >
      <WrytoIcon size={size} theme={theme} />
      <span className={cn("text-foreground", textClasses[size])}>Wryto</span>
    </div>
  );
}
