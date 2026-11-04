import { Link, useNavigate } from "@tanstack/react-router";
import { Search, Sparkles, TrendingUp, X } from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FollowButton } from "@/components/post-card";
import { LanguageToggle } from "@/components/language-toggle";
import { useInkline } from "@/lib/inkline-context";
import { getAvatarUrl } from "@/lib/avatar";
import { initialsOf } from "@/lib/inkline-data";
import { cn } from "@/lib/utils";

const TRENDING_TOPICS = [
  { tag: "essays", category: "Writing & Craft", count: "1.4k posts" },
  { tag: "poetry", category: "Literature", count: "980 posts" },
  { tag: "philosophy", category: "Deep Thoughts", count: "720 posts" },
  { tag: "creative", category: "Art & Mindset", count: "650 posts" },
  { tag: "reflections", category: "Life & Culture", count: "540 posts" },
  { tag: "technology", category: "Future & AI", count: "430 posts" },
];

export function RightRail({ className }: { className?: string }) {
  const navigate = useNavigate();
  const { writers, profile, user } = useInkline();
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
    <aside className={cn("hidden xl:flex flex-col w-80 shrink-0 gap-4 py-4 pr-4 pl-3", className)}>
      {/* Search Input Widget */}
      <form onSubmit={handleSearchSubmit} className="sticky top-2 z-20">
        <div className="relative group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Wryto..."
            className="w-full h-11 pl-10 pr-9 rounded-full bg-muted/70 hover:bg-muted focus:bg-background border border-transparent focus:border-primary/50 text-sm font-sans text-foreground placeholder:text-muted-foreground/70 outline-none transition-all shadow-xs focus:ring-2 focus:ring-primary/20"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 size-5 flex items-center justify-center rounded-full bg-muted-foreground/20 hover:bg-muted-foreground/30 text-foreground transition-colors cursor-pointer"
              aria-label="Clear search"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
      </form>

      {/* Trending Topics Widget */}
      <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="size-4 text-primary" />
          <h2 className="font-sans text-sm font-bold text-foreground tracking-tight">
            Trending Topics
          </h2>
        </div>
        <div className="space-y-2.5">
          {TRENDING_TOPICS.map((item) => (
            <Link
              key={item.tag}
              to="/discover"
              search={{ q: item.tag }}
              className="group block p-2 rounded-xl hover:bg-muted/50 transition-colors"
            >
              <p className="text-[11px] font-sans text-muted-foreground uppercase tracking-wider">
                {item.category}
              </p>
              <p className="font-sans text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                #{item.tag}
              </p>
              <p className="text-xs text-muted-foreground/80 font-sans">{item.count}</p>
            </Link>
          ))}
        </div>
        <Link
          to="/discover"
          search={{ q: "" }}
          className="mt-2 block pt-2 text-xs font-semibold text-primary hover:underline border-t border-border/50"
        >
          Explore more topics →
        </Link>
      </div>

      {/* Who to Follow Widget */}
      {suggestedWriters.length > 0 && (
        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="size-4 text-primary" />
            <h2 className="font-sans text-sm font-bold text-foreground tracking-tight">
              Who to Follow
            </h2>
          </div>
          <div className="space-y-3.5">
            {suggestedWriters.map((writer) => (
              <div key={writer.handle} className="flex items-center justify-between gap-3">
                <Link
                  to="/profile/$handle"
                  params={{ handle: writer.handle }}
                  className="flex items-center gap-2.5 min-w-0 flex-1 group"
                >
                  <Avatar className="size-9 shrink-0 ring-1 ring-border">
                    {getAvatarUrl(writer.avatarUrl) && (
                      <AvatarImage
                        src={getAvatarUrl(writer.avatarUrl)!}
                        alt={writer.name}
                        className="object-cover"
                      />
                    )}
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold font-sans">
                      {writer.name ? initialsOf(writer.name) : "W"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-sans text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                      {writer.name}
                    </p>
                    <p className="font-sans text-[11px] text-muted-foreground truncate">
                      @{writer.handle}
                    </p>
                  </div>
                </Link>
                <FollowButton handle={writer.handle} />
              </div>
            ))}
          </div>
          <Link
            to="/discover"
            search={{ q: "" }}
            className="mt-3 block pt-2 text-xs font-semibold text-primary hover:underline border-t border-border/50"
          >
            Show more creators →
          </Link>
        </div>
      )}

      {/* Subdued Footer Information */}
      <footer className="px-2 py-3 space-y-2 text-[11px] font-sans text-muted-foreground/80">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <Link to="/settings" className="hover:underline">Settings</Link>
          <Link to="/feed" className="hover:underline">Privacy</Link>
          <Link to="/feed" className="hover:underline">Terms</Link>
          <Link to="/feed" className="hover:underline">About Wryto</Link>
        </div>
        <div className="flex items-center justify-between pt-1">
          <span>© 2026 Wryto Social Inc.</span>
          <LanguageToggle variant="compact" />
        </div>
      </footer>
    </aside>
  );
}
