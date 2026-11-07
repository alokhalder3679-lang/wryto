import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bookmark,
  Heart,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Send,
  Share2,
  Trash2,
  Type,
  Quote,
  UserX,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { FollowButton, isBookmarked, toggleBookmark } from "@/components/post-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl } from "@/lib/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReportModal } from "@/components/report-modal";
import { BlockModal } from "@/components/block-modal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  POST_SELECT,
  relativeTime,
  toPost,
  toWriter,
  type Comment,
  type Post,
} from "@/lib/inkline-data";
import { useInkline } from "@/lib/inkline-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/post/$id")({
  staticData: { sitemap: true },
  loader: async ({ params }) => {
    try {
      const { data } = await supabase
        .from("posts")
        .select(
          "title, body, content, created_at, updated_at, author:profiles!posts_author_id_fkey(handle, display_name)",
        )
        .eq("id", params.id)
        .maybeSingle();
      return {
        meta: data
          ? {
              title: data.title ?? null,
              body: (data.body || data.content || "") as string,
              created_at: data.created_at,
              updated_at: data.updated_at,
              author: data.author as { handle: string; display_name: string } | null,
            }
          : null,
      };
    } catch {
      return { meta: null };
    }
  },
  head: ({ params, loaderData }) => {
    const m = loaderData?.meta;
    const url = `https://wryto-nine.vercel.app/post/${params.id}`;
    const author = m?.author?.display_name;
    const rawText = typeof m?.body === "string" ? m.body : "";
    const excerpt = rawText
      ? rawText.replace(/\s+/g, " ").trim().slice(0, 155)
      : "Read thoughtful posts on Wryto.";
    const headline = m ? m.title || (excerpt.length > 5 ? excerpt.slice(0, 60) : "Post") : "Post";
    const title = m ? `${headline}${author ? ` by ${author}` : ""} — Wryto` : "Post — Wryto";
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
    };
  },
  errorComponent: PostErrorComponent,
  component: PostDetailPage,
});

function PostErrorComponent({ error }: { error?: unknown }) {
  useEffect(() => {
    if (error) {
      console.error("[Wryto Post Route Error]:", error);
    }
  }, [error]);

  return (
    <AppShell title="Post">
      <div className="mx-auto max-w-lg px-6 py-20 text-center space-y-4">
        <h2 className="font-sans text-xl font-bold">Unable to load post</h2>
        <p className="text-sm text-muted-foreground font-sans">
          This post could not be loaded or may have been removed.
        </p>
        <Button asChild className="rounded-full">
          <Link to="/feed">Back to Home</Link>
        </Button>
      </div>
    </AppShell>
  );
}

function PostDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user, profile, liked, toggleLike, refresh } = useInkline();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commenting, setCommenting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bookmarked, setBookmarked] = useState<boolean>(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [readingFont, setReadingFont] = useState<"serif" | "sans">("serif");

  const load = useCallback(async () => {
    try {
      const [postResult, commentsResult] = await Promise.all([
        supabase.from("posts").select(POST_SELECT).eq("id", id).maybeSingle(),
        supabase
          .from("comments")
          .select(
            "id, body, content, created_at, author:profiles!comments_author_id_fkey(id, handle, display_name, bio, location, avatar_url, profile_image)",
          )
          .eq("post_id", id)
          .order("created_at", { ascending: true }),
      ]);

      const parsedPost = postResult?.data ? toPost(postResult.data as never) : null;
      setPost(parsedPost);
      if (parsedPost) {
        setBookmarked(isBookmarked(parsedPost.id));
      }

      setComments(
        ((commentsResult?.data ?? []) as never[])
          .map(
            (row: {
              id: string;
              body?: string;
              content?: string;
              created_at: string;
              author: never;
            }) =>
              row?.author
                ? {
                    id: row.id,
                    body: row.body || row.content || "",
                    createdAt: row.created_at,
                    time: relativeTime(row.created_at),
                    author: toWriter(row.author),
                  }
                : null,
          )
          .filter(Boolean) as Comment[],
      );
    } catch (err) {
      console.warn("Failed to load post/comments:", err);
      setPost(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel(`post-detail-${id}`)
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

  const isLiked = post ? liked.has(post.id) : false;
  const isMine = !!profile && !!post && profile.handle === post.author.handle;

  async function handleLike() {
    if (!post) return;
    if (!user) {
      void navigate({ to: "/auth" });
      return;
    }
    await toggleLike(post.id);
  }

  function handleBookmark() {
    if (!post) return;
    const next = toggleBookmark(post.id);
    setBookmarked(next);
    toast.success(next ? "Post saved to bookmarks" : "Removed from bookmarks");
  }

  async function handleShare() {
    if (!post) return;
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title || `Post by ${post.author.name} on Wryto`,
          text: post.body.slice(0, 100),
          url,
        });
        return;
      } catch {
        // ignore
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Post link copied to clipboard!");
    } catch {
      toast.error("Could not copy link");
    }
  }

  async function addComment() {
    if (!commentText.trim() || !user || commenting) return;
    const body = commentText.trim();
    if (body.length > 2000) {
      toast.error("Reply must be 2,000 characters or less.");
      return;
    }
    setCommenting(true);
    const { error } = await supabase.from("comments").insert({
      post_id: id,
      author_id: user.id,
      body,
      content: body,
    });
    setCommenting(false);
    if (error) {
      toast.error("Couldn't add reply. Please try again.");
      return;
    }
    setCommentText("");
    toast.success("Reply posted!");
    await load();
  }

  async function removeComment(commentId: string) {
    if (!commentId || !window.confirm("Delete this reply?")) return;
    await supabase.from("comments").delete().eq("id", commentId);
    toast.success("Reply deleted");
    await load();
  }

  async function removePost() {
    if (!post || !window.confirm("Delete this post?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    if (error) {
      toast.error("Couldn't delete post.");
      return;
    }
    toast.success("Post deleted");
    await refresh();
    void navigate({ to: "/feed" });
  }

  if (loading) {
    return (
      <AppShell title="Post">
        <div className="p-8 text-center text-muted-foreground font-sans text-sm">
          Loading post…
        </div>
      </AppShell>
    );
  }

  if (!post) {
    return (
      <AppShell title="Post">
        <div className="py-20 text-center px-6 space-y-3">
          <h2 className="text-xl font-bold font-sans">This post is no longer available</h2>
          <Button asChild className="rounded-full mt-2" size="sm">
            <Link to="/feed">Return to Feed</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const isPoetry =
    Array.isArray(post.tags) && post.tags.some((t) => t.toLowerCase().includes("poet"));

  return (
    <AppShell>
      {/* ── Sticky Top Bar ───────────────────────────────────── */}
      <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-border/70 bg-background/90 px-4 h-14 backdrop-blur-md">
        <Link
          to="/feed"
          className="p-1.5 -ml-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          aria-label="Back to feed"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <span className="font-sans text-base font-bold text-foreground">Post</span>
      </div>

      {/* ── Main Post View ───────────────────────────────────── */}
      <article className="p-4 sm:p-6 border-b border-border/70 space-y-4">
        {/* Author Byline Header */}
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/profile/$handle"
            params={{ handle: post.author.handle }}
            className="flex items-center gap-3 min-w-0 flex-1 group"
          >
            <Avatar className="size-11 ring-1 ring-border shadow-xs">
              {getAvatarUrl(post.author.avatarUrl) && (
                <AvatarImage src={getAvatarUrl(post.author.avatarUrl)!} alt={post.author.name} />
              )}
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm font-sans">
                {post.author.initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="font-sans text-sm sm:text-base font-bold text-foreground group-hover:underline truncate">
                {post.author.name}
              </p>
              <p className="font-sans text-xs text-muted-foreground truncate">
                @{post.author.handle}
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-1.5 shrink-0">
            <FollowButton handle={post.author.handle} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8 rounded-full text-muted-foreground">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 rounded-xl">
                {isMine && (
                  <DropdownMenuItem
                    onClick={() => void removePost()}
                    className="cursor-pointer gap-2 text-xs font-sans text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                    <span>Delete Post</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleShare} className="cursor-pointer gap-2 text-xs font-sans">
                  <Share2 className="size-3.5 text-primary" />
                  <span>Copy Link</span>
                </DropdownMenuItem>
                {!isMine && (
                  <>
                    <DropdownMenuItem
                      onClick={() => setReportOpen(true)}
                      className="cursor-pointer gap-2 text-xs font-sans"
                    >
                      <span>Report</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setBlockOpen(true)}
                      className="cursor-pointer gap-2 text-xs font-sans text-destructive"
                    >
                      <UserX className="size-3.5" />
                      <span>Block @{post.author.handle}</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Typography Switcher Pill for Reading Sanctuary */}
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-sans">
            <span className="font-medium text-foreground">{post.readTime || "2 min read"}</span>
            <span>·</span>
            <span className="text-[11px] capitalize">{isPoetry ? "Poetry" : "Essay"}</span>
          </div>
          <button
            type="button"
            onClick={() => setReadingFont((f) => (f === "serif" ? "sans" : "serif"))}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-border/70 hover:bg-muted text-muted-foreground hover:text-foreground transition-all spring-press cursor-pointer"
            title="Switch typography font"
          >
            <Type className="size-3" />
            <span className="text-[11px] font-sans">{readingFont === "serif" ? "Serif" : "Sans"}</span>
          </button>
        </div>

        {/* Post Title (If present) */}
        {post.title && (
          <h1 className="font-sans text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-snug">
            {post.title}
          </h1>
        )}

        {/* Post Body Content */}
        <div
          className={cn(
            readingFont === "serif"
              ? "font-serif text-base sm:text-lg leading-relaxed"
              : "font-sans text-base sm:text-lg leading-relaxed",
            "text-foreground whitespace-pre-line break-words",
            isPoetry && "font-serif italic text-lg sm:text-xl leading-loose",
          )}
        >
          {post.body}
        </div>

        {/* Topic Tags */}
        {Array.isArray(post.tags) && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-2">
            {post.tags.map((tag) => (
              <Link
                key={tag}
                to="/discover"
                search={{ q: tag }}
                className="text-xs font-sans font-medium text-primary hover:underline"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}

        {/* Timestamp & Read Time */}
        <div className="pt-3 border-t border-border/50 text-xs font-sans text-muted-foreground flex items-center gap-2">
          <span>{post.time}</span>
          <span>·</span>
          <span>{post.readTime}</span>
        </div>

        {/* Social Metrics Bar */}
        <div className="py-2.5 border-y border-border/50 flex items-center gap-5 text-xs font-sans">
          <div>
            <span className="font-bold text-foreground mr-1">{post.likes}</span>
            <span className="text-muted-foreground">Likes</span>
          </div>
          <div>
            <span className="font-bold text-foreground mr-1">{comments.length}</span>
            <span className="text-muted-foreground">Replies</span>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex items-center justify-around py-1 text-muted-foreground">
          {/* Like */}
          <button
            type="button"
            onClick={handleLike}
            className={cn(
              "p-2 rounded-full hover:bg-rose-500/10 hover:text-rose-600 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-sans",
              isLiked && "text-rose-600 font-semibold",
            )}
            aria-label="Like"
          >
            <Heart className={cn("size-5", isLiked && "fill-rose-600 text-rose-600")} />
            <span>{post.likes}</span>
          </button>

          {/* Comment */}
          <a
            href="#reply-form"
            className="p-2 rounded-full hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-sans"
            aria-label="Reply"
          >
            <MessageCircle className="size-5" />
            <span>{comments.length}</span>
          </a>

          {/* Bookmark */}
          <button
            type="button"
            onClick={handleBookmark}
            className={cn(
              "p-2 rounded-full hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer",
              bookmarked && "text-primary",
            )}
            aria-label="Bookmark"
          >
            <Bookmark className={cn("size-5", bookmarked && "fill-primary text-primary")} />
          </button>

          {/* Share */}
          <button
            type="button"
            onClick={handleShare}
            className="p-2 rounded-full hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
            aria-label="Share"
          >
            <Share2 className="size-5" />
          </button>
        </div>
      </article>

      {/* ── Reply Input Box ───────────────────────────────────── */}
      <section id="reply-form" className="p-4 sm:p-5 border-b border-border/70 bg-card/40">
        {user ? (
          <div className="flex gap-3">
            <Avatar className="size-9 shrink-0 ring-1 ring-border mt-0.5">
              {getAvatarUrl(profile?.avatarUrl) && (
                <AvatarImage src={getAvatarUrl(profile?.avatarUrl)!} alt={profile?.name ?? "User"} />
              )}
              <AvatarFallback className="text-xs font-bold font-sans">
                {profile?.name ? initialsOf(profile.name) : "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 space-y-2.5">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value.slice(0, 2000))}
                placeholder="Post your reply..."
                className="w-full bg-transparent text-sm font-sans text-foreground placeholder:text-muted-foreground outline-none resize-none min-h-[64px]"
                rows={2}
              />
              <div className="flex items-center justify-between pt-1 border-t border-border/40">
                <span className="text-[11px] font-sans text-muted-foreground">
                  {commentText.length} / 2,000
                </span>
                <Button
                  size="sm"
                  onClick={() => void addComment()}
                  disabled={!commentText.trim() || commenting}
                  className="rounded-full px-5 h-8 font-semibold text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {commenting ? (
                    <Loader2 className="size-3 animate-spin mr-1" />
                  ) : (
                    "Reply"
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 text-center space-y-2">
            <p className="font-sans text-xs text-muted-foreground">
              Sign in to join the conversation and leave a reply.
            </p>
            <Button asChild size="sm" variant="outline" className="rounded-full text-xs">
              <Link to="/auth">Sign In</Link>
            </Button>
          </div>
        )}
      </section>

      {/* ── Threaded Replies Stream ───────────────────────────── */}
      <section className="divide-y divide-border/60">
        <div className="px-4 py-3 bg-muted/20 border-b border-border/50">
          <h2 className="font-sans text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Replies ({comments.length})
          </h2>
        </div>

        {comments.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground font-sans text-xs">
            No replies yet. Be the first to start the conversation!
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="p-4 sm:p-5 flex gap-3 hover:bg-muted/15 transition-colors">
              <Link
                to="/profile/$handle"
                params={{ handle: comment.author.handle }}
                className="shrink-0 block mt-0.5"
              >
                <Avatar className="size-9 ring-1 ring-border">
                  {getAvatarUrl(comment.author.avatarUrl) && (
                    <AvatarImage src={getAvatarUrl(comment.author.avatarUrl)!} alt={comment.author.name} />
                  )}
                  <AvatarFallback className="text-xs font-bold font-sans">
                    {comment.author.initials}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5 min-w-0 truncate">
                    <Link
                      to="/profile/$handle"
                      params={{ handle: comment.author.handle }}
                      className="font-sans text-xs font-bold text-foreground hover:underline truncate"
                    >
                      {comment.author.name}
                    </Link>
                    <span className="font-sans text-[11px] text-muted-foreground truncate">
                      @{comment.author.handle}
                    </span>
                    <span className="text-muted-foreground/60 text-xs">·</span>
                    <span className="font-sans text-[11px] text-muted-foreground">{comment.time}</span>
                  </div>

                  {user && (user.id === comment.author.id || user.id === post.author.id) && (
                    <button
                      type="button"
                      onClick={() => void removeComment(comment.id)}
                      className="text-muted-foreground hover:text-destructive p-1 rounded-md transition-colors"
                      title="Delete reply"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
                <p className="font-sans text-xs sm:text-sm leading-relaxed text-foreground whitespace-pre-line break-words">
                  {comment.body}
                </p>
              </div>
            </div>
          ))
        )}
      </section>

      {/* Modals */}
      <ReportModal
        open={reportOpen}
        onOpenChange={setReportOpen}
        targetType="post"
        targetId={post.id}
      />
      <BlockModal
        open={blockOpen}
        onOpenChange={setBlockOpen}
        targetUser={{
          id: post.author.id,
          handle: post.author.handle,
          name: post.author.name,
        }}
      />
    </AppShell>
  );
}
