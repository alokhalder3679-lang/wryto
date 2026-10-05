import React, { useState } from "react";
import { X, Sparkles, CheckCircle2, ArrowRight, BookOpen } from "lucide-react";

interface JourneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: "signup" | "reading";
  onSwitchToSignUp?: () => void;
}

export const JourneyModal: React.FC<JourneyModalProps> = ({
  isOpen,
  onClose,
  mode = "signup",
  onSwitchToSignUp,
}) => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setEmail("");
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-rise"
      onClick={handleReset}
    >
      <div
        className="liquid-glass rounded-3xl max-w-lg w-full p-8 text-foreground border border-white/10 shadow-2xl relative"
        style={{
          background: "rgba(5, 17, 30, 0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleReset}
          className="absolute top-5 right-5 text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-full hover:bg-white/5 cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {mode === "reading" ? (
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs text-muted-foreground mb-4 liquid-glass">
              <BookOpen className="w-3.5 h-3.5 text-white/80" />
              <span>Wryto Journal · Issue 01</span>
            </div>

            <h3
              className="text-3xl sm:text-4xl font-normal tracking-tight mb-4 text-foreground leading-[1.05]"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              The Architecture of Stillness
            </h3>

            <div className="space-y-4 text-muted-foreground text-sm leading-relaxed max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
              <p>
                In an era dominated by hyper-stimulation and constant noise, profound focus has
                become the rarest luxury. Great ideas don&apos;t arrive with shouting; they emerge
                in deliberate stillness.
              </p>
              <p>
                At Wryto, we believe the digital environment shouldn&apos;t demand your attention—it
                should protect it. We design spaces that recede quietly into the background,
                stripping away friction until only your clearest thoughts remain.
              </p>
              <p className="italic text-foreground/80">
                &ldquo;Where dreams rise through the silence, inspired work finds its form.&rdquo;
              </p>
            </div>

            <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">5 min read · Curated</span>
              <button
                type="button"
                onClick={() => {
                  if (onSwitchToSignUp) {
                    onSwitchToSignUp();
                  } else {
                    handleReset();
                  }
                }}
                className="liquid-glass rounded-full px-5 py-2 text-xs text-foreground hover:scale-[1.03] transition-all cursor-pointer font-medium"
              >
                Sign Up for Editions →
              </button>
            </div>
          </div>
        ) : !submitted ? (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-5 liquid-glass text-white/90">
              <Sparkles className="w-5 h-5" />
            </div>

            <h3
              className="text-3xl sm:text-4xl font-normal tracking-tight mb-3 text-foreground"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Sign Up for Wryto
            </h3>

            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              Wryto is selectively admitting creators, architects, and thinkers to our private beta
              studio. Reserve your key below.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  type="email"
                  required
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-5 py-3 rounded-full bg-white/[0.04] border border-white/15 text-foreground placeholder:text-muted-foreground/60 text-sm focus:outline-none focus:border-white/40 transition-colors"
                />
              </div>
              <button
                type="submit"
                className="w-full liquid-glass rounded-full py-3.5 px-6 text-sm text-foreground font-medium flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                <span>Sign Up</span>
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
              className="text-3xl font-normal mb-2 text-foreground"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Your Journey Awaits
            </h3>

            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              We have noted <span className="text-foreground font-medium">{email}</span>. You will
              receive exclusive coordinates when our next release quiet-drops.
            </p>

            <button
              onClick={handleReset}
              className="liquid-glass rounded-full px-8 py-2.5 text-sm text-foreground hover:scale-[1.02] cursor-pointer"
            >
              Return to Sanctuary
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
