import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookOpen, Sparkles, UserPlus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PostCard } from "@/components/post-card";
import { InlineComposer } from "@/components/inline-composer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
        content: "Discover ideas, stories, and thoughts on Wryto.",
      },
      { property: "og:title", content: "Home — Wryto" },
      {
        property: "og:description",
        content: "Discover ideas, stories, and thoughts on Wryto.",
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
        <h2 className="text-xl font-bold">Unable to load feed</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          There was a problem loading your feed. Please try refreshing.
        </p>
        <Button onClick={() => window.location.reload()} className="rounded-xl min-h-[44px]">
          Refresh
        </Button>
      </div>
    </AppShell>
  );
}

function FeedSkeleton() {
  return (
    <div className="divide-y divide-border/60">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-32 rounded-md" />
              <Skeleton className="h-3 w-20 rounded-md" />
            </div>
          </div>
          <Skeleton className="h-4 w-3/4 rounded-md" />
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-4 w-5/6 rounded-md" />
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
      <div className="mx-auto max-w-md px-6 py-16 text-center space-y-4">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <UserPlus className="size-6" />
        </div>
        <h3 className="text-base font-bold text-foreground">See posts from creators you follow</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Sign in to curate your personal feed and stay updated with the writers and thinkers you care about.
        </p>
        <Button asChild className="rounded-xl px-6 font-semibold min-h-[44px]" size="sm">
          <Link to="/auth">Sign In to Wryto</Link>
        </Button>
      </div>
    );
  }

  if (posts === null || contextLoading || loading) {
    return <FeedSkeleton />;
  }

  if (!posts.length) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center space-y-4">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <BookOpen className="size-6" />
        </div>
        <h3 className="text-base font-bold text-foreground">Your Following feed is quiet</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Follow writers and creators across Wryto to see their latest thoughts, stories, and poetry here.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Button asChild variant="outline" className="rounded-xl text-xs font-semibold min-h-[40px]" size="sm">
            <Link to="/discover" search={{ q: "" }}>
              Explore Creators
            </Link>
          </Button>
          <Button asChild className="rounded-xl text-xs font-semibold min-h-[40px]" size="sm">
            <Link to="/create">Write a Post</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/60">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}

function FeedPage() {
  const { posts, loading, refresh } = useInkline();
  const [tab, setTab] = useState<"for-you" | "following">("for-you");

  return (
    <AppShell>
      {/* ── Apple Liquid Glass Segmented Header ────────── */}
      <div className="sticky top-0 z-20 liquid-glass border-b border-border/60 p-2">
        <div className="flex p-1 rounded-2xl bg-muted/60 border border-border/50 max-w-md mx-auto">
          <button
            type="button"
            onClick={() => setTab("for-you")}
            className={cn(
              "flex-1 py-2 text-center text-xs sm:text-sm rounded-xl transition-all spring-press cursor-pointer",
              tab === "for-you"
                ? "bg-card text-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            For You
          </button>

          <button
            type="button"
            onClick={() => setTab("following")}
            className={cn(
              "flex-1 py-2 text-center text-xs sm:text-sm rounded-xl transition-all spring-press cursor-pointer",
              tab === "following"
                ? "bg-card text-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Following
          </button>
        </div>
      </div>

      {/* ── Inline Quick Composer (Top of Feed) ───────────────── */}
      <InlineComposer onPublished={refresh} />

      {/* ── Feed Stream ───────────────────────────────────────── */}
      {tab === "following" ? (
        <FollowingFeed />
      ) : loading ? (
        <FeedSkeleton />
      ) : posts.length === 0 ? (
        <div className="py-20 text-center px-6 space-y-3">
          <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Sparkles className="size-6" />
          </div>
          <h3 className="text-base font-bold text-foreground">Welcome to Wryto</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Be the first to share a thought, poem, or story with the community.
          </p>
          <Button asChild className="rounded-xl text-xs font-semibold mt-2 min-h-[44px]" size="sm">
            <Link to="/create">Publish First Post</Link>
          </Button>
        </div>
      ) : (
        <div className="divide-y divide-border/60">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </AppShell>
  );
}
