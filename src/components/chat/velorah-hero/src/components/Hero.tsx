import React from "react";

interface HeroProps {
  onBeginJourney: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onBeginJourney }) => {
  return (
    <section className="relative z-10 flex flex-col items-center justify-center text-center px-6 pt-14 pb-36 sm:pt-16 sm:pb-44 flex-1 max-w-6xl mx-auto">
      {/* Cinematic Heading */}
      <h1
        className="text-5xl sm:text-7xl md:text-8xl lg:text-[5.75rem] leading-[1.02] tracking-[-2px] sm:tracking-[-3px] font-normal text-foreground animate-fade-rise -translate-y-6 sm:-translate-y-8"
        style={{ fontFamily: "'Instrument Serif', serif" }}
      >
        A quiet place for <span className="italic text-muted-foreground">words that matter.</span>
      </h1>

      {/* Hero CTA Button */}
      <button
        type="button"
        onClick={onBeginJourney}
        className="liquid-glass rounded-full px-12 sm:px-14 py-4 sm:py-5 text-base text-foreground hover:scale-[1.03] active:scale-[0.98] cursor-pointer transition-transform duration-300 animate-fade-rise-delay mt-12 sm:mt-16 translate-y-2 sm:translate-y-4 inline-flex items-center justify-center font-normal"
      >
        Begin Reading
      </button>
    </section>
  );
};
