import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PostCard, TopicChip } from "@/components/post-card";
import { useInkline } from "@/lib/inkline-context";
import { supabase } from "@/integrations/supabase/client";
import { POST_SELECT, toPost, type Post } from "@/lib/inkline-data";

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
        <h2 className="text-xl font-bold">Unable to load feed</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          There was a problem loading your feed. Please try refreshing.
        </p>
        <Button onClick={() => window.location.reload()}>Refresh</Button>
      </div>
    </AppShell>
  );
}

function FollowingFeed() {
  const { user, followed, loading: contextLoading } = useInkline();
  const [posts, setPosts] = useState<Post[] | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
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
    })();
    return () => {
      active = false;
    };
  }, [user, followed]);

  if (!user) {
    return (
      <div className="px-6 py-20 text-center">
        <p className="font-reading text-lg text-muted-foreground">
          Sign in to see the latest from writers you follow.
        </p>
        <Link
          to="/auth"
          className="mt-4 inline-block rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
        >
          Sign in
        </Link>
      </div>
    );
  }
  if (posts === null || contextLoading)
    return <p className="px-6 py-20 text-center text-muted-foreground">Loading…</p>;
  if (!posts.length) {
    return (
      <div className="px-6 py-20 text-center">
        <p className="font-reading text-lg text-muted-foreground">
          Nothing here yet. Follow writers to fill this feed.
        </p>
        <Link
          to="/discover"
          search={{ q: "" }}
          className="mt-4 inline-block rounded-full border border-border px-5 py-2 text-sm font-medium"
        >
          Discover writers
        </Link>
      </div>
    );
  }
  return (
    <div>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}

function FeedPage() {
  const { posts, loading } = useInkline();
  const [topic, setTopic] = useState("For you");
  const filtered =
    topic === "For you"
      ? posts
      : posts.filter((post) => Array.isArray(post.tags) && post.tags.includes(topic.toLowerCase()));
  const isFollowingTab = topic === "Following";
  return (
    <AppShell>
      <div className="flex gap-2 overflow-x-auto border-b border-border px-5 py-4 sm:px-8">
        {["For you", "Following", "Poetry", "Story", "Essay"].map((item) => (
          <TopicChip key={item} active={topic === item} onClick={() => setTopic(item)}>
            {item}
          </TopicChip>
        ))}
      </div>
      {isFollowingTab ? (
        <FollowingFeed />
      ) : (
        <div>
          {loading ? (
            <p className="px-6 py-20 text-center text-muted-foreground">Loading…</p>
          ) : filtered.length ? (
            filtered.map((post) => <PostCard key={post.id} post={post} />)
          ) : (
            <p className="px-6 py-20 text-center font-reading text-lg text-muted-foreground">
              No pieces here yet. Be the first to write one.
            </p>
          )}
        </div>
      )}
    </AppShell>
  );
}
