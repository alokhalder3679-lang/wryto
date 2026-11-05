import { createFileRoute, Link } from "@tanstack/react-router";
import { Compass, Hash, Search, Sparkles, TrendingUp, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { AppShell } from "@/components/app-shell";
import { FollowButton, PostCard } from "@/components/post-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useInkline } from "@/lib/inkline-context";
import { getAvatarUrl } from "@/lib/avatar";
import { initialsOf } from "@/lib/inkline-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/discover")({
  staticData: { sitemap: true },
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search["q"] === "string" ? search["q"] : "",
  }),
  head: () => ({
    meta: [
      { title: "Explore — Wryto" },
      {
        name: "description",
        content: "Discover trending topics, creators, and posts on Wryto.",
      },
      { property: "og:title", content: "Explore — Wryto" },
      {
        property: "og:description",
        content: "Discover trending topics, creators, and posts on Wryto.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: DiscoverErrorComponent,
  component: DiscoverPage,
});

function DiscoverErrorComponent() {
  return (
    <AppShell title="Explore">
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 my-auto min-h-[400px]">
        <h2 className="font-sans text-xl font-bold">Unable to load explore</h2>
        <p className="max-w-md font-sans text-sm text-muted-foreground leading-relaxed">
          There was an issue opening the explore page. Please try refreshing or return to the feed.
        </p>
        <Button onClick={() => window.location.reload()} className="rounded-full">Refresh</Button>
      </div>
    </AppShell>
  );
}

const TRENDING_EXPLORE = [
  { tag: "essays", label: "Essays & Memoir", count: "1.4k essays" },
  { tag: "poetry", label: "Poetic Works", count: "980 pieces" },
  { tag: "philosophy", label: "Philosophy & Mind", count: "720 writings" },
  { tag: "creative", label: "The Solitude of Ink", count: "650 notes" },
  { tag: "reflections", label: "Quiet Letters", count: "540 stories" },
  { tag: "craft", label: "The Writer's Desk", count: "430 pieces" },
];

function DiscoverPage() {
  const { q } = Route.useSearch();
  const [query, setQuery] = useState(q);
  const { posts, writers, profile } = useInkline();
  const [activeTab, setActiveTab] = useState<"all" | "people" | "posts">("all");

  const term = query.trim().toLowerCase().replace(/^#/, "");

  const matchedPosts = posts.filter((post) => {
    if (!term) return true;
    const bodyMatch = post.body?.toLowerCase().includes(term);
    const titleMatch = post.title?.toLowerCase().includes(term);
    const tagMatch =
      Array.isArray(post.tags) &&
      post.tags.some((tag) => tag.toLowerCase().replace(/^#/, "").includes(term));
    const authorNameMatch = post.author?.name?.toLowerCase().includes(term);
    const authorHandleMatch = post.author?.handle?.toLowerCase().includes(term);
    return bodyMatch || titleMatch || tagMatch || authorNameMatch || authorHandleMatch;
  });

  const [people, setPeople] = useState<
    {
      handle: string;
      display_name: string;
      bio: string | null;
      followers_count: number;
      avatar_url?: string | null;
    }[]
  >([]);
  const [peopleLoading, setPeopleLoading] = useState(false);

  useEffect(() => {
    if (!term) {
      setPeople([]);
      setPeopleLoading(false);
      return;
    }
    setPeopleLoading(true);
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("handle, display_name, bio, followers_count, avatar_url, profile_image")
        .or(`handle.ilike.%${term}%,display_name.ilike.%${term}%`)
        .order("followers_count", { ascending: false })
        .limit(10);
      setPeople((data ?? []) as any);
      setPeopleLoading(false);
    }, 200);

    return () => clearTimeout(t);
  }, [term]);

  const featuredWriters = writers
    .filter((w) => w.handle !== profile?.handle)
    .slice(0, 6);

  return (
    <AppShell title="Explore">
      {/* ── Search Header Bar ─────────────────────────────────── */}
      <div className="sticky top-0 z-20 p-3 sm:p-4 border-b border-border/70 bg-background/90 backdrop-blur-md">
        <div className="relative group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search creators, topics, or keywords..."
            className="w-full h-11 pl-10 pr-9 rounded-full bg-muted/60 focus:bg-background border border-transparent focus:border-primary/50 text-sm font-sans text-foreground placeholder:text-muted-foreground outline-none transition-all shadow-xs focus:ring-2 focus:ring-primary/20"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 size-5 flex items-center justify-center rounded-full bg-muted-foreground/20 hover:bg-muted-foreground/30 text-foreground transition-colors cursor-pointer"
            >
              <X className="size-3" />
            </button>
          )}
        </div>

        {/* Filter Tabs if searching */}
        {query && (
          <div className="flex gap-4 pt-3 border-t border-border/40 mt-3 text-xs font-sans font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={cn(
                "pb-1 cursor-pointer transition-colors relative",
                activeTab === "all" ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Top Matches
              {activeTab === "all" && <span className="absolute bottom-0 inset-x-0 h-0.5 bg-primary" />}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("people")}
              className={cn(
                "pb-1 cursor-pointer transition-colors relative",
                activeTab === "people" ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Creators ({people.length})
              {activeTab === "people" && <span className="absolute bottom-0 inset-x-0 h-0.5 bg-primary" />}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("posts")}
              className={cn(
                "pb-1 cursor-pointer transition-colors relative",
                activeTab === "posts" ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Posts ({matchedPosts.length})
              {activeTab === "posts" && <span className="absolute bottom-0 inset-x-0 h-0.5 bg-primary" />}
            </button>
          </div>
        )}
      </div>

      {/* ── Content View ───────────────────────────────────────── */}
      {!query ? (
        <div className="divide-y divide-border/60">
          {/* Curated Themes */}
          <div className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="size-4 text-primary" />
                <h2 className="font-sans text-sm font-semibold text-foreground">Curated Themes</h2>
              </div>
              <span className="text-[11px] text-muted-foreground font-sans">Volume I · Autumn</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {TRENDING_EXPLORE.map((item) => (
                <button
                  key={item.tag}
                  type="button"
                  onClick={() => setQuery(item.tag)}
                  className="p-3 rounded-2xl border border-border/80 bg-card hover:bg-muted/50 transition-colors text-left cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                      {item.label}
                    </p>
                    <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                      #{item.tag}
                    </p>
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 mt-2 font-mono tabular-numbers">
                    {item.count}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Creators to Discover */}
          {featuredWriters.length > 0 && (
            <div className="p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-primary" />
                <h2 className="font-sans text-sm font-bold text-foreground">Creators to Follow</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {featuredWriters.map((writer) => (
                  <div
                    key={writer.handle}
                    className="p-3.5 rounded-2xl border border-border/70 bg-card flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <Link
                      to="/profile/$handle"
                      params={{ handle: writer.handle }}
                      className="flex items-center gap-3 min-w-0 flex-1 group"
                    >
                      <Avatar className="size-11 ring-1 ring-border">
                        {getAvatarUrl(writer.avatarUrl) && (
                          <AvatarImage src={getAvatarUrl(writer.avatarUrl)!} alt={writer.name} />
                        )}
                        <AvatarFallback className="text-xs font-bold font-sans">
                          {initialsOf(writer.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold font-sans text-foreground truncate group-hover:text-primary transition-colors">
                          {writer.name}
                        </p>
                        <p className="text-xs text-muted-foreground font-sans truncate">
                          @{writer.handle}
                        </p>
                        {writer.bio && (
                          <p className="text-[11px] text-muted-foreground font-sans truncate mt-0.5">
                            {writer.bio}
                          </p>
                        )}
                      </div>
                    </Link>
                    <FollowButton handle={writer.handle} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Community Feed Preview */}
          <div>
            <div className="px-4 py-3 bg-muted/20 border-b border-border/50">
              <h2 className="font-sans text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Recent Posts
              </h2>
            </div>
            <div className="divide-y divide-border/60">
              {posts.slice(0, 15).map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Active Search Results */
        <div className="divide-y divide-border/60">
          {/* People Section (if tab is all or people) */}
          {(activeTab === "all" || activeTab === "people") && (
            <div className="p-4 sm:p-5 space-y-3">
              <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Creators
              </h3>
              {peopleLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="size-10 rounded-full" />
                      <div className="space-y-1.5 flex-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : people.length === 0 ? (
                activeTab === "people" && (
                  <p className="text-xs font-sans text-muted-foreground py-2">
                    No creators match “{query}”.
                  </p>
                )
              ) : (
                <div className="space-y-3">
                  {people.map((p) => (
                    <div key={p.handle} className="flex items-center justify-between gap-3">
                      <Link
                        to="/profile/$handle"
                        params={{ handle: p.handle }}
                        className="flex items-center gap-3 min-w-0 flex-1 group"
                      >
                        <Avatar className="size-10 ring-1 ring-border">
                          {getAvatarUrl(p.avatar_url) && (
                            <AvatarImage src={getAvatarUrl(p.avatar_url)!} alt={p.display_name} />
                          )}
                          <AvatarFallback className="text-xs font-bold font-sans">
                            {initialsOf(p.display_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold font-sans text-foreground truncate group-hover:text-primary transition-colors">
                            {p.display_name}
                          </p>
                          <p className="text-xs text-muted-foreground font-sans truncate">
                            @{p.handle} · {p.followers_count} followers
                          </p>
                        </div>
                      </Link>
                      <FollowButton handle={p.handle} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Posts Section (if tab is all or posts) */}
          {(activeTab === "all" || activeTab === "posts") && (
            <div>
              <div className="px-4 py-2.5 bg-muted/20 border-b border-border/50">
                <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Posts ({matchedPosts.length})
                </h3>
              </div>
              {matchedPosts.length === 0 ? (
                <div className="py-16 text-center px-4 space-y-2">
                  <p className="font-sans text-sm text-muted-foreground">
                    No posts found matching “{query}”.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuery("")}
                    className="rounded-full text-xs"
                  >
                    Clear Search
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {matchedPosts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}
