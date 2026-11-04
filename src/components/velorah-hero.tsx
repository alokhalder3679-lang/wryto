import React, { useState, useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import {
  X,
  Sparkles,
  ArrowRight,
  BookOpen,
  Feather,
  ShieldCheck,
  Users,
  Clock,
  Quote,
  Sun,
  Moon,
  Compass,
} from "lucide-react";
import { useInkline } from "@/lib/inkline-context";
import { useSettings } from "@/lib/user-settings";
import { JourneyModal } from "@/components/journey-modal";

const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260324_151826_c7218672-6e92-402c-9e45-f1e0f454bdc4.mp4";

export function WrytoCinematicLogo({ className = "h-11 sm:h-12 w-auto" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 210 115"
      width="146"
      height="80"
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

interface LiteraryExcerpt {
  id: string;
  category: "Philosophy" | "Essay" | "Poetry";
  title: string;
  author: string;
  authorRole: string;
  readingTime: string;
  pullQuote: string;
  teaser: string;
  paragraphs: string[];
}

const CURATED_EXCERPTS: LiteraryExcerpt[] = [
  {
    id: "philosophy",
    category: "Philosophy",
    title: "The Architecture of Stillness",
    author: "Elena Vance",
    authorRole: "Philosopher & Essayist",
    readingTime: "4 min read",
    pullQuote:
      "We do not think to conquer silence, but to discover what the silence has been trying to tell us.",
    teaser:
      "On recovering contemplative interiority in an epoch of relentless digital acceleration and algorithmic noise.",
    paragraphs: [
      "In an era dominated by hyper-stimulation and constant noise, profound focus has become the rarest luxury. The modern internet was engineered to agitate—to provoke immediate, visceral reactions rather than measured contemplation. Every notification is a tiny demand levied upon the sovereign mind.",
      "Yet great ideas do not arrive under conditions of siege. They emerge in the calm spaces we defend for them: the early morning hour before the city stirs, the unlined margins of an open notebook, the unhurried breath between sentences.",
      "When we step away from algorithmic outrage, we rediscover an interior architecture. The mind ceases to be a frantic filter for external turbulence and becomes, once again, a quiet sanctuary where original thought can take root and flourish.",
    ],
  },
  {
    id: "essay",
    category: "Essay",
    title: "On the Solitude of Ink",
    author: "Julian C. Mercer",
    authorRole: "Author of The Unhurried Page",
    readingTime: "6 min read",
    pullQuote:
      "To write without an audience of algorithmic critics is to speak first to one's own unsettled soul.",
    teaser:
      "Why writing for vanity metrics corrodes authentic expression, and how stepping into the quiet restores creative clarity.",
    paragraphs: [
      "The insidious temptation of modern digital publishing is the instantaneous feedback loop. We write a line, cast it into the digital stream, and immediately check the counter: how many hearts, how many reshares, how many fleeting impressions?",
      "In doing so, we quietly compromise the integrity of our thought. We begin tailoring each phrase to evade criticism or maximize provocation. The cadence of our sentences begins to mimic the platform rather than our blood.",
      "To write with true devotion is an act of solitude. It asks us to sit with our ambiguity, to draft without immediate applause, and to trust that a sentence crafted with precision and sincerity will find the one reader who genuinely needs it.",
    ],
  },
  {
    id: "poetry",
    category: "Poetry",
    title: "Cartography of Dusk",
    author: "Sora Takahashi",
    authorRole: "Poet & Translator",
    readingTime: "2 min read",
    pullQuote:
      "Light leaves the page / as evening folds the margin / into quiet gold.",
    teaser:
      "Verses on the passage of time, the warmth of worn paper, and the sacred geography of quiet rooms.",
    paragraphs: [
      "Between the spoken word and the held breath,\nthere is a valley paved in vellum.",
      "Light leaves the page\nas evening folds the margin\ninto quiet gold.",
      "We gathered words like kindling\nagainst the encroaching cold—\nnot to ignite the horizon,\nbut to keep one small room warm.",
    ],
  },
];

export default function CustomHero() {
  const { user } = useInkline();
  const { settings, update } = useSettings();
  const [selectedExcerpt, setSelectedExcerpt] = useState<LiteraryExcerpt | null>(null);
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

  // Keyboard accessibility for excerpt dialog
  useEffect(() => {
    if (!selectedExcerpt) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedExcerpt(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [selectedExcerpt]);

  return (
    <div className="relative min-h-screen w-full bg-background text-foreground transition-colors duration-200 flex flex-col justify-between selection:bg-primary/20 selection:text-primary">
      {/* ── TOP HERO REGION: Video Canvas & Glassmorphic Masthead ─────────── */}
      <section className="relative min-h-screen w-full flex flex-col justify-between overflow-hidden">
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
          className={`absolute inset-0 w-full h-full object-cover z-0 pointer-events-none transition-opacity duration-1000 ${
            videoReady ? "opacity-100" : "opacity-80"
          }`}
        >
          <source src={VIDEO_URL} type="video/mp4" />
        </video>

        {/* Ambient Contrast Scrim: Delivers WCAG AA legibility across video frames and seamlessly blends into page background */}
        <div
          aria-hidden="true"
          className="absolute inset-0 z-[1] pointer-events-none bg-gradient-to-b from-black/55 via-black/25 via-60% to-background"
        />

        {/* Floating Glassmorphic Navigation Header */}
        <header className="relative z-20 w-full">
          <nav
            aria-label="Main Navigation"
            className="max-w-7xl mx-auto px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-between"
          >
            {/* Masthead Brand Lockup */}
            <Link
              to="/"
              className="inline-flex items-center gap-3 min-h-[44px] min-w-[44px] focus:outline-none transition-opacity hover:opacity-90 rounded-lg group"
              aria-label="Wryto Home"
            >
              <WrytoCinematicLogo className="h-10 sm:h-12 w-auto drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)]" />
              <div className="hidden sm:flex flex-col text-left">
                <span className="font-serif text-white font-normal text-lg tracking-tight leading-none drop-shadow-md">
                  Wryto
                </span>
                <span className="text-[10px] tracking-widest uppercase font-sans text-white/70 font-medium">
                  Volume I
                </span>
              </div>
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
                  <a
                    href="#excerpts"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById("excerpts")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="hidden sm:inline-flex items-center justify-center min-h-[44px] px-3.5 py-2 text-sm font-sans font-medium text-white/80 hover:text-white transition-colors cursor-pointer drop-shadow-xs"
                  >
                    Explore
                  </a>
                  <Link
                    to="/auth"
                    className="inline-flex items-center justify-center min-h-[44px] px-3.5 py-2 text-sm font-sans font-medium text-white/85 hover:text-white transition-colors drop-shadow-xs"
                  >
                    Sign In
                  </Link>
                  <button
                    type="button"
                    onClick={() => setModalMode("signup")}
                    className="liquid-glass-button inline-flex items-center justify-center min-h-[44px] px-5 sm:px-6 py-2.5 rounded-full text-white font-sans font-medium text-sm hover:scale-[1.03] active:scale-[0.98] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 shadow-lg"
                  >
                    Start Writing
                  </button>
                </>
              )}
            </div>
          </nav>
        </header>

        {/* Vertically Centered Cinematic Hero Content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-8 py-10 sm:py-16 max-w-5xl mx-auto">
          {/* Issue Badge Pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-md px-4 py-1.5 text-xs sm:text-sm font-sans font-medium text-white/90 tracking-wide mb-6 sm:mb-8 shadow-sm transition-all">
            <Sparkles className="size-3.5 text-white/90 shrink-0" />
            <span className="text-balance">
              Volume I • The Autumn Edition • A Sanctuary for Thoughtful Writing
            </span>
          </div>

          {/* Grand Literary Headline in Instrument Serif */}
          <h1
            className="text-5xl sm:text-7xl md:text-8xl lg:text-[5.75rem] leading-[1.03] tracking-[-2px] sm:tracking-[-2.5px] max-w-5xl font-normal text-white animate-fade-rise [text-wrap:balance] drop-shadow-[0_4px_28px_rgba(0,0,0,0.55)]"
            style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
          >
            A quiet place for{" "}
            <em className="italic text-white/80">words that matter.</em>
          </h1>

          {/* Subtitle */}
          <p className="font-reading text-lg sm:text-xl text-white/85 max-w-2xl mx-auto leading-relaxed mt-5 sm:mt-7 text-balance animate-fade-rise-delay drop-shadow-[0_2px_14px_rgba(0,0,0,0.45)]">
            A distraction-free publishing haven. No algorithmic outrage. No video noise. Just essays,
            stories, and ideas that linger.
          </p>

          {/* Primary Action Buttons */}
          <div className="mt-8 sm:mt-12 flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4 w-full max-w-md sm:max-w-none animate-fade-rise-delay-2">
            {/* 1. Begin Reading -> opens interactive reading sanctuary */}
            <button
              type="button"
              onClick={() => setModalMode("reading")}
              className="w-full sm:w-auto liquid-glass-button rounded-full px-8 sm:px-10 py-3.5 sm:py-4 text-base text-white font-medium hover:scale-[1.03] active:scale-[0.98] cursor-pointer inline-flex items-center justify-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 shadow-lg min-h-[48px]"
            >
              <BookOpen className="size-4.5 text-white/90" />
              <span>Begin Reading</span>
            </button>

            {/* 2. Start Writing -> direct signup / compose */}
            <Link
              to="/auth"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 min-h-[48px] px-8 sm:px-9 py-3.5 sm:py-4 rounded-full bg-primary text-primary-foreground font-sans font-medium text-base shadow-lg hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Feather className="size-4.5" />
              <span>Start Writing</span>
              <ArrowRight className="size-4" />
            </Link>

            {/* 3. Explore Stories -> scroll to folio */}
            <a
              href="#excerpts"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById("excerpts")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="w-full sm:w-auto liquid-glass-button rounded-full px-7 sm:px-8 py-3.5 sm:py-4 text-base text-white/90 font-medium hover:scale-[1.02] active:scale-[0.98] cursor-pointer inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 min-h-[48px]"
            >
              <Compass className="size-4.5 text-white/80" />
              <span>Explore Stories</span>
            </a>
          </div>

          {/* Folio Indicator Anchor */}
          <a
            href="#excerpts"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById("excerpts")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="mt-12 sm:mt-16 inline-flex items-center justify-center gap-3 text-white/70 hover:text-white text-xs tracking-widest uppercase font-sans transition-colors cursor-pointer group"
          >
            <span className="h-px w-10 bg-white/30 group-hover:w-14 transition-all" />
            <span>Curated Folio</span>
            <span className="h-px w-10 bg-white/30 group-hover:w-14 transition-all" />
          </a>
        </div>
      </section>

      {/* ── LOWER PAGE REGIONS: Curated Excerpts, Pillars & Sanctuary ─────── */}
      <main className="flex-1 flex flex-col">
        {/* Curated Literary Excerpts Showcase */}
        <section
          id="excerpts"
          aria-labelledby="featured-excerpts-heading"
          className="w-full bg-background py-16 sm:py-24 px-4 sm:px-8 transition-colors scroll-mt-6"
        >
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
              <span className="text-xs font-sans uppercase tracking-[0.2em] text-primary font-semibold">
                Curated Excerpts
              </span>
              <h2
                id="featured-excerpts-heading"
                className="font-display text-3xl sm:text-4xl md:text-5xl font-serif text-foreground tracking-tight mt-2"
              >
                Voices from the Autumn Folio
              </h2>
              <p className="font-reading text-base sm:text-lg text-muted-foreground mt-3">
                Selected reflections on stillness, craft, and contemplation. Click any excerpt to read the
                curated preview.
              </p>
            </div>

            {/* 3 Interactive Curated Snippet Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              {CURATED_EXCERPTS.map((excerpt) => (
                <article
                  key={excerpt.id}
                  onClick={() => setSelectedExcerpt(excerpt)}
                  className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-6 sm:p-7 shadow-xs hover:shadow-md hover:border-primary/40 transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                >
                  <div>
                    {/* Category & Reading Time Tag */}
                    <div className="flex items-center justify-between text-xs font-sans mb-4">
                      <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium tracking-wide">
                        {excerpt.category}
                      </span>
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Clock className="size-3.5" />
                        {excerpt.readingTime}
                      </span>
                    </div>

                    {/* Excerpt Title */}
                    <h3 className="font-display text-2xl font-serif text-foreground group-hover:text-primary transition-colors mb-3 leading-snug">
                      {excerpt.title}
                    </h3>

                    {/* Pull Quote Callout */}
                    <blockquote className="border-l-2 border-primary/50 pl-3.5 my-4 italic font-reading text-sm sm:text-base text-foreground/90 leading-relaxed bg-muted/30 py-2 pr-2 rounded-r-md">
                      “{excerpt.pullQuote}”
                    </blockquote>

                    {/* Teaser text */}
                    <p className="text-xs sm:text-sm text-muted-foreground font-sans leading-relaxed">
                      {excerpt.teaser}
                    </p>
                  </div>

                  {/* Author Signature & Interactive Trigger */}
                  <div className="mt-6 pt-5 border-t border-border/60">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="size-8 rounded-full bg-primary/15 text-primary flex items-center justify-center font-serif text-xs font-semibold shrink-0">
                        {excerpt.author.charAt(0)}
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="font-sans text-sm font-medium text-foreground leading-tight">
                          {excerpt.author}
                        </span>
                        <span className="font-sans text-xs text-muted-foreground">
                          {excerpt.authorRole}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedExcerpt(excerpt);
                      }}
                      className="w-full inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 rounded-xl border border-border bg-muted/40 group-hover:bg-primary group-hover:border-primary group-hover:text-primary-foreground text-foreground text-xs sm:text-sm font-sans font-medium transition-all duration-200 cursor-pointer"
                      aria-label={`Read excerpt of ${excerpt.title} by ${excerpt.author}`}
                    >
                      <BookOpen className="size-3.5" />
                      <span>Read Excerpt</span>
                      <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Value Pillars Section */}
        <section
          aria-labelledby="pillars-heading"
          className="w-full py-16 sm:py-24 px-4 sm:px-8 border-t border-border/60 transition-colors bg-muted/20"
        >
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-14 sm:mb-16">
              <span className="text-xs font-sans uppercase tracking-[0.2em] text-primary font-semibold">
                Core Philosophy
              </span>
              <h2
                id="pillars-heading"
                className="font-display text-3xl sm:text-4xl md:text-5xl font-serif text-foreground tracking-tight mt-2"
              >
                A Sanctuary Built for Depth
              </h2>
              <p className="font-reading text-base sm:text-lg text-muted-foreground mt-3">
                Crafted from first principles to resist the attention economy and honor the dignity of
                thoughtful writing.
              </p>
            </div>

            {/* The 3 Value Pillars */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Pillar 1: Distraction-Free Reading */}
              <div className="flex flex-col rounded-2xl border border-border bg-card p-7 sm:p-8 shadow-xs">
                <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6">
                  <BookOpen className="size-6" />
                </div>
                <span className="font-sans text-xs font-semibold uppercase tracking-widest text-primary mb-1">
                  01 · Reading Sanctuary
                </span>
                <h3 className="font-display text-xl sm:text-2xl font-serif text-foreground mb-3">
                  Distraction-Free Reading
                </h3>
                <p className="font-reading text-sm sm:text-base text-muted-foreground leading-relaxed">
                  Generous reading margins, bespoke serif typography (Newsreader & Literata), and zero
                  commercial ads or algorithmic clickbait. An immersive typographic haven tuned for
                  contemplation.
                </p>
              </div>

              {/* Pillar 2: Calm Communities */}
              <div className="flex flex-col rounded-2xl border border-border bg-card p-7 sm:p-8 shadow-xs">
                <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6">
                  <Users className="size-6" />
                </div>
                <span className="font-sans text-xs font-semibold uppercase tracking-widest text-primary mb-1">
                  02 · Civil Resonance
                </span>
                <h3 className="font-display text-xl sm:text-2xl font-serif text-foreground mb-3">
                  Calm Communities
                </h3>
                <p className="font-reading text-sm sm:text-base text-muted-foreground leading-relaxed">
                  Subtle threaded letters, thoughtful longform dialogue, and follow-restricted private
                  notes. No rage-baiting algorithmic feeds or public dunking mechanisms.
                </p>
              </div>

              {/* Pillar 3: Your Work, Protected */}
              <div className="flex flex-col rounded-2xl border border-border bg-card p-7 sm:p-8 shadow-xs">
                <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6">
                  <ShieldCheck className="size-6" />
                </div>
                <span className="font-sans text-xs font-semibold uppercase tracking-widest text-primary mb-1">
                  03 · Creative Sovereignty
                </span>
                <h3 className="font-display text-xl sm:text-2xl font-serif text-foreground mb-3">
                  Your Work, Protected
                </h3>
                <p className="font-reading text-sm sm:text-base text-muted-foreground leading-relaxed">
                  Comprehensive privacy controls, customizable visibility bounds, and perpetual author
                  ownership. Your essays and creative reflections remain yours forever.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Closing Sanctuary Call to Action */}
        <section className="w-full px-4 sm:px-8 py-20 sm:py-28">
          <div className="max-w-4xl mx-auto rounded-3xl border border-border bg-card p-8 sm:p-14 text-center shadow-xs">
            <div className="inline-flex items-center justify-center size-12 rounded-full bg-primary/10 text-primary mb-5">
              <Feather className="size-6" />
            </div>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-serif text-foreground tracking-tight mb-4">
              Step into the quiet.
            </h2>
            <p className="font-reading text-base sm:text-lg text-muted-foreground max-w-xl mx-auto mb-8 leading-relaxed">
              Whether drafting personal essays, philosophic treatises, or quiet poetry, claim your desk
              among authors who value substance.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => setModalMode("signup")}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 min-h-[48px] px-8 py-3.5 rounded-full bg-primary text-primary-foreground font-sans font-medium text-base shadow-sm hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                <span>Start Writing on Wryto</span>
                <ArrowRight className="size-4" />
              </button>
              <Link
                to="/feed"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 min-h-[48px] px-8 py-3.5 rounded-full border border-border bg-background text-foreground font-sans font-medium text-base hover:bg-muted hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                <Compass className="size-4 text-muted-foreground" />
                <span>Explore the Feed</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Editorial Footer */}
      <footer className="w-full border-t border-border/60 bg-background py-10 px-4 sm:px-8 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
            <WrytoCinematicLogo className="h-8 w-auto" />
            <span className="hidden sm:inline text-muted-foreground/40">•</span>
            <span className="font-sans text-xs text-muted-foreground">
              Volume I · The Autumn Edition · Written for thinkers & creators.
            </span>
          </div>

          <div className="flex items-center gap-6 font-sans text-xs text-muted-foreground">
            <Link
              to="/feed"
              className="min-h-[44px] inline-flex items-center hover:text-foreground transition-colors"
            >
              Feed
            </Link>
            <Link
              to="/discover"
              className="min-h-[44px] inline-flex items-center hover:text-foreground transition-colors"
            >
              Discover
            </Link>
            <Link
              to="/auth"
              className="min-h-[44px] inline-flex items-center hover:text-foreground transition-colors"
            >
              Sign In
            </Link>
            <button
              type="button"
              onClick={() => setModalMode("signup")}
              className="min-h-[44px] inline-flex items-center font-medium text-primary hover:underline transition-colors cursor-pointer"
            >
              Start Writing
            </button>
          </div>
        </div>
      </footer>

      {/* Interactive Curated Reading Sanctuary Modal from velorah-hero */}
      <JourneyModal
        isOpen={modalMode !== null}
        mode={modalMode ?? "reading"}
        onClose={() => setModalMode(null)}
        onSwitchMode={(mode) => setModalMode(mode)}
      />

      {/* Interactive Curated Excerpt Preview Modal */}
      {selectedExcerpt && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="excerpt-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 dark:bg-black/75 backdrop-blur-sm animate-fade-rise"
          onClick={() => setSelectedExcerpt(null)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl border border-border bg-card p-6 sm:p-10 shadow-2xl text-card-foreground custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Close Button (min 44x44px clickable target) */}
            <button
              type="button"
              onClick={() => setSelectedExcerpt(null)}
              className="absolute top-5 right-5 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="size-5" />
            </button>

            {/* Excerpt Meta Header */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-sans font-medium text-primary bg-primary/10 border border-primary/20 mb-4">
              <Quote className="size-3 text-primary" />
              <span>{selectedExcerpt.category} · Volume I</span>
              <span className="text-primary/40">•</span>
              <span>{selectedExcerpt.readingTime}</span>
            </div>

            {/* Title & Author Byline */}
            <h2
              id="excerpt-dialog-title"
              className="font-display text-2xl sm:text-4xl font-serif text-foreground tracking-tight leading-tight"
            >
              {selectedExcerpt.title}
            </h2>

            <div className="flex items-center gap-3 mt-3 mb-6 pb-5 border-b border-border/60">
              <div className="size-9 rounded-full bg-primary/15 text-primary flex items-center justify-center font-serif text-sm font-semibold">
                {selectedExcerpt.author.charAt(0)}
              </div>
              <div className="flex flex-col text-left">
                <span className="font-sans text-sm font-medium text-foreground">
                  {selectedExcerpt.author}
                </span>
                <span className="font-sans text-xs text-muted-foreground">
                  {selectedExcerpt.authorRole}
                </span>
              </div>
            </div>

            {/* Pull Quote Highlight */}
            <div className="bg-primary/5 border-l-3 border-primary p-4 rounded-r-xl italic font-reading text-base sm:text-lg text-foreground mb-6 leading-relaxed">
              “{selectedExcerpt.pullQuote}”
            </div>

            {/* Excerpt Body Paragraphs */}
            <div className="space-y-4 font-reading text-base sm:text-lg text-foreground/90 leading-relaxed">
              {selectedExcerpt.paragraphs.map((p, idx) => (
                <p
                  key={idx}
                  className={
                    selectedExcerpt.category === "Poetry"
                      ? "whitespace-pre-line leading-loose italic"
                      : ""
                  }
                >
                  {p}
                </p>
              ))}
            </div>

            {/* Modal Action Footer */}
            <div className="mt-8 pt-6 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setSelectedExcerpt(null)}
                className="w-full sm:w-auto inline-flex items-center justify-center min-h-[44px] px-6 py-2.5 rounded-full border border-border text-foreground hover:bg-muted font-sans text-sm transition-colors cursor-pointer"
              >
                Close Preview
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedExcerpt(null);
                  setModalMode("signup");
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 min-h-[44px] px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-sans text-sm font-medium hover:bg-primary/90 transition-all cursor-pointer shadow-xs"
              >
                <span>Join Wryto & Start Writing</span>
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { CustomHero };
