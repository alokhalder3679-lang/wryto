import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, RefreshCw } from "lucide-react";
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

export function DailyPromptCard({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const todayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % CURATED_PROMPTS.length;
  const [index, setIndex] = useState(todayIndex);
  const [shuffling, setShuffling] = useState(false);

  const item = CURATED_PROMPTS[index] ?? CURATED_PROMPTS[0];

  function handleShuffle() {
    setShuffling(true);
    setIndex((prev) => (prev + 1) % CURATED_PROMPTS.length);
    setTimeout(() => setShuffling(false), 250);
  }

  return (
    <div
      className={cn(
        "group relative rounded-2xl border border-border/80 bg-card p-4 transition-all shadow-xs",
        className,
      )}
    >
      {/* Subdued Editorial Header */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-border/50">
        <div className="flex items-center gap-2 min-w-0">
          <span className="size-1.5 rounded-full bg-primary shrink-0" />
          <span className="text-[11px] font-medium text-foreground tracking-tight">
            Today's Inquiry
          </span>
          <span className="text-muted-foreground/40 text-xs">·</span>
          <span className="text-[11px] text-muted-foreground/80 font-serif italic truncate">
            {item.theme}
          </span>
        </div>

        <button
          type="button"
          onClick={handleShuffle}
          className="size-6 rounded-full flex items-center justify-center text-muted-foreground/70 hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0"
          title="See another inquiry"
          aria-label="Shuffle inquiry"
        >
          <RefreshCw className={cn("size-3", shuffling && "animate-spin")} />
        </button>
      </div>

      {/* Kicker & Quote Prompt */}
      <div className="py-2.5 space-y-1.5">
        <p className="text-[11px] font-medium text-muted-foreground/75 tracking-normal">
          {item.kicker}
        </p>
        <blockquote className="font-serif italic text-[14.5px] leading-relaxed text-foreground">
          "{item.prompt}"
        </blockquote>
      </div>

      {/* Action Footer */}
      <div className="pt-2.5 flex items-center justify-between gap-3 border-t border-border/50">
        <span className="text-[11px] font-medium text-muted-foreground/80 capitalize">
          #{item.tag}
        </span>
        <Button
          asChild
          size="sm"
          variant="outline"
          className="rounded-full h-7 px-3 text-xs font-medium hover:bg-foreground hover:text-background border-border/80 transition-all gap-1 cursor-pointer"
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
            <ArrowUpRight className="size-3 text-muted-foreground group-hover:text-inherit" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
