import { Link, useNavigate } from "@tanstack/react-router";
import { BookOpen, Feather, Search, X } from "lucide-react";
import React, { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FollowButton } from "@/components/post-card";
import { LanguageToggle } from "@/components/language-toggle";
import { DailyPromptCard } from "@/components/daily-prompt-card";
import { useInkline } from "@/lib/inkline-context";
import { getAvatarUrl } from "@/lib/avatar";
import { initialsOf } from "@/lib/inkline-data";
import { cn } from "@/lib/utils";

const CURATED_FOLIOS = [
  {
    id: "01",
    tag: "essays",
    title: "Essays & Memoir",
    desc: "Personal narratives, unhurried prose, and literary craft",
    count: "1.4k essays",
  },
  {
    id: "02",
    tag: "poetry",
    title: "Poetic Works",
    desc: "Verses, imagery, and observations on stillness and dusk",
    count: "980 pieces",
  },
  {
    id: "03",
    tag: "philosophy",
    title: "Philosophy & Mind",
    desc: "Meditations on interior life, time, and contemplative depth",
    count: "720 writings",
  },
  {
    id: "04",
    tag: "creative",
    title: "The Solitude of Ink",
    desc: "Reflections on authentic creation without algorithmic noise",
    count: "650 notes",
  },
  {
    id: "05",
    tag: "reflections",
    title: "Quiet Letters",
    desc: "Unsent thoughts, small daily rituals, and human memory",
    count: "540 stories",
  },
];

const QUICK_TAGS = [
  { label: "essays", tag: "essays" },
  { label: "poetry", tag: "poetry" },
  { label: "philosophy", tag: "philosophy" },
  { label: "craft", tag: "creative" },
  { label: "reflections", tag: "reflections" },
  { label: "solitude", tag: "philosophy" },
];

export function RightRail({ className }: { className?: string }) {
  const navigate = useNavigate();
  const { writers, profile } = useInkline();
  const [search, setSearch] = useState("");

  const suggestedWriters = writers
    .filter((w) => w.handle !== profile?.handle)
    .slice(0, 4);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (search.trim()) {
      void navigate({ to: "/discover", search: { q: search.trim() } });
    }
  }

  return (
    <aside className={cn("hidden xl:flex flex-col w-80 shrink-0 gap-4 py-4 pr-4 pl-3 select-none", className)}>
      {/* ── Sticky Search Field (Opaque Backdrop to Prevent Content Collisions) ── */}
      <div className="sticky top-0 z-20 -mt-4 pt-4 pb-2 bg-background/98 backdrop-blur-md border-b border-border/40 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="relative group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/75 group-focus-within:text-foreground transition-colors pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search essays, poets, topics…"
            className="w-full h-10 pl-9 pr-9 rounded-full bg-muted/50 hover:bg-muted/80 focus:bg-background border border-border/80 focus:border-foreground/30 text-xs text-foreground placeholder:text-muted-foreground/70 outline-none transition-all shadow-2xs focus:ring-2 focus:ring-foreground/5"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 size-5 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              aria-label="Clear search"
            >
              <X className="size-3" />
            </button>
          ) : (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-muted-foreground/60 border border-border/60 rounded px-1.5 py-0.2 pointer-events-none hidden sm:inline-block">
              /
            </span>
          )}
        </form>
      </div>

      {/* ── Daily Reflection Prompt (Editorial Card) ── */}
      <DailyPromptCard />

      {/* ── Curated Folios (Human-Crafted Literary Index) ── */}
      <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
        <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-border/50">
          <div className="flex items-center gap-1.5">
            <BookOpen className="size-3.5 text-primary" />
            <h2 className="text-xs font-semibold text-foreground tracking-tight">
              Curated Folios
            </h2>
          </div>
          <span className="text-[10px] text-muted-foreground/70 font-sans">
            Autumn Edition
          </span>
        </div>

        <div className="space-y-1">
          {CURATED_FOLIOS.map((item) => (
            <Link
              key={item.id}
              to="/discover"
              search={{ q: item.tag }}
              className="group flex items-start gap-2.5 p-2 rounded-xl hover:bg-muted/50 transition-colors text-left cursor-pointer"
            >
              <span className="font-mono text-[10px] text-muted-foreground/50 pt-0.5 group-hover:text-primary transition-colors shrink-0">
                {item.id}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-xs font-medium text-foreground group-hover:text-primary transition-colors truncate">
                    {item.title}
                  </p>
                  <span className="text-[10px] text-muted-foreground/60 shrink-0 tabular-numbers">
                    {item.count}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground/75 line-clamp-1 mt-0.5 leading-snug">
                  {item.desc}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Tag Pills */}
        <div className="pt-2.5 mt-2 border-t border-border/50 flex flex-wrap gap-1.5">
          {QUICK_TAGS.map((t) => (
            <Link
              key={t.label}
              to="/discover"
              search={{ q: t.tag }}
              className="text-[11px] text-muted-foreground/80 hover:text-foreground bg-muted/40 hover:bg-muted/90 px-2 py-0.5 rounded-md transition-colors"
            >
              #{t.label}
            </Link>
          ))}
        </div>
      </div>

      {/* ── Writers in the Folio (Elevated Voices with Context) ── */}
      {suggestedWriters.length > 0 && (
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-border/50">
            <div className="flex items-center gap-1.5">
              <Feather className="size-3.5 text-primary" />
              <h2 className="text-xs font-semibold text-foreground tracking-tight">
                Writers to Read
              </h2>
            </div>
            <Link
              to="/discover"
              search={{ q: "" }}
              className="text-[10.5px] text-muted-foreground hover:text-foreground transition-colors"
            >
              All creators
            </Link>
          </div>

          <div className="space-y-2.5">
            {suggestedWriters.map((writer) => (
              <div
                key={writer.handle}
                className="group p-1.5 rounded-xl hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center justify-between gap-2.5">
                  <Link
                    to="/profile/$handle"
                    params={{ handle: writer.handle }}
                    className="flex items-center gap-2.5 min-w-0 flex-1"
                  >
                    <Avatar className="size-8 shrink-0 ring-1 ring-border/70">
                      {getAvatarUrl(writer.avatarUrl) && (
                        <AvatarImage
                          src={getAvatarUrl(writer.avatarUrl)!}
                          alt={writer.name}
                          className="object-cover"
                        />
                      )}
                      <AvatarFallback className="bg-muted text-foreground text-xs font-medium">
                        {writer.name ? initialsOf(writer.name) : "W"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground truncate group-hover:underline">
                        {writer.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground/75 truncate">
                        @{writer.handle}
                      </p>
                    </div>
                  </Link>
                  <FollowButton handle={writer.handle} />
                </div>
                {writer.bio && (
                  <p className="text-[11px] text-muted-foreground/80 line-clamp-1 mt-1 pl-10.5">
                    {writer.bio}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Subdued Literary Colophon ── */}
      <footer className="px-1 py-2 text-[11px] text-muted-foreground/75 space-y-2 border-t border-border/40 mt-1">
        <div className="flex flex-wrap gap-x-3 gap-y-1 leading-relaxed">
          <Link to="/settings" className="hover:text-foreground transition-colors">Settings</Link>
          <Link to="/discover" className="hover:text-foreground transition-colors">Discover</Link>
          <Link to="/feed" className="hover:text-foreground transition-colors">Privacy</Link>
          <Link to="/feed" className="hover:text-foreground transition-colors">Terms</Link>
          <Link to="/feed" className="hover:text-foreground transition-colors">About</Link>
        </div>
        <div className="flex items-center justify-between pt-1 text-[10.5px]">
          <span>Wryto · An unhurried sanctuary</span>
          <LanguageToggle variant="compact" />
        </div>
      </footer>
    </aside>
  );
}
