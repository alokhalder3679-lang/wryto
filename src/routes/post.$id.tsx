import { createFileRoute, Link } from "@tanstack/react-router";
import { Send } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl } from "@/lib/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import {
  POST_SELECT,
  relativeTime,
  toPost,
  toWriter,
  type Comment,
  type Post,
} from "@/lib/inkline-data";
import { useInkline } from "@/lib/inkline-context";

const SITE = "https://textbloom-net.lovable.app";

export const Route = createFileRoute("/post/$id")({
  staticData: { sitemap: true },
  loader: async ({ params }) => {
    try {
      const { data } = await supabase
        .from("posts")
        .select(
          "title, body, created_at, updated_at, author:profiles!posts_author_id_fkey(handle, display_name)",
        )
        .eq("id", params.id)
        .maybeSingle();
      return {
        meta: data as null | {
          title: string | null;
          body: string;
          created_at: string;
          updated_at: string;
          author: { handle: string; display_name: string } | null;
        },
      };
    } catch {
      return { meta: null };
    }
  },
  head: ({ params, loaderData }) => {
    const m = loaderData?.meta;
    const url = `${SITE}/post/${params.id}`;
    const author = m?.author?.display_name;
    const excerpt = m
      ? m.body.replace(/\s+/g, " ").trim().slice(0, 155)
      : "Read and discuss thoughtful writing on Wryto.";
    const headline = m
      ? m.title || `${excerpt.slice(0, 60)}${excerpt.length > 60 ? "…" : ""}`
      : "Read a piece";
    const title = m
      ? `${headline}${author ? ` by ${author}` : ""} — Wryto`
      : "Read a piece — Wryto";
    return {
      meta: [
        { title },
        { name: "description", content: excerpt },
        { property: "og:title", content: title },
        { property: "og:description", content: excerpt },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: m
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Article",
                headline,
                description: excerpt,
                url,
                datePublished: m.created_at,
                dateModified: m.updated_at,
                ...(m.author
                  ? {
                      author: {
                        "@type": "Person",
                        name: m.author.display_name,
                        url: `${SITE}/profile/${m.author.handle}`,
                      },
                    }
                  : {}),
              }),
            },
          ]
        : [],
    };
  },
  component: PostDetail,
});

function PostDetail() {
  const { id } = Route.useParams();
  const { user } = useInkline();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [postResult, commentsResult] = await Promise.all([
      supabase.from("posts").select(POST_SELECT).eq("id", id).maybeSingle(),
      supabase
        .from("comments")
        .select(
          "id, body, created_at, author:profiles!comments_author_id_fkey(id, handle, display_name, bio, location, avatar_url)",
        )
        .eq("post_id", id)
        .order("created_at", { ascending: true }),
    ]);
    setPost(postResult.data ? toPost(postResult.data as never) : null);
    setComments(
      ((commentsResult.data ?? []) as never[])
        .map((row: { id: string; body: string; created_at: string; author: never }) =>
          row.author
            ? {
                id: row.id,
                body: row.body,
                createdAt: row.created_at,
                time: relativeTime(row.created_at),
                author: toWriter(row.author),
              }
            : null,
        )
        .filter(Boolean) as Comment[],
    );
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel(`post-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments", filter: `post_id=eq.${id}` },
        () => void load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "likes", filter: `post_id=eq.${id}` },
        () => void load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, load]);

  async function addComment() {
    if (!text.trim() || !user) return;
    const body = text.trim();
    setText("");
    await supabase.from("comments").insert({ post_id: id, author_id: user.id, body });
    await load();
  }

  async function removeComment(commentId: string) {
    if (!window.confirm("Delete this response?")) return;
    await supabase.from("comments").delete().eq("id", commentId);
    await load();
  }

  if (loading)
    return (
      <AppShell title="Reading">
        <p className="px-6 py-20 text-center text-muted-foreground">Loading…</p>
      </AppShell>
    );
  if (!post)
    return (
      <AppShell title="Reading">
        <p className="px-6 py-20 text-center text-muted-foreground">
          This piece is no longer available.
        </p>
      </AppShell>
    );

  return (
    <AppShell title={post.title || `A piece by ${post.author.name}`}>
      <PostCard post={post} full />
      <section className="border-t border-border px-5 py-7 sm:px-8">
        <h2 className="font-display text-xl font-semibold">
          Responses{" "}
          <span className="font-sans text-sm font-normal text-muted-foreground">
            {comments.length}
          </span>
        </h2>
        {user ? (
          <div className="mt-5 flex gap-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void addComment()}
              placeholder="Add a thoughtful response…"
            />
            <Button size="icon" onClick={() => void addComment()} aria-label="Post response">
              <Send />
            </Button>
          </div>
        ) : (
          <p className="mt-5 text-sm text-muted-foreground">
            <Link to="/auth" className="font-semibold text-primary">
              Sign in
            </Link>{" "}
            to join the conversation.
          </p>
        )}
        <div className="mt-7 space-y-7">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <Avatar className="size-9 shrink-0">
                {getAvatarUrl(comment.author.avatarUrl) && (
                  <AvatarImage
                    src={getAvatarUrl(comment.author.avatarUrl)!}
                    alt={comment.author.name}
                    className="object-cover"
                  />
                )}
                <AvatarFallback className="bg-muted text-xs">
                  {comment.author.initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">
                    {comment.author.name}{" "}
                    <span className="font-normal text-muted-foreground">· {comment.time}</span>
                  </p>
                  {user && (user.id === comment.author.id || user.id === post.author.id) && (
                    <button
                      onClick={() => void removeComment(comment.id)}
                      className="text-xs text-muted-foreground hover:text-destructive"
                      title="Delete response"
                    >
                      Delete
                    </button>
                  )}
                </div>
                <p className="mt-1 font-reading leading-7 text-foreground/85">{comment.body}</p>
              </div>
            </div>
          ))}
          {!comments.length && (
            <p className="font-reading text-muted-foreground">
              No responses yet. Be the first to write one.
            </p>
          )}
        </div>
      </section>
    </AppShell>
  );
}
