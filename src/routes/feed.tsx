import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookOpen, Feather, Scroll, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { FollowButton, PostCard, TopicChip } from "@/components/post-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getAvatarUrl } from "@/lib/avatar";
import { useInkline } from "@/lib/inkline-context";
import { supabase } from "@/integrations/supabase/client";
import { POST_SELECT, toPost, type Post } from "@/lib/inkline-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/feed")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Home — Wryto" },
      {
        name: "description",
        content: "Read fresh essays, poetry, and stories from writers you follow.",
      },
      { property: "og:title", content: "Home — Wryto" },
      {
        property: "og:description",
        content: "Read fresh essays, poetry, and stories from writers you follow.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: FeedErrorComponent,
  component: FeedPage,
});

function FeedErrorComponent() {
  return (
    <AppShell>
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
        <h2 className="font-display text-2xl font-bold">Unable to load feed</h2>
        <p className="max-w-md text-sm text-muted-foreground font-reading">
          There was a problem loading your feed. Please try refreshing.
        </p>
        <Button onClick={() => window.location.reload()} className="rounded-full min-h-[44px]">
          Refresh
        </Button>
      </div>
    </AppShell>
  );
}

const CURATED_TOPICS = [
  "All",
  "Poetry",
  "Story",
  "Essay",
  "Philosophy",
  "Culture",
  "Memoir",
  "Craft",
];

function FeedSkeleton() {
  return (
    <div className="space-y-8 px-5 sm:px-8 py-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="border-b border-border/50 pb-8 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="size-8 rounded-full" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-2.5 w-24" />
            </div>
          </div>
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      ))}
    </div>
  );
}

function FollowingFeed() {
  const { user, followed, loading: contextLoading } = useInkline();
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const { data: rows } = await supabase.rpc("following_feed", { _limit: 50 });
        const ids = ((rows ?? []) as { id: string }[]).map((row) => row.id);
        if (!ids.length) {
          if (active) setPosts([]);
          return;
        }
        const { data } = await supabase.from("posts").select(POST_SELECT).in("id", ids);
        if (!active) return;
        const byId = new Map(
          ((data ?? []) as never[])
            .map(toPost)
            .filter(Boolean)
            .map((post) => [(post as Post).id, post as Post]),
        );
        setPosts(ids.map((id) => byId.get(id)).filter(Boolean) as Post[]);
      } catch (err) {
        console.warn("Error loading following feed:", err);
        if (active) setPosts([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user, followed]);

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-6 ring-1 ring-primary/20">
          <BookOpen className="size-6 stroke-[1.75]" />
        </div>
        <blockquote className="font-display italic text-lg sm:text-xl text-foreground/90 leading-relaxed">
          “A reader lives a thousand lives before he dies. The man who never reads lives only one.”
        </blockquote>
        <p className="mt-2 text-xs font-sans tracking-widest uppercase text-primary font-medium">
          — George R.R. Martin
        </p>
        <p className="mt-4 font-reading text-sm text-muted-foreground leading-relaxed">
          Sign in to curate your personal literary feed and read new dispatches from authors you follow.
        </p>
        <div className="mt-6 flex justify-center">
          <Button
            asChild
            className="rounded-full px-6 py-2 text-xs font-sans font-medium min-h-[44px] flex items-center cursor-pointer"
          >
            <Link to="/auth">Sign in to Wryto</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (posts === null || contextLoading || loading) {
    return <FeedSkeleton />;
  }

  if (!posts.length) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-6 ring-1 ring-primary/20">
          <Feather className="size-6 stroke-[1.75]" />
        </div>
        <blockquote className="font-display italic text-lg sm:text-xl text-foreground/90 leading-relaxed">
          “Words are our most inexhaustible source of magic.”
        </blockquote>
        <p className="mt-2 text-xs font-sans tracking-widest uppercase text-primary font-medium">
          — J.K. Rowling
        </p>
        <p className="mt-4 font-reading text-sm text-muted-foreground leading-relaxed">
          Your following feed is currently silent. Explore essayists, poets, and storytellers to fill your daily journal.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button
            asChild
            variant="outline"
            className="rounded-full px-5 py-2 text-xs font-sans font-medium border-border/80 min-h-[44px] flex items-center cursor-pointer"
          >
            <Link to="/discover" search={{ q: "" }}>
              Discover Writers
            </Link>
          </Button>
          <Button
            asChild
            className="rounded-full px-5 py-2 text-xs font-sans font-medium min-h-[44px] flex items-center cursor-pointer"
          >
            <Link to="/create">Write a Piece</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-2">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}

function FeedSidebar({
  selectedTopic,
  onSelectTopic,
}: {
  selectedTopic: string;
  onSelectTopic: (topic: string) => void;
}) {
  const { writers, profile } = useInkline();
  const suggestedWriters = writers
    .filter((w) => w.handle !== profile?.handle)
    .slice(0, 5);

  return (
    <aside className="space-y-8">
      {/* Recommended Topics */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold tracking-tight text-foreground">
            Curated Topics
          </h3>
          <Link
            to="/discover"
            search={{ q: "" }}
            className="text-xs font-sans text-muted-foreground hover:text-primary transition-colors"
          >
            Explore all
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {CURATED_TOPICS.map((topic) => (
            <TopicChip
              key={topic}
              active={selectedTopic === topic}
              onClick={() => onSelectTopic(topic)}
            >
              {topic === "All" ? "All Stories" : topic}
            </TopicChip>
          ))}
        </div>
      </div>

      <div className="h-px bg-border/50" />

      {/* Writers to Discover */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold tracking-tight text-foreground">
            Writers to Discover
          </h3>
          <Link
            to="/discover"
            search={{ q: "" }}
            className="text-xs font-sans text-muted-foreground hover:text-primary transition-colors"
          >
            See more
          </Link>
        </div>
        <div className="space-y-3.5">
          {suggestedWriters.map((writer) => (
            <div
              key={writer.handle}
              className="flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar className="size-8 rounded-full border border-border/80 shrink-0">
                  {getAvatarUrl(writer.avatarUrl) && (
                    <AvatarImage
                      src={getAvatarUrl(writer.avatarUrl)!}
                      alt={writer.name}
                      className="object-cover"
                    />
                  )}
                  <AvatarFallback className="bg-accent text-xs font-medium text-accent-foreground font-sans">
                    {writer.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <Link
                    to="/profile/$handle"
                    params={{ handle: writer.handle }}
                    className="font-medium text-xs font-sans text-foreground hover:text-primary transition-colors truncate block"
                  >
                    {writer.name}
                  </Link>
                  <p className="text-[11px] font-sans text-muted-foreground truncate">
                    {writer.bio || `@${writer.handle}`}
                  </p>
                </div>
              </div>
              <FollowButton handle={writer.handle} />
            </div>
          ))}
          {!suggestedWriters.length && (
            <p className="text-xs font-sans text-muted-foreground">
              New voices appearing soon.
            </p>
          )}
        </div>
      </div>

      <div className="h-px bg-border/50" />

      {/* Literary Journal Inspiration / Quote Card */}
      <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-2">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="size-3.5" />
          <span className="text-[11px] font-sans font-semibold uppercase tracking-wider">
            Reading Room
          </span>
        </div>
        <blockquote className="font-display italic text-xs leading-relaxed text-foreground/80">
          “There is no greater agony than bearing an untold story inside you.”
        </blockquote>
        <p className="text-[10px] font-sans text-muted-foreground text-right">
          — Maya Angelou
        </p>
      </div>
    </aside>
  );
}

function FeedPage() {
  const { posts, loading } = useInkline();
  const [activeTab, setActiveTab] = useState<"curated" | "following">("curated");
  const [selectedTopic, setSelectedTopic] = useState("All");

  const filtered =
    selectedTopic === "All"
      ? posts
      : posts.filter(
          (post) =>
            Array.isArray(post.tags) &&
            post.tags.some(
              (tag) =>
                tag.toLowerCase() === selectedTopic.toLowerCase() ||
                tag.toLowerCase() === `#${selectedTopic.toLowerCase()}`,
            ),
        );

  return (
    <AppShell>
      {/* Desktop expansion for two-column editorial layout */}
      <style>{`
        @media (min-width: 1280px) {
          [data-shell-main] {
            max-width: 68rem !important;
          }
        }
      `}</style>

      {/* Editorial Tabs with Minimal Ink Underlines */}
      <div className="border-b border-border/60 px-5 sm:px-8">
        <div className="flex items-center gap-8 -mb-px">
          <button
            type="button"
            onClick={() => setActiveTab("curated")}
            className={cn(
              "relative py-4 text-sm sm:text-base font-display font-medium transition-colors min-h-[44px] flex items-center cursor-pointer",
              activeTab === "curated"
                ? "text-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Curated Feed
            {activeTab === "curated" && (
              <span className="absolute bottom-0 inset-x-0 h-0.5 bg-primary rounded-full transition-all" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("following")}
            className={cn(
              "relative py-4 text-sm sm:text-base font-display font-medium transition-colors min-h-[44px] flex items-center cursor-pointer",
              activeTab === "following"
                ? "text-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Following
            {activeTab === "following" && (
              <span className="absolute bottom-0 inset-x-0 h-0.5 bg-primary rounded-full transition-all" />
            )}
          </button>
        </div>
      </div>

      {/* Topic Chips Bar for Mobile / Smaller Screens (< xl) */}
      {activeTab === "curated" && (
        <div className="flex xl:hidden items-center gap-2 overflow-x-auto px-5 py-3 sm:px-8 border-b border-border/40 scrollbar-none">
          {CURATED_TOPICS.map((topic) => (
            <TopicChip
              key={topic}
              active={selectedTopic === topic}
              onClick={() => setSelectedTopic(topic)}
            >
              {topic === "All" ? "All Stories" : topic}
            </TopicChip>
          ))}
        </div>
      )}

      {/* Main Content Grid: Stories on Left, Side Column on Right */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 pt-6">
        {/* Stories Column */}
        <div className="xl:col-span-8 min-w-0">
          {activeTab === "following" ? (
            <FollowingFeed />
          ) : (
            <div>
              {loading ? (
                <FeedSkeleton />
              ) : filtered.length ? (
                filtered.map((post) => <PostCard key={post.id} post={post} />)
              ) : (
                <div className="mx-auto max-w-md px-6 py-16 text-center">
                  <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-6 ring-1 ring-primary/20">
                    <Scroll className="size-6 stroke-[1.75]" />
                  </div>
                  <blockquote className="font-display italic text-lg sm:text-xl text-foreground/90 leading-relaxed">
                    “Fill your paper with the breathings of your heart.”
                  </blockquote>
                  <p className="mt-2 text-xs font-sans tracking-widest uppercase text-primary font-medium">
                    — William Wordsworth
                  </p>
                  <p className="mt-4 font-reading text-sm text-muted-foreground leading-relaxed">
                    {selectedTopic === "All"
                      ? "The archive is currently quiet. Be the first author to ink words upon this page."
                      : `No stories found in the “${selectedTopic}” archive. Share your thoughts on this topic.`}
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-3">
                    {selectedTopic !== "All" && (
                      <Button
                        variant="outline"
                        onClick={() => setSelectedTopic("All")}
                        className="rounded-full px-5 py-2 text-xs font-sans font-medium border-border/80 min-h-[44px] flex items-center cursor-pointer"
                      >
                        View All Stories
                      </Button>
                    )}
                    <Button
                      asChild
                      className="rounded-full px-5 py-2 text-xs font-sans font-medium min-h-[44px] flex items-center cursor-pointer"
                    >
                      <Link to="/create">Draft a Story</Link>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Side Column (Desktop XL+) */}
        <div className="hidden xl:block xl:col-span-4 pl-8 border-l border-border/50 sticky top-20 self-start">
          <FeedSidebar
            selectedTopic={selectedTopic}
            onSelectTopic={(t) => {
              setActiveTab("curated");
              setSelectedTopic(t);
            }}
          />
        </div>
      </div>
    </AppShell>
  );
}
