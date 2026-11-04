import React, { useState, useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Feather, Sun, Moon, Compass } from "lucide-react";
import { useInkline } from "@/lib/inkline-context";
import { useSettings } from "@/lib/user-settings";
import { JourneyModal } from "@/components/journey-modal";

const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260324_151826_c7218672-6e92-402c-9e45-f1e0f454bdc4.mp4";

export function WrytoCinematicLogo({ className = "h-11 sm:h-13 w-auto" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 210 115"
      width="156"
      height="85"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`block shrink-0 select-none ${className}`}
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
        fill="#B0C4DA"
        fontSize="33"
        fontWeight="500"
        letterSpacing="0.04em"
        style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
      >
        ryto
      </text>
    </svg>
  );
}

export default function CustomHero() {
  const { user } = useInkline();
  const { settings, update } = useSettings();
  const [modalMode, setModalMode] = useState<"signup" | "reading" | null>(null);
  const [videoReady, setVideoReady] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isDark =
    settings.theme === "dark" ||
    (settings.theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-color-scheme: dark)")?.matches);

  const handleToggleTheme = () => {
    void update({ theme: isDark ? "light" : "dark" });
  };

  // Video Autoplay and Resilient Playback Handling
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.defaultMuted = true;
    video.muted = true;
    video.playsInline = true;

    const attemptPlay = () => {
      if (!video) return;
      video.muted = true;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setVideoReady(true);
          })
          .catch(() => {
            // Autoplay will resume upon first user interaction
          });
      }
    };

    attemptPlay();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && video.paused) {
        attemptPlay();
      }
    };

    const handleFirstInteraction = () => {
      if (video.paused) {
        attemptPlay();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pointerdown", handleFirstInteraction, { passive: true });
    window.addEventListener("keydown", handleFirstInteraction, { passive: true });

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pointerdown", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
    };
  }, []);

  return (
    <div
      id="home"
      className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden bg-background text-foreground selection:bg-primary/20 selection:text-primary"
    >
      {/* Fullscreen Looping Cinematic Video */}
      <video
        ref={videoRef}
        src={VIDEO_URL}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        onLoadedData={() => setVideoReady(true)}
        onCanPlay={() => setVideoReady(true)}
        onPlaying={() => setVideoReady(true)}
        className={`fixed inset-0 w-full h-full object-cover z-0 pointer-events-none transition-opacity duration-1000 ${
          videoReady ? "opacity-100" : "opacity-80"
        }`}
      >
        <source src={VIDEO_URL} type="video/mp4" />
      </video>

      {/* Ambient Contrast Scrim: Delivers WCAG AA legibility across video frames */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[1] pointer-events-none bg-gradient-to-b from-black/55 via-black/25 to-black/60"
      />

      {/* Floating Glassmorphic Navigation Header */}
      <header className="relative z-20 w-full">
        <nav
          aria-label="Main Navigation"
          className="max-w-7xl mx-auto px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-between"
        >
          {/* Masthead Brand Lockup: Clean authentic SVG logo only */}
          <Link
            to="/"
            className="inline-flex items-center min-h-[44px] min-w-[44px] focus:outline-none transition-opacity hover:opacity-90 rounded-lg"
            aria-label="Wryto Home"
          >
            <WrytoCinematicLogo className="h-11 sm:h-13 w-auto drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)]" />
          </Link>

          {/* Navigation Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Theme Toggle */}
            <button
              type="button"
              onClick={handleToggleTheme}
              className="liquid-glass-button inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-full text-white/90 hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDark ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
            </button>

            {user ? (
              <Link
                to="/feed"
                className="liquid-glass-button inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 rounded-full text-white font-sans font-medium text-sm hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                Go to Feed
              </Link>
            ) : (
              <>
                <Link
                  to="/feed"
                  className="hidden sm:inline-flex items-center justify-center min-h-[44px] px-3.5 py-2 text-sm font-sans font-medium text-white/80 hover:text-white transition-colors cursor-pointer drop-shadow-xs"
                >
                  Explore
                </Link>
                <Link
                  to="/auth"
                  className="inline-flex items-center justify-center min-h-[44px] px-3.5 py-2 text-sm font-sans font-medium text-white/85 hover:text-white transition-colors drop-shadow-xs"
                >
                  Sign In
                </Link>
                <Link
                  to="/auth"
                  className="liquid-glass-button inline-flex items-center justify-center min-h-[44px] px-5 sm:px-6 py-2.5 rounded-full text-white font-sans font-medium text-sm hover:scale-[1.03] active:scale-[0.98] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 shadow-lg"
                >
                  Start Writing
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* Vertically Centered Cinematic Hero Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-8 py-14 sm:py-20 max-w-5xl mx-auto">
        {/* Grand Literary Headline in Instrument Serif */}
        <h1
          className="text-5xl sm:text-7xl md:text-8xl lg:text-[5.75rem] leading-[1.02] tracking-[-2px] sm:tracking-[-2.5px] max-w-5xl font-normal text-white animate-fade-rise [text-wrap:balance] drop-shadow-[0_4px_28px_rgba(0,0,0,0.55)]"
          style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
        >
          A quiet place for{" "}
          <em className="italic text-white/80">words that matter.</em>
        </h1>

        {/* Subtitle */}
        <p className="font-reading text-lg sm:text-xl text-white/85 max-w-2xl mx-auto leading-relaxed mt-6 sm:mt-8 text-balance animate-fade-rise-delay drop-shadow-[0_2px_14px_rgba(0,0,0,0.45)]">
          A distraction-free publishing haven. No algorithmic outrage. No video noise. Just essays,
          stories, and ideas that linger.
        </p>

        {/* Action Buttons: Cleanly Arranged */}
        <div className="mt-10 sm:mt-14 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5 w-full max-w-md sm:max-w-none animate-fade-rise-delay-2">
          {/* 1. Start Writing -> primary action pill */}
          <Link
            to="/auth"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 min-h-[50px] px-8 sm:px-10 py-3.5 sm:py-4 rounded-full bg-primary text-primary-foreground font-sans font-medium text-base shadow-xl hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            <Feather className="size-4.5" />
            <span>Start Writing</span>
            <ArrowRight className="size-4" />
          </Link>

          {/* 2. Explore Feed -> liquid-glass secondary pill */}
          <Link
            to="/feed"
            className="w-full sm:w-auto liquid-glass-button rounded-full px-8 sm:px-10 py-3.5 sm:py-4 text-base text-white font-medium hover:scale-[1.02] active:scale-[0.98] cursor-pointer inline-flex items-center justify-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 min-h-[50px]"
          >
            <Compass className="size-4.5 text-white/85" />
            <span>Explore Feed</span>
          </Link>
        </div>
      </main>

      {/* Subtle Cinematic Footer Bar */}
      <footer className="relative z-20 w-full py-4 sm:py-6 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-white/65 text-xs font-sans">
          <span>Volume I · The Autumn Edition · A Sanctuary for Thoughtful Writing</span>
          <div className="flex items-center gap-5">
            <Link to="/feed" className="hover:text-white transition-colors">
              Feed
            </Link>
            <Link to="/discover" className="hover:text-white transition-colors">
              Discover
            </Link>
            <Link to="/auth" className="hover:text-white transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </footer>

      {/* Interactive Curated Reading Sanctuary Modal */}
      <JourneyModal
        isOpen={modalMode !== null}
        mode={modalMode ?? "reading"}
        onClose={() => setModalMode(null)}
        onSwitchMode={(mode) => setModalMode(mode)}
      />
    </div>
  );
}

export { CustomHero };
