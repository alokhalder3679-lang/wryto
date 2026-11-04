import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bookmark,
  Feather,
  Flag,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Send,
  Share2,
  Trash2,
  UserX,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import {
  ClapIcon,
  FollowButton,
  isBookmarked,
  toggleBookmark,
} from "@/components/post-card";
import { ProfilePreview } from "@/components/profile-preview";
import { ReportModal } from "@/components/report-modal";
import { BlockModal } from "@/components/block-modal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl } from "@/lib/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useSettings } from "@/lib/user-settings";
import { cn } from "@/lib/utils";

const SITE = "https://textbloom-net.lovable.app";

function PostErrorComponent() {
  return (
    <AppShell title="Reading">
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        <h2 className="font-display text-2xl font-semibold">Unable to load piece</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This piece could not be loaded or may have been removed.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            to="/feed"
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Back to Stories
          </Link>
          <Link
            to="/discover"
            search={{ q: "" }}
            className="inline-flex items-center justify-center rounded-full border border-border px-5 py-2 text-xs font-semibold text-foreground hover:bg-accent"
          >
            Explore Writers
          </Link>
        </div>
      </div>
    </AppShell>
  );
}

export const Route = createFileRoute("/post/$id")({
  staticData: { sitemap: true },
  errorComponent: PostErrorComponent,
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

function formatStoryDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*.*?\*\*|\*.*?\*|__.*?__|_.*?_)/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(text.slice(lastIdx, match.index));
    }
    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={match.index} className="font-bold text-foreground">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("__") && token.endsWith("__")) {
      parts.push(
        <strong key={match.index} className="font-bold text-foreground">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      parts.push(
        <em key={match.index} className="italic text-foreground/95">
          {token.slice(1, -1)}
        </em>,
      );
    } else if (token.startsWith("_") && token.endsWith("_")) {
      parts.push(
        <em key={match.index} className="italic text-foreground/95">
          {token.slice(1, -1)}
        </em>,
      );
    }
    lastIdx = regex.lastIndex;
  }
  if (lastIdx < text.length) {
    parts.push(text.slice(lastIdx));
  }
  return parts.length > 0 ? parts : text;
}

function renderStoryContent(body: string) {
  const normalized = body.replace(/\r\n/g, "\n");
  const rawBlocks = normalized
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  const blocks = rawBlocks.length > 0 ? rawBlocks : [body.trim()];
  let firstParagraphRendered = false;

  return (
    <div className="space-y-6 sm:space-y-7">
      {blocks.map((block, idx) => {
        // Blockquote
        if (block.startsWith(">")) {
          const quoteLines = block
            .split("\n")
            .map((line) => line.replace(/^>\s?/, ""))
            .join("\n");
          return (
            <blockquote
              key={idx}
              className="border-l-2 border-primary pl-6 sm:pl-8 my-8 sm:my-10 italic font-display text-xl sm:text-2xl text-foreground/85 leading-relaxed whitespace-pre-line"
            >
              {renderInline(quoteLines)}
            </blockquote>
          );
        }

        // Heading 3
        if (block.startsWith("### ")) {
          return (
            <h3
              key={idx}
              className="font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground pt-4 pb-1"
            >
              {renderInline(block.slice(4))}
            </h3>
          );
        }

        // Heading 2
        if (block.startsWith("## ")) {
          return (
            <h2
              key={idx}
              className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground pt-6 pb-2"
            >
              {renderInline(block.slice(3))}
            </h2>
          );
        }

        // Heading 1
        if (block.startsWith("# ")) {
          return (
            <h2
              key={idx}
              className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground pt-6 pb-2"
            >
              {renderInline(block.slice(2))}
            </h2>
          );
        }

        // Unordered List
        if (block.split("\n").every((line) => line.startsWith("- ") || line.startsWith("* "))) {
          const items = block.split("\n").map((line) => line.replace(/^[-*]\s+/, ""));
          return (
            <ul
              key={idx}
              className="list-disc list-inside space-y-2.5 my-4 pl-2 font-reading text-lg sm:text-xl leading-[1.85] text-foreground/90"
            >
              {items.map((item, itemIdx) => (
                <li key={itemIdx}>{renderInline(item)}</li>
              ))}
            </ul>
          );
        }

        // Regular Paragraph
        const isFirst = !firstParagraphRendered;
        firstParagraphRendered = true;

        if (isFirst) {
          return (
            <p
              key={idx}
              className="font-reading text-lg sm:text-xl leading-[1.85] text-foreground/90 whitespace-pre-line first-letter:float-left first-letter:text-5xl first-letter:font-display first-letter:mr-3 first-letter:text-primary first-letter:leading-none first-letter:pt-1 selection:bg-primary/20"
            >
              {renderInline(block)}
            </p>
          );
        }

        return (
          <p
            key={idx}
            className="font-reading text-lg sm:text-xl leading-[1.85] text-foreground/90 whitespace-pre-line selection:bg-primary/20"
          >
            {renderInline(block)}
          </p>
        );
      })}
    </div>
  );
}

function PostDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user, profile, liked, toggleLike } = useInkline();
  const { t } = useSettings();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [bookmarked, setBookmarked] = useState<boolean>(false);

  const load = useCallback(async () => {
    try {
      const [postResult, commentsResult] = await Promise.all([
        supabase.from("posts").select(POST_SELECT).eq("id", id).maybeSingle(),
        supabase
          .from("comments")
          .select(
            "id, body, content, created_at, author:profiles!comments_author_id_fkey(id, handle, display_name, bio, location, avatar_url)",
          )
          .eq("post_id", id)
          .order("created_at", { ascending: true }),
      ]);

      const loadedPost = postResult?.data ? toPost(postResult.data as never) : null;
      setPost(loadedPost);
      if (loadedPost) {
        setDraft(loadedPost.body);
        setBookmarked(isBookmarked(loadedPost.id));
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

  useEffect(() => {
    if (!post) return;
    const onToggle = (e: Event) => {
      const detail = (e as CustomEvent<{ id: string; bookmarked: boolean }>).detail;
      if (detail && detail.id === post.id) {
        setBookmarked(detail.bookmarked);
      }
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === "wryto-bookmarks") {
        setBookmarked(isBookmarked(post.id));
      }
    };
    window.addEventListener("wryto-bookmark-toggle", onToggle);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("wryto-bookmark-toggle", onToggle);
      window.removeEventListener("storage", onStorage);
    };
  }, [post]);

  const isLiked = post ? liked.has(post.id) : false;
  const isMine = !!profile && !!post && profile.handle === post.author.handle;

  const handleClap = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!post) return;
    if (!user) {
      void navigate({ to: "/auth" });
      return;
    }
    // Optimistic like toggle
    const currentlyLiked = liked.has(post.id);
    setPost((prev) =>
      prev
        ? {
            ...prev,
            likes: currentlyLiked ? Math.max(0, prev.likes - 1) : prev.likes + 1,
          }
        : null,
    );
    await toggleLike(post.id);
  };

  const handleBookmark = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!post) return;
    const nextState = toggleBookmark(post.id);
    setBookmarked(nextState);
    if (nextState) {
      toast.success("Saved to your reading list");
    } else {
      toast.success("Removed from your reading list");
    }
  };

  const handleShare = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!post) return;
    const url = `${window.location.origin}/post/${post.id}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const input = document.createElement("input");
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
      }
      toast.success("Story link copied to clipboard");
    } catch {
      toast.error("Couldn't copy link to clipboard");
    }
  };

  const scrollToResponses = () => {
    const el = document.getElementById("responses");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
      const textarea = document.getElementById("response-input");
      if (textarea) {
        setTimeout(() => textarea.focus(), 300);
      }
    }
  };

  async function saveEdit() {
    if (!draft.trim() || !post) return;
    setBusy(true);
    const { error } = await supabase
      .from("posts")
      .update({ body: draft.trim(), updated_at: new Date().toISOString() })
      .eq("id", post.id);
    setBusy(false);
    if (error) {
      toast.error("Couldn't save changes. Please try again.");
      return;
    }
    toast.success("Story updated");
    setEditing(false);
    await load();
  }

  async function removePost() {
    if (!post || !window.confirm("Delete this story? This cannot be undone.")) return;
    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    if (error) {
      toast.error("Couldn't delete story.");
      return;
    }
    toast.success("Story deleted");
    void navigate({ to: "/feed" });
  }

  async function addComment() {
    if (!text.trim() || !user || submittingComment) return;
    const body = text.trim();
    if (body.length > 2000) {
      toast.error("Response must be 2,000 characters or less.");
      return;
    }
    setSubmittingComment(true);
    setText("");
    const { error } = await supabase.from("comments").insert({
      post_id: id,
      author_id: user.id,
      body,
      content: body,
    });
    setSubmittingComment(false);
    if (error) {
      toast.error("Couldn't add response. Please try again.");
    } else {
      toast.success("Response published");
    }
    await load();
  }

  async function removeComment(commentId: string) {
    if (!commentId || !window.confirm("Delete this response?")) return;
    const { error } = await supabase.from("comments").delete().eq("id", commentId);
    if (error) {
      toast.error("Couldn't delete response.");
    } else {
      toast.success("Response deleted");
    }
    await load();
  }

  if (loading) {
    return (
      <AppShell title="Reading">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-20 text-center">
          <div className="inline-block size-6 animate-spin rounded-full border-2 border-primary border-t-transparent mb-3" />
          <p className="font-reading text-muted-foreground text-sm">Gathering words…</p>
        </div>
      </AppShell>
    );
  }

  if (!post) {
    return (
      <AppShell title="Reading">
        <div className="mx-auto max-w-lg px-6 py-20 text-center">
          <h2 className="font-display text-2xl font-semibold">Piece not found</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This story is no longer available or may have been deleted.
          </p>
          <div className="mt-6">
            <Link
              to="/feed"
              className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Back to Stories
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  // Category kicker tag (first tag capitalized, fallback to STORY)
  const kicker =
    post.tags && post.tags.length > 0
      ? post.tags[0].replace(/^#/, "").toUpperCase()
      : "STORY";

  return (
    <AppShell title={post.title || `A piece by ${post.author.name}`}>
      {/* Centered distraction-free editorial layout */}
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12">
        {/* Back Link to Feed */}
        <div className="mb-6 sm:mb-8">
          <Link
            to="/feed"
            className="inline-flex items-center gap-2 text-xs font-sans font-medium text-muted-foreground hover:text-foreground transition-colors group cursor-pointer"
          >
            <ArrowLeft className="size-3.5 transition-transform duration-150 group-hover:-translate-x-1" />
            <span>Back to Stories</span>
          </Link>
        </div>

        {/* Article Container */}
        <article className="relative">
          {/* Header Metadata */}
          <header className="mb-8 sm:mb-10">
            {/* Category Kicker */}
            <div className="mb-3">
              <Link
                to="/discover"
                search={{ q: kicker.toLowerCase() }}
                className="text-xs font-sans tracking-widest text-primary uppercase font-semibold hover:opacity-80 transition-opacity inline-block"
              >
                {kicker}
              </Link>
            </div>

            {/* Story Headline */}
            {post.title ? (
              <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-foreground leading-[1.18] mb-6 sm:mb-8">
                {post.title}
              </h1>
            ) : null}

            {/* Byline Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 border-y border-border/60">
              <div className="flex items-center gap-3.5 min-w-0">
                <ProfilePreview handle={post.author.handle}>
                  <Link
                    to="/profile/$handle"
                    params={{ handle: post.author.handle }}
                    className="shrink-0 block"
                  >
                    <Avatar className="size-11 sm:size-12 rounded-full border border-border/80 shadow-xs">
                      {getAvatarUrl(post.author.avatarUrl) && (
                        <AvatarImage
                          src={getAvatarUrl(post.author.avatarUrl)!}
                          alt={post.author.name}
                          className="object-cover"
                        />
                      )}
                      <AvatarFallback className="bg-accent text-sm font-semibold text-accent-foreground font-sans">
                        {post.author.initials}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                </ProfilePreview>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <ProfilePreview handle={post.author.handle}>
                      <Link
                        to="/profile/$handle"
                        params={{ handle: post.author.handle }}
                        className="font-medium text-foreground hover:text-primary transition-colors text-sm sm:text-base font-sans"
                      >
                        {post.author.name}
                      </Link>
                    </ProfilePreview>
                    <span className="text-xs font-sans text-muted-foreground">
                      @{post.author.handle}
                    </span>
                  </div>
                  {post.author.bio && (
                    <p className="text-xs font-sans text-muted-foreground line-clamp-1 mt-0.5 max-w-md">
                      {post.author.bio}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-xs font-sans text-muted-foreground mt-1">
                    <span>{formatStoryDate(post.createdAt) || post.time}</span>
                    <span className="text-muted-foreground/60 select-none">·</span>
                    <span>{post.readTime}</span>
                  </div>
                </div>
              </div>

              {/* Byline Actions */}
              <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                <FollowButton handle={post.author.handle} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
                      aria-label="Story options"
                    >
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-48 rounded-xl border border-border/70 bg-popover/95 backdrop-blur-md p-1 shadow-lg"
                  >
                    {isMine && !editing && (
                      <>
                        <DropdownMenuItem
                          onClick={() => setEditing(true)}
                          className="cursor-pointer gap-2 text-xs font-sans"
                        >
                          <Pencil className="size-3.5" />
                          <span>{t("editPost")}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => void removePost()}
                          className="cursor-pointer gap-2 text-xs font-sans text-destructive focus:text-destructive focus:bg-destructive/10"
                        >
                          <Trash2 className="size-3.5" />
                          <span>{t("deletePost")}</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="my-1 bg-border/60" />
                      </>
                    )}
                    <DropdownMenuItem
                      onClick={() => {
                        if (!user) {
                          void navigate({ to: "/auth" });
                          return;
                        }
                        setReportOpen(true);
                      }}
                      className="cursor-pointer gap-2 text-xs font-sans text-muted-foreground hover:text-foreground"
                    >
                      <Flag className="size-3.5 text-amber-500" />
                      <span>{t("report")}</span>
                    </DropdownMenuItem>
                    {!isMine && (
                      <DropdownMenuItem
                        onClick={() => {
                          if (!user) {
                            void navigate({ to: "/auth" });
                            return;
                          }
                          setBlockOpen(true);
                        }}
                        className="cursor-pointer gap-2 text-xs font-sans text-destructive focus:text-destructive focus:bg-destructive/10"
                      >
                        <UserX className="size-3.5" />
                        <span>
                          {t("block")} @{post.author.handle}
                        </span>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          {/* Story Body or Inline Editor */}
          {editing ? (
            <div className="space-y-4 my-6">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, 5000))}
                className="min-h-60 font-reading text-lg leading-relaxed border-border/70 focus:border-primary p-4 rounded-xl"
                aria-label="Edit story"
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground font-sans">
                <span>{draft.length} / 5,000 characters</span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditing(false);
                      setDraft(post.body);
                    }}
                  >
                    {t("cancel")}
                  </Button>
                  <Button
                    size="sm"
                    disabled={busy || !draft.trim()}
                    onClick={() => void saveEdit()}
                  >
                    {busy ? "Saving…" : t("save")}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="my-8">
              {renderStoryContent(post.body)}

              {/* Story Tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="mt-10 pt-6 flex flex-wrap gap-2 border-t border-border/40">
                  {post.tags.map((tag) => {
                    const cleanTag = tag.replace(/^#/, "");
                    return (
                      <Link
                        key={tag}
                        to="/discover"
                        search={{ q: cleanTag }}
                        className="rounded-full border border-border/70 bg-muted/30 hover:bg-muted/70 px-3.5 py-1 text-xs font-sans text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      >
                        #{cleanTag}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Sticky / Floating Reader Bar Dock */}
          <aside
            aria-label="Story reader controls"
            className="sticky bottom-20 sm:bottom-8 z-30 mx-auto my-8 flex w-fit items-center gap-1 sm:gap-2 rounded-full border border-border/80 bg-background/90 px-3.5 sm:px-4 py-1.5 shadow-lg backdrop-blur-md transition-all duration-200"
          >
            {/* Clap Button */}
            <button
              type="button"
              onClick={handleClap}
              className={cn(
                "flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded-full text-xs font-sans transition-all active:scale-95 cursor-pointer",
                isLiked
                  ? "text-primary font-semibold bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
              )}
              aria-label={isLiked ? "Unlike story" : "Applaud story"}
              title={isLiked ? "Applauded" : "Applaud story"}
            >
              <ClapIcon className="size-4.5" filled={isLiked} />
              <span className="font-sans font-medium">{post.likes}</span>
            </button>

            <span className="h-4 w-px bg-border/60" aria-hidden="true" />

            {/* Comments Counter Button */}
            <button
              type="button"
              onClick={scrollToResponses}
              className="flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded-full text-xs font-sans text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
              aria-label="Jump to responses"
              title="View responses"
            >
              <MessageCircle className="size-4.5" />
              <span className="font-sans font-medium">{comments.length}</span>
            </button>

            <span className="h-4 w-px bg-border/60" aria-hidden="true" />

            {/* Bookmark Toggle Button */}
            <button
              type="button"
              onClick={handleBookmark}
              className={cn(
                "flex items-center justify-center size-9 min-h-[38px] min-w-[38px] rounded-full transition-colors cursor-pointer",
                bookmarked
                  ? "text-primary hover:bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
              )}
              aria-label={bookmarked ? "Remove from reading list" : "Save to reading list"}
              title={bookmarked ? "Saved in reading list" : "Save to reading list"}
            >
              <Bookmark className={cn("size-4.5", bookmarked && "fill-current text-primary")} />
            </button>

            <span className="h-4 w-px bg-border/60" aria-hidden="true" />

            {/* Share Button */}
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center justify-center size-9 min-h-[38px] min-w-[38px] rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
              aria-label="Share story"
              title="Copy story link"
            >
              <Share2 className="size-4.5" />
            </button>
          </aside>

          {/* Responses / Discussion Section */}
          <section id="responses" className="mt-14 sm:mt-18 pt-10 border-t border-border/70 scroll-mt-24">
            <div className="flex items-baseline justify-between mb-8">
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Responses{" "}
                <span className="font-sans text-base font-normal text-muted-foreground">
                  ({comments.length})
                </span>
              </h2>
            </div>

            {/* Response Composition Form */}
            {user ? (
              <div className="rounded-2xl border border-border/70 bg-card/60 p-4 sm:p-5 shadow-xs mb-10">
                <div className="flex items-start gap-3">
                  <Avatar className="size-9 sm:size-10 rounded-full border border-border/80 shrink-0">
                    {getAvatarUrl(profile?.avatarUrl) && (
                      <AvatarImage
                        src={getAvatarUrl(profile?.avatarUrl)!}
                        alt={profile?.name ?? "User"}
                        className="object-cover"
                      />
                    )}
                    <AvatarFallback className="bg-accent text-xs font-medium text-accent-foreground font-sans">
                      {profile ? profile.initials : "ME"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-sans font-medium text-foreground mb-1.5">
                      {profile?.name ?? "You"}
                    </p>
                    <Textarea
                      id="response-input"
                      value={text}
                      maxLength={2000}
                      onChange={(e) => setText(e.target.value.slice(0, 2000))}
                      placeholder="What are your thoughts on this piece?"
                      className="min-h-24 resize-none border-border/60 bg-background/50 font-reading text-base leading-relaxed placeholder:text-muted-foreground/70 focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:border-primary/50"
                      aria-label="Write a response"
                    />
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-[11px] font-sans text-muted-foreground">
                        {text.length > 1500 ? `${text.length}/2000` : ""}
                      </span>
                      <div className="flex items-center gap-2">
                        {text.trim() && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setText("")}
                            className="h-8 text-xs font-sans text-muted-foreground cursor-pointer"
                          >
                            Cancel
                          </Button>
                        )}
                        <Button
                          size="sm"
                          disabled={!text.trim() || submittingComment}
                          onClick={() => void addComment()}
                          className="h-8 rounded-full bg-primary px-4 text-xs font-sans font-semibold text-primary-foreground hover:bg-primary/95 shadow-xs cursor-pointer gap-1.5"
                        >
                          {submittingComment ? (
                            <>
                              <Loader2 className="size-3.5 animate-spin" />
                              <span>Publishing…</span>
                            </>
                          ) : (
                            <>
                              <Send className="size-3.5" />
                              <span>Respond</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-6 text-center mb-10">
                <h3 className="font-display text-lg font-semibold text-foreground">
                  Join the conversation
                </h3>
                <p className="mt-1 text-xs font-sans text-muted-foreground max-w-sm mx-auto">
                  Sign in to share your thoughts, exchange reflections, and engage with the author.
                </p>
                <div className="mt-4">
                  <Button
                    asChild
                    size="sm"
                    className="rounded-full bg-primary px-5 text-xs font-sans font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    <Link to="/auth">Sign In to Respond</Link>
                  </Button>
                </div>
              </div>
            )}

            {/* Responses List */}
            <div className="space-y-6 sm:space-y-8">
              {comments.map((comment) => {
                const isCommentAuthor = post.author.handle === comment.author.handle;
                const canDelete =
                  user && (user.id === comment.author.id || user.id === post.author.id);

                return (
                  <article
                    key={comment.id}
                    className="group rounded-xl border border-border/50 bg-card/40 p-4 sm:p-5 transition-colors hover:border-border/80"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <ProfilePreview handle={comment.author.handle}>
                          <Link
                            to="/profile/$handle"
                            params={{ handle: comment.author.handle }}
                            className="shrink-0"
                          >
                            <Avatar className="size-8 sm:size-9 rounded-full border border-border/80 shadow-xs">
                              {getAvatarUrl(comment.author.avatarUrl) && (
                                <AvatarImage
                                  src={getAvatarUrl(comment.author.avatarUrl)!}
                                  alt={comment.author.name}
                                  className="object-cover"
                                />
                              )}
                              <AvatarFallback className="bg-muted text-xs font-sans">
                                {comment.author.initials}
                              </AvatarFallback>
                            </Avatar>
                          </Link>
                        </ProfilePreview>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <ProfilePreview handle={comment.author.handle}>
                              <Link
                                to="/profile/$handle"
                                params={{ handle: comment.author.handle }}
                                className="text-xs sm:text-sm font-sans font-semibold text-foreground hover:text-primary transition-colors truncate"
                              >
                                {comment.author.name}
                              </Link>
                            </ProfilePreview>
                            {isCommentAuthor && (
                              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-sans font-medium text-primary">
                                Author
                              </span>
                            )}
                            <span className="text-[11px] font-sans text-muted-foreground/60 select-none">
                              ·
                            </span>
                            <span className="text-[11px] font-sans text-muted-foreground">
                              {comment.time}
                            </span>
                          </div>
                          <p className="text-[11px] font-sans text-muted-foreground/75 truncate">
                            @{comment.author.handle}
                          </p>
                        </div>
                      </div>

                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => void removeComment(comment.id)}
                          className="size-7 rounded-md text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors opacity-70 group-hover:opacity-100 cursor-pointer"
                          aria-label="Delete response"
                          title="Delete response"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>

                    <div className="mt-3.5 font-reading text-base leading-relaxed text-foreground/90 whitespace-pre-line pl-0.5">
                      {comment.body}
                    </div>
                  </article>
                );
              })}

              {/* Literary Empty State */}
              {!comments.length && (
                <div className="py-12 text-center rounded-2xl border border-dashed border-border/70 bg-card/20 px-4">
                  <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-muted/60 text-muted-foreground mb-3">
                    <Feather className="size-5 text-muted-foreground" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-foreground">
                    No responses yet
                  </h3>
                  <p className="mt-1 font-reading text-sm text-muted-foreground max-w-sm mx-auto">
                    Be the first to share your thoughts, impressions, or reflections on this story.
                  </p>
                </div>
              )}
            </div>
          </section>
        </article>
      </div>

      {/* Report Modal */}
      <ReportModal
        postId={post.id}
        postTitle={post.title}
        authorHandle={post.author.handle}
        open={reportOpen}
        onOpenChange={setReportOpen}
      />

      {/* Block Modal */}
      <BlockModal
        targetId={post.author.id}
        targetHandle={post.author.handle}
        targetName={post.author.name}
        open={blockOpen}
        onOpenChange={setBlockOpen}
      />
    </AppShell>
  );
}
