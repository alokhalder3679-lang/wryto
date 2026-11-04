import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Feather, Search, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { AppShell } from "@/components/app-shell";
import { FollowButton, PostCard, TopicChip } from "@/components/post-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useInkline } from "@/lib/inkline-context";
import { getAvatarUrl } from "@/lib/avatar";

export const Route = createFileRoute("/discover")({
  staticData: { sitemap: true },
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search["q"] === "string" ? search["q"] : "",
  }),
  head: () => ({
    meta: [
      { title: "Discover — Wryto" },
      {
        name: "description",
        content: "Find writers, essays, poetry, stories, and new ideas on Wryto.",
      },
      { property: "og:title", content: "Discover — Wryto" },
      {
        property: "og:description",
        content: "Find writers, essays, poetry, stories, and new ideas on Wryto.",
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
    <AppShell title="Discover">
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 my-auto min-h-[400px]">
        <div className="rounded-2xl bg-destructive/10 p-4 text-destructive">
          <BookOpen className="size-8 stroke-[1.75]" />
        </div>
        <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Unable to load discovery archive
        </h2>
        <p className="max-w-md font-reading text-sm text-muted-foreground leading-relaxed">
          There was an issue opening the topic catalog. Please try refreshing or return to the feed.
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="rounded-full min-h-[44px]"
          >
            Refresh
          </Button>
          <Button asChild className="rounded-full min-h-[44px]">
            <Link to="/feed">Go to Feed</Link>
          </Button>
        </div>
      </div>
    </AppShell>
  );
}

const DISCOVER_TOPICS = [
  "essays",
  "poetry",
  "philosophy",
  "culture",
  "stories",
  "craft",
  "memoir",
];

function DiscoverPage() {
  const { q } = Route.useSearch();
  const [query, setQuery] = useState(q);
  const { posts, writers, profile } = useInkline();

  const term = query.trim().toLowerCase().replace(/^#/, "");

  const matches = posts.filter((post) => {
    if (!term) return true;
    const bodyMatch = post.body?.toLowerCase().includes(term);
    const titleMatch = post.title?.toLowerCase().includes(term);
    const tagMatch =
      Array.isArray(post.tags) &&
      post.tags.some((tag) => {
        const cleanTag = tag.toLowerCase().replace(/^#/, "");
        return cleanTag.includes(term) || term.includes(cleanTag);
      });
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
  const [peopleState, setPeopleState] = useState<"idle" | "loading" | "error">("idle");
  const userTerm = term.replace(/^@/, "").replace(/[^a-z0-9_]/g, "");

  useEffect(() => {
    if (!userTerm) {
      setPeople([]);
      setPeopleState("idle");
      return;
    }
    setPeopleState("loading");
    const t = setTimeout(async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("handle, display_name, bio, followers_count, avatar_url")
        .or(`handle.ilike.${userTerm}%,display_name.ilike.%${userTerm}%`)
        .order("followers_count", { ascending: false })
        .limit(6);
      if (error) {
        setPeopleState("error");
        return;
      }
      setPeople(data ?? []);
      setPeopleState("idle");
    }, 250);
    return () => clearTimeout(t);
  }, [userTerm]);

  const suggested = writers.filter((writer) => writer.handle !== profile?.handle).slice(0, 6);

  return (
    <AppShell title="Discover">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8 space-y-10">
        {/* Search Bar & Topic Navigation */}
        <div className="space-y-4">
          <div className="relative flex items-center rounded-2xl border border-border/70 bg-card/70 px-4 py-1.5 shadow-2xs focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/15 transition-all">
            <Search className="size-4.5 text-muted-foreground shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search writers, essays, poems, or topics…"
              className="h-11 w-full bg-transparent border-0 pl-3 pr-2 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0 text-sm font-sans"
              aria-label="Search writers, essays, poems, or topics"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="flex size-9 min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                aria-label="Clear search query"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Topic Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none pt-1">
            <span className="text-xs font-sans uppercase tracking-widest text-muted-foreground/80 font-medium shrink-0 mr-1 hidden sm:inline">
              Explore:
            </span>
            {DISCOVER_TOPICS.map((topic) => {
              const isActive = term === topic;
              return (
                <TopicChip
                  key={topic}
                  active={isActive}
                  onClick={() => setQuery(isActive ? "" : topic)}
                >
                  {`#${topic}`}
                </TopicChip>
              );
            })}
          </div>
        </div>

        {/* Featured Voices Section (when no search query) */}
        {!query && suggested.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-baseline justify-between border-b border-border/50 pb-3">
              <div>
                <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  Featured Voices
                </h2>
                <p className="mt-0.5 font-reading text-sm text-muted-foreground">
                  Writers, essayists, and thinkers publishing on Wryto.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {suggested.map((writer) => {
                const avatarSrc = getAvatarUrl(writer.avatarUrl);
                return (
                  <article
                    key={writer.handle}
                    className="group flex flex-col justify-between rounded-2xl border border-border/70 bg-card p-5 transition-all duration-200 hover:border-primary/40 hover:shadow-xs"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <Link
                          to="/profile/$handle"
                          params={{ handle: writer.handle }}
                          className="flex items-center gap-3 min-w-0 flex-1 group/author cursor-pointer"
                        >
                          <Avatar className="size-12 shrink-0 ring-1 ring-border/60 transition-colors group-hover/author:ring-primary/40">
                            {avatarSrc && (
                              <AvatarImage
                                src={avatarSrc}
                                alt={writer.name}
                                className="object-cover"
                              />
                            )}
                            <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                              {writer.initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-display text-base font-semibold text-foreground transition-colors group-hover/author:text-primary">
                              {writer.name}
                            </p>
                            <p className="truncate text-xs font-sans text-muted-foreground">
                              @{writer.handle}
                            </p>
                          </div>
                        </Link>
                        <FollowButton handle={writer.handle} />
                      </div>

                      {writer.bio && (
                        <p className="mt-3.5 font-reading text-sm text-foreground/80 line-clamp-2 leading-relaxed">
                          {writer.bio}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs font-sans text-muted-foreground">
                      <span>{writer.location ? `📍 ${writer.location}` : "Writer"}</span>
                      <Link
                        to="/profile/$handle"
                        params={{ handle: writer.handle }}
                        className="text-primary hover:underline font-medium min-h-[44px] sm:min-h-0 flex items-center"
                      >
                        View profile →
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* Matching Writers Section (when search query is present) */}
        {query && (
          <section className="space-y-4">
            <div className="border-b border-border/50 pb-3">
              <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Matching Writers
              </h2>
              <p className="mt-0.5 font-reading text-sm text-muted-foreground">
                Authors matching “{query}”
              </p>
            </div>

            {peopleState === "loading" ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-border/60 bg-card p-5 space-y-3"
                  >
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-12 rounded-full" />
                      <div className="space-y-1.5 flex-1">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                ))}
              </div>
            ) : peopleState === "error" ? (
              <p className="font-reading text-sm text-destructive py-2">
                Couldn't search writers. Please try refreshing.
              </p>
            ) : people.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {people.map((w) => {
                  const avatarSrc = getAvatarUrl(w.avatar_url);
                  return (
                    <article
                      key={w.handle}
                      className="group flex flex-col justify-between rounded-2xl border border-border/70 bg-card p-5 transition-all duration-200 hover:border-primary/40 hover:shadow-xs"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <Link
                            to="/profile/$handle"
                            params={{ handle: w.handle }}
                            className="flex items-center gap-3 min-w-0 flex-1 group/author cursor-pointer"
                          >
                            <Avatar className="size-12 shrink-0 ring-1 ring-border/60 transition-colors group-hover/author:ring-primary/40">
                              {avatarSrc && (
                                <AvatarImage
                                  src={avatarSrc}
                                  alt={w.display_name}
                                  className="object-cover"
                                />
                              )}
                              <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                                {w.display_name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-display text-base font-semibold text-foreground transition-colors group-hover/author:text-primary">
                                {w.display_name}
                              </p>
                              <p className="truncate text-xs font-sans text-muted-foreground">
                                @{w.handle}
                              </p>
                            </div>
                          </Link>
                          {w.handle !== profile?.handle && <FollowButton handle={w.handle} />}
                        </div>

                        {w.bio && (
                          <p className="mt-3.5 font-reading text-sm text-foreground/80 line-clamp-2 leading-relaxed">
                            {w.bio}
                          </p>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs font-sans text-muted-foreground">
                        <span>{w.followers_count} followers</span>
                        <Link
                          to="/profile/$handle"
                          params={{ handle: w.handle }}
                          className="text-primary hover:underline font-medium min-h-[44px] sm:min-h-0 flex items-center"
                        >
                          View profile →
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="font-reading text-sm text-muted-foreground py-2">
                No writers match “{query}”.
              </p>
            )}
          </section>
        )}

        {/* Curated Stories / Search Results */}
        <section className="space-y-6">
          <div className="flex items-baseline justify-between border-b border-border/50 pb-3">
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {query ? `Dispatches matching “${query}”` : "Curated Stories"}
              </h2>
              <p className="mt-0.5 font-reading text-sm text-muted-foreground">
                {query
                  ? `${matches.length} ${matches.length === 1 ? "story" : "stories"} found`
                  : "Selected essays, memoirs, and reflections from the archive."}
              </p>
            </div>
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="text-xs font-sans text-primary hover:underline cursor-pointer min-h-[44px] flex items-center"
              >
                Clear filter
              </button>
            )}
          </div>

          {matches.length > 0 ? (
            <div className="divide-y divide-border/40">
              {matches.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="mx-auto max-w-md px-6 py-16 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-6 ring-1 ring-primary/20">
                <Feather className="size-6 stroke-[1.75]" />
              </div>
              <blockquote className="font-display italic text-lg sm:text-xl text-foreground/90 leading-relaxed">
                “There is no greater agony than bearing an untold story inside you.”
              </blockquote>
              <p className="mt-2 text-xs font-sans tracking-widest uppercase text-primary font-medium">
                — Maya Angelou
              </p>
              <p className="mt-4 font-reading text-sm text-muted-foreground leading-relaxed">
                No words found matching “{query}”. Try another keyword or browse our curated literary topics.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => setQuery("")}
                  className="rounded-full px-5 py-2 text-xs font-sans font-medium border-border/80 min-h-[44px] flex items-center cursor-pointer"
                >
                  Reset Search
                </Button>
                <Button
                  asChild
                  className="rounded-full px-5 py-2 text-xs font-sans font-medium min-h-[44px] flex items-center cursor-pointer"
                >
                  <Link to="/feed">Explore All Stories</Link>
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
