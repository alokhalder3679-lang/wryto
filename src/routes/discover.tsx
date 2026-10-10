import { createFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { AppShell } from "@/components/app-shell";
import { FollowButton, PostCard, TopicChip } from "@/components/post-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useInkline } from "@/lib/inkline-context";

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
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
        <h2 className="text-xl font-bold">Unable to load discover</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          There was an issue loading the discover page. Please try refreshing.
        </p>
        <Button onClick={() => window.location.reload()}>Refresh</Button>
      </div>
    </AppShell>
  );
}

function DiscoverPage() {
  const { q } = Route.useSearch();
  const [query, setQuery] = useState(q);
  const { posts, writers, profile } = useInkline();
  const term = query.trim().toLowerCase();
  const matches = posts.filter((post) => {
    if (!term) return true;
    const bodyMatch = post.body?.toLowerCase().includes(term);
    const titleMatch = post.title?.toLowerCase().includes(term);
    const tagMatch = Array.isArray(post.tags) && post.tags.some((tag) => tag.toLowerCase().includes(term));
    const authorNameMatch = post.author?.name?.toLowerCase().includes(term);
    const authorHandleMatch = post.author?.handle?.toLowerCase().includes(term);
    return bodyMatch || titleMatch || tagMatch || authorNameMatch || authorHandleMatch;
  });
  const [people, setPeople] = useState<
    { handle: string; display_name: string; bio: string | null; followers_count: number }[]
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
        .select("handle, display_name, bio, followers_count")
        .or(`handle.ilike.${userTerm}%,display_name.ilike.%${userTerm}%`)
        .order("followers_count", { ascending: false })
        .limit(8);
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
      <div className="px-5 py-5 sm:px-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-11 bg-muted pl-10 shadow-none"
            placeholder="Search writers, stories, or topics"
          />
        </div>
        <div className="mt-4 flex gap-2 overflow-x-auto">
          {["#poetry", "#story", "#essay", "#nature"].map((tag) => (
            <TopicChip key={tag} onClick={() => setQuery(tag.slice(1))}>
              {tag}
            </TopicChip>
          ))}
        </div>
      </div>
      {!query && suggested.length > 0 && (
        <section className="border-y border-border px-5 py-7 sm:px-8">
          <h2 className="font-display text-xl font-semibold">Writers to know</h2>
          <div className="mt-5 space-y-5">
            {suggested.map((writer) => (
              <div key={writer.handle} className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback className="bg-accent text-xs">{writer.initials}</AvatarFallback>
                </Avatar>
                <Link
                  className="min-w-0 flex-1"
                  to="/profile/$handle"
                  params={{ handle: writer.handle }}
                >
                  <p className="font-semibold">{writer.name}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {writer.bio ?? `@${writer.handle}`}
                  </p>
                </Link>
                <FollowButton handle={writer.handle} />
              </div>
            ))}
          </div>
        </section>
      )}
      {query && (
        <section className="border-y border-border px-5 py-6 sm:px-8">
          <h2 className="font-display text-xl font-semibold">Writers</h2>
          {peopleState === "loading" ? (
            <div className="mt-4 space-y-3">
              {[0, 1].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : peopleState === "error" ? (
            <p className="mt-4 text-sm text-destructive">
              Couldn't search writers. Please try again.
            </p>
          ) : people.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No writers match “{query}”.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {people.map((w) => (
                <div key={w.handle} className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-accent text-xs">
                      {w.display_name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <Link
                    className="min-w-0 flex-1"
                    to="/profile/$handle"
                    params={{ handle: w.handle }}
                  >
                    <p className="font-semibold">
                      {w.display_name}{" "}
                      <span className="text-sm font-normal text-muted-foreground">@{w.handle}</span>
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {w.followers_count} followers{w.bio ? ` · ${w.bio}` : ""}
                    </p>
                  </Link>
                  {w.handle !== profile?.handle && <FollowButton handle={w.handle} />}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
      <section>
        <div className="px-5 pt-7 sm:px-8">
          <h2 className="font-display text-xl font-semibold">
            {query ? `Results for “${query}”` : "Worth reading"}
          </h2>
        </div>
        {matches.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
        {!matches.length && (
          <p className="px-6 py-16 text-center text-muted-foreground">
            No words found. Try another search.
          </p>
        )}
      </section>
    </AppShell>
  );
}
