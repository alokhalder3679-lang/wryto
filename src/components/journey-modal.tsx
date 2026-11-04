import React, { useState, useEffect, useRef } from "react";
import { X, CheckCircle2, ArrowRight, BookOpen } from "lucide-react";
import { WrytoLogo } from "@/components/wryto-logo";

interface JourneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "signup" | "reading";
  onSwitchMode: (mode: "signup" | "reading") => void;
}

interface EssayItem {
  id: string;
  number: string;
  shortLabel: string;
  issue: string;
  readTime: string;
  title: string;
  author: string;
  paragraphs: string[];
  pullQuote: string;
}

const CURATED_ESSAYS: EssayItem[] = [
  {
    id: "stillness",
    number: "01",
    shortLabel: "01. Stillness",
    issue: "Issue 01",
    readTime: "4 min read",
    title: "The Architecture of Stillness",
    author: "Clara Vance",
    paragraphs: [
      "In an era dominated by hyper-stimulation and constant noise, profound focus has become our rarest luxury. Enduring ideas never arrive with shouting; they emerge in deliberate, protected stillness.",
      "At Wryto, we believe a writing sanctuary should never demand your attention—it should shelter it. We craft digital environments that recede quietly into the background, stripping away notifications, metrics, and visual friction until only your clearest thoughts remain.",
      "When the page stops competing with the mind, sentences regain their natural cadence. You begin to write not for an algorithm, but for permanence.",
    ],
    pullQuote: "Where dreams rise through the silence, inspired words find their lasting form.",
  },
  {
    id: "slow-writing",
    number: "02",
    shortLabel: "02. Slow Writing",
    issue: "Issue 02",
    readTime: "5 min read",
    title: "In Praise of the Unhurried Draft",
    author: "Julian Thorne",
    paragraphs: [
      "Speed is the enemy of nuance. Modern tools optimize for rapid output, nudging writers to publish before a thought has fully settled into its true shape.",
      "Unhurried writing honors the pause between sentences. It treats hesitation not as a bottleneck to be eliminated, but as the quiet workshop where precision is forged.",
      "Give a paragraph room to breathe, and it will tell you what it actually means to say.",
    ],
    pullQuote: "Clarity is rarely the first thing we write; it is what remains after the noise falls away.",
  },
  {
    id: "quiet-letters",
    number: "03",
    shortLabel: "03. Quiet Letters",
    issue: "Issue 03",
    readTime: "3 min read",
    title: "Letters Sent Across the Quiet",
    author: "Elena Rostova",
    paragraphs: [
      "Before feeds and timelines, reading was an intimate correspondence between two minds across time and distance. Opening an essay felt like unfolding a letter written specifically for a quiet hour.",
      "Wryto restores that covenant between writer and reader—no infinite scroll, no sidebar distractions, only typography proportioned for contemplation and words chosen with care.",
    ],
    pullQuote: "To read deeply is to share a room of silence with another mind.",
  },
];

export function JourneyModal({
  isOpen,
  onClose,
  mode,
  onSwitchMode,
}: JourneyModalProps) {
  const [activeEssayId, setActiveEssayId] = useState<string>(CURATED_ESSAYS[0].id);
  const [largeText, setLargeText] = useState<boolean>(false);
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [submitted, setSubmitted] = useState<boolean>(false);

  const emailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && mode === "signup" && !submitted) {
      const timer = setTimeout(() => {
        emailInputRef.current?.focus();
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [isOpen, mode, submitted]);

  if (!isOpen) return null;

  const currentEssay =
    CURATED_ESSAYS.find((item) => item.id === activeEssayId) || CURATED_ESSAYS[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes("@") || !trimmedEmail.includes(".")) {
      setError("Please enter a valid email address to continue.");
      return;
    }
    setError("");
    setSubmitted(true);
  };

  const handleResetAndClose = () => {
    setSubmitted(false);
    setError("");
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="wryto-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md animate-fade-rise"
      onClick={handleResetAndClose}
    >
      <div
        className={`liquid-glass rounded-3xl w-full ${
          mode === "reading" ? "max-w-2xl" : "max-w-md"
        } p-6 sm:p-9 text-foreground border border-white/15 shadow-2xl relative transition-all duration-200`}
        style={{
          background: "rgba(8, 16, 28, 0.92)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top-Right Close Button */}
        <button
          type="button"
          onClick={handleResetAndClose}
          className="absolute top-5 right-5 text-muted-foreground hover:text-foreground transition-colors p-2 rounded-full hover:bg-white/10 cursor-pointer spring-press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {mode === "reading" ? (
          <div>
            {/* Essay Selector Bar + Reading Comfort Control */}
            <div className="flex flex-wrap items-center justify-between gap-3 pr-10 mb-6 pb-4 border-b border-white/10">
              <div
                role="tablist"
                aria-label="Curated Essays"
                className="flex items-center gap-1 p-1 bg-white/[0.06] rounded-xl"
              >
                {CURATED_ESSAYS.map((essay) => {
                  const isActive = essay.id === currentEssay.id;
                  return (
                    <button
                      key={essay.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setActiveEssayId(essay.id)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all spring-press whitespace-nowrap shrink-0 cursor-pointer ${
                        isActive
                          ? "bg-white/15 text-white shadow-xs font-semibold"
                          : "text-white/60 hover:text-white"
                      }`}
                    >
                      {essay.shortLabel}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setLargeText((prev) => !prev)}
                className="px-3 py-1.5 text-xs text-white/70 hover:text-white bg-white/[0.06] hover:bg-white/12 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer spring-press"
                title="Toggle reading text size"
              >
                {largeText ? "Text: Large" : "Text: Standard"}
              </button>
            </div>

            {/* Clean Unboxed Metadata */}
            <div className="flex items-center gap-2 text-xs text-white/60 mb-3 font-mono">
              <BookOpen className="w-3.5 h-3.5 text-white/75 shrink-0" />
              <span>Wryto Journal</span>
              <span aria-hidden="true">·</span>
              <span>{currentEssay.issue}</span>
              <span aria-hidden="true">·</span>
              <span>By {currentEssay.author}</span>
              <span aria-hidden="true">·</span>
              <span>{currentEssay.readTime}</span>
            </div>

            {/* Essay Headline */}
            <h2
              id="wryto-modal-title"
              className="text-3xl sm:text-4xl font-normal tracking-tight mb-5 text-white leading-[1.08]"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              {currentEssay.title}
            </h2>

            {/* Essay Body */}
            <div
              className={`space-y-4 text-white/80 leading-relaxed max-h-[48vh] overflow-y-auto pr-2 custom-scrollbar ${
                largeText ? "text-base sm:text-lg" : "text-sm sm:text-base"
              }`}
            >
              {currentEssay.paragraphs.map((paragraph, idx) => (
                <p key={idx} className="text-white/85">
                  {paragraph}
                </p>
              ))}

              <blockquote
                className="pt-3 pb-1 text-xl sm:text-2xl italic text-white/95 border-l-2 border-primary/60 pl-4 my-2"
                style={{ fontFamily: "'Instrument Serif', serif" }}
              >
                &ldquo;{currentEssay.pullQuote}&rdquo;
              </blockquote>
            </div>

            {/* Reader Footer */}
            <div className="mt-7 pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-white/60 font-mono">
                <span>Edition {currentEssay.number} of 03</span>
                <span aria-hidden="true">·</span>
                <span>Distraction-free Sanctuary</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const currentIndex = CURATED_ESSAYS.findIndex(
                      (e) => e.id === currentEssay.id
                    );
                    const nextIndex = (currentIndex + 1) % CURATED_ESSAYS.length;
                    setActiveEssayId(CURATED_ESSAYS[nextIndex].id);
                  }}
                  className="px-4 py-2 text-xs text-white/70 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer spring-press"
                >
                  Next Essay
                </button>

                <button
                  type="button"
                  onClick={() => onSwitchMode("signup")}
                  className="liquid-glass-button rounded-full px-5 py-2.5 text-xs text-white hover:scale-[1.03] active:scale-[0.98] transition-all cursor-pointer font-medium whitespace-nowrap shrink-0 inline-flex items-center gap-1.5"
                >
                  <span>Sign Up for Editions</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ) : !submitted ? (
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <WrytoLogo variant="full" size="md" className="h-10 w-auto" />
            </div>

            <h2
              id="wryto-modal-title"
              className="text-3xl sm:text-4xl font-normal tracking-tight mb-2.5 text-white"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Join the Sanctuary
            </h2>

            <p className="text-white/70 text-sm leading-relaxed mb-6">
              Create your quiet space on Wryto to read curated editions and write without distraction.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-left" noValidate>
              <div>
                <label htmlFor="wryto-name" className="block text-xs text-white/70 mb-1.5 ml-1">
                  Your Name (optional)
                </label>
                <input
                  id="wryto-name"
                  type="text"
                  placeholder="Clara Vance"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-white/[0.06] border border-white/15 text-white placeholder:text-white/40 text-sm focus:outline-none focus:border-white/45 transition-colors"
                />
              </div>

              <div>
                <label htmlFor="wryto-email" className="block text-xs text-white/70 mb-1.5 ml-1">
                  Email Address
                </label>
                <input
                  ref={emailInputRef}
                  id="wryto-email"
                  type="email"
                  required
                  placeholder="you@domain.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError("");
                  }}
                  className="w-full px-4 py-3 rounded-2xl bg-white/[0.06] border border-white/15 text-white placeholder:text-white/40 text-sm focus:outline-none focus:border-white/45 transition-colors"
                />
              </div>

              {error && (
                <p role="alert" className="text-xs text-rose-400 pl-1">
                  {error}
                </p>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full liquid-glass-button rounded-full py-3.5 px-6 text-sm text-white font-medium flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] cursor-pointer whitespace-nowrap"
                >
                  <span>Complete Sign Up</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>

            <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-center gap-2 text-xs text-white/70">
              <span>Want to explore first?</span>
              <button
                type="button"
                onClick={() => onSwitchMode("reading")}
                className="text-white underline underline-offset-4 hover:opacity-80 cursor-pointer"
              >
                Begin Reading
              </button>
            </div>
          </div>
        ) : (
          <div className="py-4 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4 text-emerald-400 bg-emerald-400/10 border border-emerald-400/25">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <h2
              id="wryto-modal-title"
              className="text-3xl sm:text-4xl font-normal mb-2.5 text-white"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Welcome{name.trim() ? `, ${name.trim()}` : " to Wryto"}
            </h2>

            <p className="text-white/70 text-sm leading-relaxed mb-6">
              Your sanctuary key has been reserved for{" "}
              <span className="text-white font-medium">{email}</span>. You now have full access to our quiet reading editions.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  onSwitchMode("reading");
                }}
                className="liquid-glass-button rounded-full px-7 py-2.5 text-sm text-white font-medium hover:scale-[1.02] cursor-pointer whitespace-nowrap"
              >
                Read Issue 01
              </button>
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-5 py-2.5 text-xs text-white/70 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
              >
                Return to Home
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
