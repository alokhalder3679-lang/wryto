import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Feather, RefreshCw, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface WritingPrompt {
  id: string;
  theme: string;
  prompt: string;
  kicker: string;
  tag: string;
  format: "thought" | "story" | "poetry";
}

export const CURATED_PROMPTS: WritingPrompt[] = [
  {
    id: "stillness",
    theme: "Contemplation",
    kicker: "On the Architecture of Silence",
    prompt: "Describe a quiet corner from your life that felt like home before you realized you had to leave it.",
    tag: "reflections",
    format: "story",
  },
  {
    id: "unspoken",
    theme: "Dialogue & Memory",
    kicker: "The Unsent Message",
    prompt: "Write about a conversation where the single most important sentence was left completely unspoken.",
    tag: "essays",
    format: "thought",
  },
  {
    id: "dusk",
    theme: "Poetic Observation",
    kicker: "Between Light and Shadow",
    prompt: "Capture the exact three minutes when dusk turns into night in your city or town.",
    tag: "poetry",
    format: "poetry",
  },
  {
    id: "worn-pages",
    theme: "The Written Word",
    kicker: "The Solitude of Ink",
    prompt: "Why do you return to the page when algorithmic noise seems to drown out everything else?",
    tag: "craft",
    format: "story",
  },
  {
    id: "rituals",
    theme: "Daily Sacredness",
    kicker: "Small Anchors",
    prompt: "What is an unglamorous, repetitive daily ritual that secretly keeps your mind intact?",
    tag: "philosophy",
    format: "thought",
  },
];

export function DailyPromptCard({ className, compact = false }: { className?: string; compact?: boolean }) {
  // Deterministic daily index based on current date
  const todayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % CURATED_PROMPTS.length;
  const [index, setIndex] = useState(todayIndex);
  const [shuffling, setShuffling] = useState(false);

  const item = CURATED_PROMPTS[index] ?? CURATED_PROMPTS[0];

  function handleShuffle() {
    setShuffling(true);
    setIndex((prev) => (prev + 1) % CURATED_PROMPTS.length);
    setTimeout(() => setShuffling(false), 300);
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl border border-border/70 liquid-glass p-4.5 sm:p-5 transition-all shadow-xs",
        className,
      )}
    >
      {/* Decorative Warm Coral-Mint Gradient Ambient Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-12 -right-12 size-36 rounded-full bg-[radial-gradient(circle,rgba(231,111,100,0.18)_0%,rgba(104,195,180,0.12)_50%,transparent_70%)] blur-2xl"
      />

      {/* Header with Title and Shuffle Action */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Feather className="size-3.5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
              Prompt of the Day
            </span>
            <span className="text-muted-foreground/60 text-xs mx-1.5">·</span>
            <span className="text-[11px] text-muted-foreground font-medium">{item.theme}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleShuffle}
          className="size-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors spring-press cursor-pointer"
          title="See another prompt"
          aria-label="Shuffle prompt"
        >
          <RefreshCw className={cn("size-3.5", shuffling && "animate-spin")} />
        </button>
      </div>

      {/* Kicker & Prompt Text */}
      <div className="my-2.5">
        <p className="text-xs font-semibold text-muted-foreground mb-1">{item.kicker}</p>
        <blockquote className="font-serif italic text-sm sm:text-base leading-relaxed text-foreground border-l-2 border-primary/50 pl-3 my-2">
          "{item.prompt}"
        </blockquote>
      </div>

      {/* Action CTA */}
      <div className="pt-2 flex items-center justify-between gap-3 mt-1">
        <span className="text-[11px] text-muted-foreground/80 font-mono">#{item.tag}</span>
        <Button
          asChild
          size="sm"
          className="rounded-full h-8 px-3.5 text-xs font-semibold gap-1.5 shadow-2xs spring-press"
        >
          <Link
            to="/create"
            search={() => ({
              prompt: item.prompt,
              tag: item.tag,
              format: item.format,
            })}
          >
            <span>Write Response</span>
            <ArrowRight className="size-3" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
