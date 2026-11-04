import React, { useState, useEffect } from "react";
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
import { WrytoLogo } from "@/components/wryto-logo";

export function WrytoBrandLogo({ className = "h-12 w-auto" }: { className?: string }) {
  return (
    <svg
      width={220}
      height={160}
      viewBox="30 25 220 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ aspectRatio: "220/160" }}
      aria-label="Wryto Logo"
    >
      <g>
        <path
          d="M 32 138 C 80 137.7, 180 137.7, 245 138"
          stroke="#E76F64"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path d="M 112 127 C 110 120 114 113 118 108 C 117 114 117 121 114 127 Z" fill="#68C3B4" />
        <path d="M 126 126 C 132 127 137 122 140 117 C 134 119 129 122 126 126 Z" fill="#68C3B4" />
        <path
          d="M 114 125 C 113 112, 120 95, 128 82 C 137 68, 150 54, 172 38 C 174 46, 170 60, 160 74 C 152 85, 144 98, 140 108 C 136 116, 131 123, 126 126 Z"
          fill="#E76F64"
        />
        <path
          d="M 98 152 L 122 118 L 170 42"
          stroke="#68C3B4"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path d="M 98 152 L 95 157" stroke="#2C3D52" strokeWidth="2.8" strokeLinecap="round" />
        <path d="M 132 80 L 144 87" stroke="#263445" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M 140 68 L 154 77" stroke="#263445" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M 148 56 L 163 65" stroke="#263445" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M 132 94 L 123 99" stroke="#263445" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M 137 106 L 128 112" stroke="#263445" strokeWidth="1.2" strokeLinecap="round" />
        <path
          d="M 98 163 C 98 163 103 170 103 174 C 103 177.3 100.3 180 97 180 C 93.7 180 91 177.3 91 174 C 91 170 96 163 98 163 Z"
          fill="#E76F64"
        />
        <path
          d="M 60 143 L 71 168 L 82 147 L 94 169 L 103 146"
          stroke="#E76F64"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <text
          x="108"
          y="168"
          fill="#93A7BE"
          fontSize="36"
          fontWeight="400"
          letterSpacing="1px"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          ryto
        </text>
      </g>
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

  const isDark =
    settings.theme === "dark" ||
    (settings.theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-color-scheme: dark)")?.matches);

  const handleToggleTheme = () => {
    void update({ theme: isDark ? "light" : "dark" });
  };

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
    <div className="min-h-screen w-full bg-background text-foreground transition-colors duration-200 flex flex-col justify-between selection:bg-primary/20 selection:text-primary">
      {/* Editorial Navigation Header */}
      <header className="w-full border-b border-border/60 bg-background/80 backdrop-blur-md sticky top-0 z-30 transition-colors">
        <nav
          aria-label="Main Navigation"
          className="max-w-7xl mx-auto px-4 sm:px-8 py-3.5 sm:py-4 flex items-center justify-between"
        >
          {/* Masthead Brand Logo */}
          <Link
            to="/"
            className="inline-flex items-center min-h-[44px] min-w-[44px] focus:outline-none transition-opacity hover:opacity-90"
            aria-label="Wryto Home"
          >
            <WrytoLogo variant="editorial" size="sm" subtitle="Volume I" />
          </Link>

          {/* Right Navigation Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Theme Toggle */}
            <button
              type="button"
              onClick={handleToggleTheme}
              className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDark ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
            </button>

            {user ? (
              <Link
                to="/feed"
                className="inline-flex items-center justify-center min-h-[44px] px-5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-sans font-medium shadow-xs hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                Go to Feed
              </Link>
            ) : (
              <>
                <Link
                  to="/feed"
                  className="hidden md:inline-flex items-center justify-center min-h-[44px] px-3.5 py-2 text-sm font-sans font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Explore
                </Link>
                <Link
                  to="/auth"
                  className="inline-flex items-center justify-center min-h-[44px] px-3.5 py-2 text-sm font-sans font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/auth"
                  className="inline-flex items-center justify-center min-h-[44px] px-5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-sans font-medium shadow-xs hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                >
                  Start Writing
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* Flagship Editorial Hero */}
      <main className="flex-1 flex flex-col">
        {/* Cover Hero Section */}
        <section className="relative px-4 sm:px-8 pt-12 sm:pt-20 pb-16 sm:pb-24 max-w-5xl mx-auto text-center flex flex-col items-center">
          {/* Issue Banner */}
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 dark:bg-primary/15 dark:border-primary/30 px-4 py-1.5 text-xs sm:text-sm font-sans font-medium text-primary tracking-wide mb-6 sm:mb-8 transition-colors">
            <Sparkles className="size-3.5 text-primary shrink-0" />
            <span className="text-balance">
              Volume I • The Autumn Edition • A Sanctuary for Thoughtful Writing
            </span>
          </div>

          {/* Grand Literary Headline */}
          <h1 className="font-display text-4xl sm:text-6xl md:text-7xl font-serif font-normal tracking-tight text-foreground text-balance max-w-4xl mx-auto leading-[1.08] animate-fade-rise">
            Where thoughtful words find their quiet home.
          </h1>

          {/* Subtitle */}
          <p className="font-reading text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mt-5 sm:mt-6 text-balance animate-fade-rise-delay">
            A distraction-free publishing haven. No algorithmic outrage. No video noise. Just essays,
            stories, and ideas that linger.
          </p>

          {/* Primary Call-to-Actions */}
          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4 w-full max-w-md sm:max-w-none animate-fade-rise-delay-2">
            {/* Start Writing -> /auth */}
            <Link
              to="/auth"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 min-h-[48px] px-8 py-3.5 rounded-full bg-primary text-primary-foreground font-sans font-medium text-base shadow-sm hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Feather className="size-4.5" />
              <span>Start Writing</span>
              <ArrowRight className="size-4" />
            </Link>

            {/* Explore Stories -> /feed */}
            <Link
              to="/feed"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 min-h-[48px] px-8 py-3.5 rounded-full border border-border bg-card text-foreground font-sans font-medium text-base shadow-xs hover:bg-muted hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <BookOpen className="size-4.5 text-muted-foreground" />
              <span>Explore Stories</span>
            </Link>
          </div>

          {/* Subtle editorial kicker ornament */}
          <div className="mt-12 sm:mt-16 flex items-center justify-center gap-3 text-muted-foreground/60 text-xs tracking-widest uppercase font-sans">
            <span className="h-px w-12 bg-border" />
            <span>Curated Folio</span>
            <span className="h-px w-12 bg-border" />
          </div>
        </section>

        {/* Curated Literary Excerpts Showcase */}
        <section
          aria-labelledby="featured-excerpts-heading"
          className="w-full border-t border-border/60 bg-muted/20 py-16 sm:py-24 px-4 sm:px-8 transition-colors"
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
          className="w-full py-16 sm:py-24 px-4 sm:px-8 border-t border-border/60 transition-colors"
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
        <section className="w-full px-4 sm:px-8 pb-20 sm:pb-28">
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
              <Link
                to="/auth"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 min-h-[48px] px-8 py-3.5 rounded-full bg-primary text-primary-foreground font-sans font-medium text-base shadow-sm hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                <span>Start Writing on Wryto</span>
                <ArrowRight className="size-4" />
              </Link>
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
            <WrytoLogo variant="editorial" size="xs" subtitle="Sanctuary" />
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
            <Link
              to="/auth"
              className="min-h-[44px] inline-flex items-center font-medium text-primary hover:underline transition-colors"
            >
              Start Writing
            </Link>
          </div>
        </div>
      </footer>

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
                <p key={idx} className={selectedExcerpt.category === "Poetry" ? "whitespace-pre-line leading-loose italic" : ""}>
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
              <Link
                to="/auth"
                onClick={() => setSelectedExcerpt(null)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 min-h-[44px] px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-sans text-sm font-medium hover:bg-primary/90 transition-all cursor-pointer shadow-xs"
              >
                <span>Join Wryto & Start Writing</span>
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { CustomHero };
