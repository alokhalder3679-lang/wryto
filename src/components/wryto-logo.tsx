import React from "react";
import { cn } from "@/lib/utils";

export interface WrytoLogoProps {
  /**
   * "full" = the complete brand mark with stylized feather, baseline, and Wryto wordmark
   * "icon" = 1:1 vector feather quill mark only
   * "lockup" = feather mark paired with editorial serif typography
   * "editorial" = high-contrast serif masthead with optional edition kicker
   */
  variant?: "full" | "icon" | "lockup" | "editorial";
  /** Preset size variants (xs = 24px icon, sm = 32px, md = 40px, lg = 48px, xl = 64px) */
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  subtitle?: string;
  highContrast?: boolean;
}

/**
 * Signature Wryto Feather Quill Icon (Pure Vector SVG)
 */
export function WrytoIcon({
  className,
  size = "md",
}: Omit<WrytoLogoProps, "variant" | "subtitle" | "highContrast">) {
  const sizeClasses = {
    xs: "size-6", // 24px
    sm: "size-8", // 32px
    md: "size-10", // 40px
    lg: "size-12", // 48px
    xl: "size-16", // 64px
  };

  return (
    <svg
      viewBox="60 0 85 90"
      className={cn("shrink-0 select-none", sizeClasses[size], className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Wryto Quill"
    >
      {/* Left Mint Base Vane */}
      <path d="M 80 57 C 79 49, 83 42, 87 37 C 86 44, 85 51, 82 57 Z" fill="#68C3B4" />
      {/* Right Mint Base Vane */}
      <path d="M 91 58 C 98 59, 104 56, 108 52 C 101 53, 95 55, 91 58 Z" fill="#68C3B4" />

      {/* Main Coral Feather Plume */}
      <path
        d="M 84 53 C 84 42, 90 31, 98 22 C 108 11, 121 4, 138 1 C 140 9, 137 19, 129 30 C 122 39, 113 47, 104 52 C 98 55, 92 56, 84 53 Z"
        fill="#E76F64"
      />

      {/* Feather Inner Slits / Shadow Cutouts */}
      <path d="M 91 33 L 90 46" stroke="#081C30" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M 97 24 L 96 41" stroke="#081C30" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M 105 16 L 103 34" stroke="#081C30" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M 129 22 L 114 27" stroke="#081C30" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M 122 33 L 106 38" stroke="#081C30" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M 114 43 L 98 47" stroke="#081C30" strokeWidth="1.8" strokeLinecap="round" />

      {/* Quill Spine */}
      <path d="M 67 79 L 92 47 L 135 5" stroke="#68C3B4" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M 92 47 L 136 3" stroke="#081C30" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Modern Wryto Brand Logo
 * Vector-perfect, crisp on Retina displays, theme-adaptive with optical centering.
 */
export function WrytoLogo({
  variant = "full",
  size = "md",
  className,
  subtitle,
  highContrast = true,
}: WrytoLogoProps) {
  if (variant === "icon") {
    return <WrytoIcon size={size} className={className} />;
  }

  // Pure Vector SVG Lockup with signature feather, coral baseline, double-stroke W and theme-adaptive "ryto" wordmark
  if (variant === "full") {
    const heightClasses = {
      xs: "h-7",
      sm: "h-9",
      md: "h-11",
      lg: "h-14",
      xl: "h-20",
    };

    return (
      <div
        className={cn(
          "inline-flex items-center select-none text-foreground transition-colors",
          heightClasses[size],
          className,
        )}
      >
        <svg
          viewBox="0 0 210 115"
          className="h-full w-auto max-w-full drop-shadow-2xs"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="Wryto"
        >
          {/* Left Mint Base Vane */}
          <path d="M 80 57 C 79 49, 83 42, 87 37 C 86 44, 85 51, 82 57 Z" fill="#68C3B4" />
          {/* Right Mint Base Vane */}
          <path d="M 91 58 C 98 59, 104 56, 108 52 C 101 53, 95 55, 91 58 Z" fill="#68C3B4" />

          {/* Main Coral Feather Plume */}
          <path
            d="M 84 53 C 84 42, 90 31, 98 22 C 108 11, 121 4, 138 1 C 140 9, 137 19, 129 30 C 122 39, 113 47, 104 52 C 98 55, 92 56, 84 53 Z"
            fill="#E76F64"
          />

          {/* Feather Inner Slits / Shadow Cutouts */}
          <path d="M 91 33 L 90 46" stroke="#081C30" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M 97 24 L 96 41" stroke="#081C30" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M 105 16 L 103 34" stroke="#081C30" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M 129 22 L 114 27" stroke="#081C30" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M 122 33 L 106 38" stroke="#081C30" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M 114 43 L 98 47" stroke="#081C30" strokeWidth="1.8" strokeLinecap="round" />

          {/* Quill Spine */}
          <path d="M 67 79 L 92 47 L 135 5" stroke="#68C3B4" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M 92 47 L 136 3" stroke="#081C30" strokeWidth="1.5" strokeLinecap="round" />

          {/* Horizontal Baseline */}
          <path d="M 6 66.5 Q 105 65.8 204 66.8" stroke="#E76F64" strokeWidth="2" strokeLinecap="round" />

          {/* Wordmark: Stylized "W" + "ryto" */}
          <path
            d="M 28 71 L 39 97 L 51 74 L 64 96 L 77 72"
            stroke="#E76F64"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M 67 98 L 78 79" stroke="#E76F64" strokeWidth="2.5" strokeLinecap="round" />
          <path
            d="M 71 89 C 71 89, 75 94, 75 97.5 C 75 100.2, 72.8 102.4, 70.1 102.4 C 67.4 102.4, 65.2 100.2, 65.2 97.5 C 65.2 94, 69.5 89, 71 89 Z"
            fill="#E76F64"
          />
          <text
            x="83"
            y="97"
            fill="currentColor"
            fontSize="33"
            fontWeight="600"
            letterSpacing="0.03em"
            style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
          >
            ryto
          </text>
        </svg>
      </div>
    );
  }

  // "editorial" & "lockup" variants: quill icon paired with high-contrast literary typography
  const textClasses = {
    xs: "text-lg",
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-3xl sm:text-4xl",
    xl: "text-4xl md:text-5xl",
  };

  return (
    <div className={cn("inline-flex items-center gap-2.5 select-none transition-colors", className)}>
      <WrytoIcon size={size} />
      <div className="flex flex-col justify-center leading-none">
        <span
          className={cn(
            "font-serif font-normal tracking-tight text-foreground transition-colors",
            highContrast && "text-foreground",
            textClasses[size],
          )}
          style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
        >
          Wryto
        </span>
        {subtitle && (
          <span className="mt-0.5 font-sans text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
