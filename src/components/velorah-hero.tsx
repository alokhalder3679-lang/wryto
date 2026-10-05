import React, { useState, useRef, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { X, Sparkles, CheckCircle2, ArrowRight, BookOpen, Compass } from "lucide-react";
import { useInkline } from "@/lib/inkline-context";

const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260324_151826_c7218672-6e92-402c-9e45-f1e0f454bdc4.mp4";

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
        {/* Horizontal dividing line */}
        <path
          d="M 32 138 C 80 137.7, 180 137.7, 245 138"
          stroke="#E76F64"
          strokeWidth="1.8"
          strokeLinecap="round"
        />

        {/* Mint / Cyan accent patches */}
        <path d="M 112 127 C 110 120 114 113 118 108 C 117 114 117 121 114 127 Z" fill="#68C3B4" />
        <path d="M 126 126 C 132 127 137 122 140 117 C 134 119 129 122 126 126 Z" fill="#68C3B4" />

        {/* Main Coral Feather Plume */}
        <path
          d="M 114 125 
             C 113 112, 120 95, 128 82 
             C 137 68, 150 54, 172 38
             C 174 46, 170 60, 160 74
             C 152 85, 144 98, 140 108
             C 136 116, 131 123, 126 126
             Z"
          fill="#E76F64"
        />

        {/* Quill Shaft */}
        <path
          d="M 98 152 L 122 118 L 170 42"
          stroke="#68C3B4"
          strokeWidth="2.4"
          strokeLinecap="round"
        />

        {/* Nib */}
        <path d="M 98 152 L 95 157" stroke="#2C3D52" strokeWidth="2.8" strokeLinecap="round" />

        {/* Feather Inner Slits */}
        <path d="M 132 80 L 144 87" stroke="#263445" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M 140 68 L 154 77" stroke="#263445" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M 148 56 L 163 65" stroke="#263445" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M 132 94 L 123 99" stroke="#263445" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M 137 106 L 128 112" stroke="#263445" strokeWidth="1.2" strokeLinecap="round" />

        {/* Ink Droplet */}
        <path
          d="M 98 163 C 98 163 103 170 103 174 C 103 177.3 100.3 180 97 180 C 93.7 180 91 177.3 91 174 C 91 170 96 163 98 163 Z"
          fill="#E76F64"
        />

        {/* Stylized 'W' in Coral matching pen nib */}
        <path
          d="M 60 143 L 71 168 L 82 147 L 94 169 L 103 146"
          stroke="#E76F64"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 'ryto' wordmark */}
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

export default function CustomHero() {
  const [modalMode, setModalMode] = useState<"signup" | "reading" | null>(null);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { user } = useInkline();

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = true;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Handled gracefully in background
        });
      }
    }
  }, []);

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
    }
  };

  const handleCloseModal = () => {
    setModalMode(null);
    setSubmitted(false);
    setEmail("");
  };

  return (
    <div className="relative min-h-screen h-screen w-full flex flex-col justify-between overflow-x-hidden bg-[#00172d] text-white">
      {/* Fullscreen Video Background */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        src={VIDEO_URL}
        className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
      >
        <source src={VIDEO_URL} type="video/mp4" />
      </video>

      {/* Atmospheric Vignette Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none z-[1]" />

      {/* Glassmorphic Navigation */}
      <header className="relative z-10 w-full">
        <nav
          aria-label="Main Navigation"
          className="flex row justify-between items-center px-6 sm:px-10 py-5 sm:py-6 max-w-7xl mx-auto"
        >
          {/* Brand Logo */}
          <Link
            to="/"
            className="inline-flex items-center transition-opacity hover:opacity-90 focus:outline-none min-w-[120px]"
            aria-label="Wryto Home"
          >
            <WrytoBrandLogo className="h-12 sm:h-14 w-auto drop-shadow-sm" />
          </Link>

          {/* Right Navigation Action */}
          <div className="flex items-center gap-3">
            {user ? (
              <Link
                to="/feed"
                className="liquid-glass rounded-full px-6 py-2.5 text-sm text-white hover:scale-[1.03] active:scale-[0.98] transition-transform duration-200 cursor-pointer font-medium"
              >
                Go to Feed
              </Link>
            ) : (
              <>
                <Link
                  to="/auth"
                  className="hidden sm:inline-flex text-sm text-white/80 hover:text-white px-4 py-2 transition-colors font-medium"
                >
                  Sign In
                </Link>
                <Link
                  to="/auth"
                  className="liquid-glass rounded-full px-6 py-2.5 text-sm text-white hover:scale-[1.03] active:scale-[0.98] transition-transform duration-200 cursor-pointer font-medium"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* Vertically Positioned Cinematic Hero */}
      <main className="relative z-10 flex flex-col items-center justify-start text-center px-6 pt-3 sm:pt-6 md:pt-8 pb-10 flex-1 max-w-5xl mx-auto">
        {/* Curated Journal Tagline Pill */}
        <button
          type="button"
          onClick={() => setModalMode("reading")}
          className="liquid-glass rounded-full px-4 py-1.5 text-xs text-white/80 hover:text-white hover:scale-105 transition-all duration-300 mb-3 sm:mb-4 inline-flex items-center gap-2 cursor-pointer border border-white/10"
        >
          <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
          <span>Wryto Journal · Issue 01</span>
          <span className="text-white/40">·</span>
          <span className="text-white/70">Read Story</span>
        </button>

        {/* Cinematic Heading */}
        <h1
          className="text-5xl sm:text-7xl md:text-8xl lg:text-[5.75rem] leading-[1.02] tracking-[-2px] sm:tracking-[-3px] font-normal text-white animate-fade-rise"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          A quiet place for <span className="italic text-white/70">words that matter.</span>
        </h1>

        <p className="mt-3 sm:mt-4 text-base sm:text-lg text-white/80 max-w-xl mx-auto font-light tracking-wide leading-relaxed animate-fade-rise">
          Share words, discover writers, and read without distraction.
        </p>

        {/* Hero CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4 mt-6 sm:mt-8 animate-fade-rise-delay w-full max-w-md sm:max-w-none">
          {/* Begin Reading -> /feed */}
          <Link
            to="/feed"
            className="w-full sm:w-auto liquid-glass rounded-full px-10 sm:px-14 py-3.5 sm:py-4 text-base font-medium text-white hover:scale-[1.03] active:scale-[0.98] cursor-pointer transition-transform duration-300 inline-flex items-center justify-center shadow-lg"
          >
            Begin Reading
          </Link>

          {/* Explore as Guest -> /discover */}
          <Link
            to="/discover"
            className="w-full sm:w-auto liquid-glass rounded-full px-8 sm:px-10 py-3.5 sm:py-4 text-base font-normal text-white/80 hover:text-white hover:scale-[1.03] active:scale-[0.98] cursor-pointer transition-all duration-300 inline-flex items-center justify-center border border-white/15 gap-2"
          >
            <Compass className="w-4 h-4 text-white/70" />
            <span>Explore as Guest</span>
          </Link>
        </div>
      </main>

      {/* Footer minimal info bar */}
      <footer className="relative z-10 w-full px-6 py-4 text-center text-xs text-white/40">
        <span>© {new Date().getFullYear()} Wryto. Written for thinkers and creators.</span>
      </footer>

      {/* Interactive Modal */}
      {modalMode !== null && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-fade-rise"
          onClick={handleCloseModal}
        >
          <div
            className="liquid-glass rounded-3xl max-w-lg w-full p-7 sm:p-8 text-white border border-white/15 shadow-2xl relative"
            style={{
              background: "rgba(5, 17, 30, 0.9)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleCloseModal}
              className="absolute top-5 right-5 text-white/60 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/10 cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>

            {modalMode === "reading" ? (
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs text-white/70 mb-4 liquid-glass">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Wryto Journal · Issue 01</span>
                </div>

                <h3
                  className="text-3xl sm:text-4xl font-normal tracking-tight mb-4 text-white leading-[1.08]"
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                  The Architecture of Stillness
                </h3>

                <div className="space-y-4 text-white/80 text-sm leading-relaxed max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                  <p>
                    In an era dominated by hyper-stimulation and constant noise, profound focus has
                    become the rarest luxury. Great ideas don&apos;t arrive with shouting; they
                    emerge in deliberate stillness.
                  </p>
                  <p>
                    At Wryto, we believe the digital environment shouldn&apos;t demand your
                    attention—it should protect it. We design spaces that recede quietly into the
                    background, stripping away friction until only your clearest thoughts remain.
                  </p>
                  <p className="italic text-white/90">
                    &ldquo;Where dreams rise through the silence, inspired work finds its
                    form.&rdquo;
                  </p>
                </div>

                <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-between">
                  <span className="text-xs text-white/50">5 min read · Curated</span>
                  <Link
                    to="/auth"
                    onClick={handleCloseModal}
                    className="liquid-glass rounded-full px-5 py-2 text-xs text-white hover:scale-[1.03] transition-all cursor-pointer font-medium"
                  >
                    Join Wryto →
                  </Link>
                </div>
              </div>
            ) : !submitted ? (
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-5 liquid-glass text-white/90">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </div>

                <h3
                  className="text-3xl sm:text-4xl font-normal tracking-tight mb-3 text-white"
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                  Join Wryto
                </h3>

                <p className="text-white/70 text-sm leading-relaxed mb-6">
                  Wryto is selectively admitting creators, architects, and thinkers to our private
                  beta studio. Reserve your key below.
                </p>

                <form onSubmit={handleModalSubmit} className="space-y-4">
                  <div>
                    <input
                      type="email"
                      required
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-5 py-3 rounded-full bg-white/[0.06] border border-white/20 text-white placeholder:text-white/40 text-sm focus:outline-none focus:border-white/50 transition-colors"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full liquid-glass rounded-full py-3.5 px-6 text-sm text-white font-medium flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <span>Reserve Invitation</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </div>
            ) : (
              <div className="py-4 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle2 className="w-6 h-6" />
                </div>

                <h3
                  className="text-3xl font-normal mb-2 text-white"
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                  Your Journey Awaits
                </h3>

                <p className="text-white/80 text-sm leading-relaxed mb-6">
                  We have noted <span className="text-white font-semibold">{email}</span>. You will
                  receive exclusive coordinates when our next release quiet-drops.
                </p>

                <button
                  onClick={handleCloseModal}
                  className="liquid-glass rounded-full px-8 py-2.5 text-sm text-white hover:scale-[1.02] cursor-pointer"
                >
                  Return to Sanctuary
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export { CustomHero };
