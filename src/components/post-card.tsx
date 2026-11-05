import { Link, useNavigate } from "@tanstack/react-router";
import { ProfilePreview } from "@/components/profile-preview";
import {
  Bookmark,
  ChevronDown,
  ChevronUp,
  Flag,
  Heart,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Quote,
  Share2,
  Trash2,
  UserX,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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
import { ReportModal } from "@/components/report-modal";
import { BlockModal } from "@/components/block-modal";
import { type Post } from "@/lib/inkline-data";
import { useInkline } from "@/lib/inkline-context";
import { useSettings } from "@/lib/user-settings";
import { cn } from "@/lib/utils";

const BOOKMARKS_KEY = "wryto-bookmarks";

export function getBookmarks(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Set(parsed);
    }
  } catch {
    // ignore
  }
  return new Set();
}

export function isBookmarked(id: string): boolean {
  return getBookmarks().has(id);
}

export function toggleBookmark(id: string): boolean {
  const set = getBookmarks();
  const next = !set.has(id);
  if (next) {
    set.add(id);
  } else {
    set.delete(id);
  }
  try {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(Array.from(set)));
    window.dispatchEvent(
      new CustomEvent("wryto-bookmark-toggle", { detail: { id, bookmarked: next } }),
    );
  } catch {
    // ignore
  }
  return next;
}

export function TopicChip({
  children,
  active = false,
  onClick,
}: {
  children: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-xl border px-3 py-1 text-xs font-medium transition-all min-h-[36px] sm:min-h-0 flex items-center justify-center spring-press cursor-pointer",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-2xs font-semibold"
          : "border-border/60 bg-muted/50 text-muted-foreground hover:bg-muted/80 hover:text-foreground hover:border-border",
      )}
    >
      {children}
    </button>
  );
}

export function FollowButton({ handle }: { handle: string }) {
  const { followed, toggleFollow, user, profile } = useInkline();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const active = followed.has(handle);
  if (profile?.handle === handle) return null;

  return (
    <Button
      variant={active ? "outline" : "default"}
      size="sm"
      disabled={busy}
      className={cn(
        "h-7 min-h-[36px] sm:min-h-0 min-w-[76px] rounded-xl px-3 text-xs font-semibold gap-1 transition-all spring-press cursor-pointer",
        busy && "opacity-80",
        active
          ? "border-border hover:border-destructive hover:text-destructive hover:bg-destructive/10"
          : "bg-foreground text-background hover:bg-foreground/90 shadow-2xs",
      )}
      onClick={async (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!user) {
          void navigate({ to: "/auth" });
          return;
        }
        setBusy(true);
        try {
          await toggleFollow(handle);
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy && <Loader2 className="size-3 animate-spin" aria-hidden />}
      <span>{active ? "Following" : "Follow"}</span>
    </Button>
  );
}

export function PostCard({ post, full = false }: { post: Post; full?: boolean }) {
  const { liked, toggleLike, user, profile, refresh } = useInkline();
  const navigate = useNavigate();
  const isLiked = liked.has(post.id);
  const isMine = !!profile && profile.handle === post.author.handle;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(post.body);
  const [busy, setBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [bookmarked, setBookmarked] = useState<boolean>(() => isBookmarked(post.id));
  const [expanded, setExpanded] = useState(full);

  const isLong = post.body.length > 380;
  const isPoetry =
    Array.isArray(post.tags) && post.tags.some((t) => t.toLowerCase().includes("poet"));

  useEffect(() => {
    const handleBookmarkEvent = (e: Event) => {
      const detail = (e as CustomEvent<{ id: string; bookmarked: boolean }>).detail;
      if (detail && detail.id === post.id) {
        setBookmarked(detail.bookmarked);
      }
    };
    window.addEventListener("wryto-bookmark-toggle", handleBookmarkEvent);
    return () => window.removeEventListener("wryto-bookmark-toggle", handleBookmarkEvent);
  }, [post.id]);

  async function handleToggleLike(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      void navigate({ to: "/auth" });
      return;
    }
    await toggleLike(post.id);
  }

  function handleToggleBookmark(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const next = toggleBookmark(post.id);
    setBookmarked(next);
    toast.success(next ? "Post saved to your bookmarks" : "Removed from bookmarks");
  }

  async function handleShare(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/post/${post.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title || `Post by ${post.author.name} on Wryto`,
          text: post.body.slice(0, 100),
          url,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Post link copied to clipboard!");
    } catch {
      toast.error("Could not copy link");
    }
  }

  async function saveEdit() {
    if (!draft.trim() || busy) return;
    setBusy(true);
    const { error } = await supabase
      .from("posts")
      .update({ body: draft.trim(), content: draft.trim() })
      .eq("id", post.id);
    setBusy(false);
    if (error) {
      toast.error("Couldn't save changes. Please try again.");
      return;
    }
    toast.success("Post updated");
    setEditing(false);
    await refresh();
  }

  async function remove() {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    setBusy(true);
    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    setBusy(false);
    if (error) {
      toast.error("Couldn't delete post. Please try again.");
      return;
    }
    toast.success("Post deleted");
    await refresh();
  }

  return (
    <article
      className={cn(
        "border-b border-border/60 p-4 sm:p-5 hover:bg-muted/30 transition-all duration-150 relative group",
        full && "border-b-0 hover:bg-transparent",
      )}
    >
      <div className="flex gap-3.5">
        {/* Author Avatar Column */}
        <div className="shrink-0 mt-0.5">
          <ProfilePreview handle={post.author.handle}>
            <Link
              to="/profile/$handle"
              params={{ handle: post.author.handle }}
              className="block cursor-pointer spring-press"
            >
              <Avatar className="size-10 ring-1 ring-border shadow-2xs transition-transform group-hover:scale-102">
                {getAvatarUrl(post.author.avatarUrl) && (
                  <AvatarImage
                    src={getAvatarUrl(post.author.avatarUrl)!}
                    alt={post.author.name}
                    className="object-cover"
                  />
                )}
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                  {post.author.initials}
                </AvatarFallback>
              </Avatar>
            </Link>
          </ProfilePreview>
        </div>

        {/* Content Column */}
        <div className="flex-1 min-w-0">
          {/* Header Row: Author details, timestamp, menu */}
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
              <ProfilePreview handle={post.author.handle}>
                <Link
                  to="/profile/$handle"
                  params={{ handle: post.author.handle }}
                  className="font-bold text-sm text-foreground hover:underline truncate cursor-pointer"
                >
                  {post.author.name}
                </Link>
              </ProfilePreview>
              <span className="text-xs text-muted-foreground truncate font-mono">
                @{post.author.handle}
              </span>
              <span className="text-muted-foreground/60 text-xs">·</span>
              <Link
                to="/post/$id"
                params={{ id: post.id }}
                className="text-xs text-muted-foreground hover:underline shrink-0"
              >
                {post.time}
              </Link>
              {post.readTime && (
                <>
                  <span className="text-muted-foreground/60 text-xs">·</span>
                  <span className="text-[11px] font-sans text-muted-foreground/80 shrink-0">
                    {post.readTime}
                  </span>
                </>
              )}
            </div>

            {/* Top Right Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <FollowButton handle={post.author.handle} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 rounded-full text-muted-foreground hover:text-foreground spring-press cursor-pointer"
                    aria-label="Post options"
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-48 rounded-2xl border border-border/80 liquid-glass p-1.5 shadow-lg"
                >
                  {isMine && !editing && (
                    <>
                      <DropdownMenuItem
                        onClick={() => setEditing(true)}
                        className="cursor-pointer gap-2 text-xs rounded-xl px-2.5 py-2"
                      >
                        <Pencil className="size-3.5" />
                        <span>Edit Post</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => void remove()}
                        className="cursor-pointer gap-2 text-xs rounded-xl px-2.5 py-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                      >
                        <Trash2 className="size-3.5" />
                        <span>Delete Post</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="my-1 bg-border/50" />
                    </>
                  )}
                  <DropdownMenuItem
                    onClick={handleShare}
                    className="cursor-pointer gap-2 text-xs rounded-xl px-2.5 py-2"
                  >
                    <Share2 className="size-3.5 text-primary" />
                    <span>Copy Link</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const quoteText = `"${post.body.slice(0, 240)}" — ${post.author.name} (@${post.author.handle}) on Wryto`;
                      try {
                        await navigator.clipboard.writeText(quoteText);
                        toast.success("Quote copied to clipboard!");
                      } catch {
                        toast.error("Could not copy quote");
                      }
                    }}
                    className="cursor-pointer gap-2 text-xs rounded-xl px-2.5 py-2"
                  >
                    <Quote className="size-3.5 text-primary" />
                    <span>Copy Quote</span>
                  </DropdownMenuItem>
                  {!isMine && (
                    <>
                      <DropdownMenuItem
                        onClick={() => {
                          if (!user) {
                            void navigate({ to: "/auth" });
                            return;
                          }
                          setReportOpen(true);
                        }}
                        className="cursor-pointer gap-2 text-xs rounded-xl px-2.5 py-2 text-muted-foreground hover:text-foreground"
                      >
                        <Flag className="size-3.5 text-amber-500" />
                        <span>Report Post</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          if (!user) {
                            void navigate({ to: "/auth" });
                            return;
                          }
                          setBlockOpen(true);
                        }}
                        className="cursor-pointer gap-2 text-xs rounded-xl px-2.5 py-2 text-destructive focus:text-destructive focus:bg-destructive/10"
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

          {/* Post Title (If present) */}
          {post.title && (
            <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight mb-1.5 leading-snug">
              <Link to="/post/$id" params={{ id: post.id }} className="hover:text-primary transition-colors">
                {post.title}
              </Link>
            </h2>
          )}

          {/* Post Body */}
          {editing ? (
            <div className="space-y-3 my-2">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="w-full min-h-[120px] rounded-2xl text-sm p-3.5"
              />
              <div className="flex gap-2 justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditing(false)}
                  disabled={busy}
                  className="rounded-xl h-8 text-xs spring-press"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => void saveEdit()}
                  disabled={busy || !draft.trim()}
                  className="rounded-xl h-8 text-xs spring-press"
                >
                  {busy ? "Saving…" : "Save Changes"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="my-1.5">
              <p
                className={cn(
                  "text-sm sm:text-base leading-relaxed text-foreground whitespace-pre-line break-words",
                  isPoetry && "font-serif italic leading-loose text-foreground/95",
                  !expanded && isLong && "line-clamp-4",
                )}
              >
                {post.body}
              </p>
              {!full && isLong && (
                <button
                  type="button"
                  onClick={() => setExpanded(!expanded)}
                  className="mt-1 text-xs font-semibold text-primary hover:underline inline-flex items-center gap-0.5 cursor-pointer spring-press"
                >
                  {expanded ? (
                    <>
                      Show less <ChevronUp className="size-3" />
                    </>
                  ) : (
                    <>
                      Show more <ChevronDown className="size-3" />
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Topic Tags */}
          {Array.isArray(post.tags) && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5 mb-1">
              {post.tags.map((tag) => (
                <Link
                  key={tag}
                  to="/discover"
                  search={{ q: tag }}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}

          {/* Social Engagement Actions Bar */}
          <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-border/40 text-muted-foreground max-w-md">
            {/* Comment Action */}
            <Link
              to="/post/$id"
              params={{ id: post.id }}
              className="flex items-center gap-1.5 text-xs font-medium hover:text-primary transition-colors cursor-pointer group/action p-1 -m-1 spring-press"
              aria-label="View comments"
            >
              <div className="size-8 rounded-full flex items-center justify-center group-hover/action:bg-primary/10 transition-colors">
                <MessageCircle className="size-4.5" />
              </div>
              <span className="tabular-numbers">{post.comments}</span>
            </Link>

            {/* Like Heart Action */}
            <button
              type="button"
              onClick={handleToggleLike}
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer group/action p-1 -m-1 spring-press",
                isLiked ? "text-rose-600 font-semibold" : "hover:text-rose-600",
              )}
              aria-label={isLiked ? "Unlike post" : "Like post"}
            >
              <div className="size-8 rounded-full flex items-center justify-center group-hover/action:bg-rose-500/10 transition-colors">
                <Heart
                  className={cn(
                    "size-4.5 transition-transform",
                    isLiked && "fill-rose-600 text-rose-600 scale-110",
                  )}
                />
              </div>
              <span className="tabular-numbers">{post.likes}</span>
            </button>

            {/* Bookmark Action */}
            <button
              type="button"
              onClick={handleToggleBookmark}
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer group/action p-1 -m-1 spring-press",
                bookmarked ? "text-primary font-semibold" : "hover:text-primary",
              )}
              aria-label={bookmarked ? "Remove bookmark" : "Bookmark post"}
            >
              <div className="size-8 rounded-full flex items-center justify-center group-hover/action:bg-primary/10 transition-colors">
                <Bookmark className={cn("size-4.5", bookmarked && "fill-primary text-primary")} />
              </div>
            </button>

            {/* Share Action */}
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-1.5 text-xs font-medium hover:text-primary transition-colors cursor-pointer group/action p-1 -m-1 spring-press"
              aria-label="Share post"
            >
              <div className="size-8 rounded-full flex items-center justify-center group-hover/action:bg-primary/10 transition-colors">
                <Share2 className="size-4.5" />
              </div>
            </button>
          </div>
        </div>
      </div>

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
    </article>
  );
}
