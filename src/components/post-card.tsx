import { Link, useNavigate } from "@tanstack/react-router";
import { ProfilePreview } from "@/components/profile-preview";
import {
  Bookmark,
  Flag,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Pencil,
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

export function ClapIcon({
  className = "size-4",
  filled = false,
}: {
  className?: string;
  filled?: boolean;
}) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      {/* Applause rays */}
      <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none">
        <path d="M5.5 4.5l1.5 1.5" />
        <path d="M3 8h2" />
        <path d="M8 2.5v2" />
      </g>
      {/* Clapping hands outline/fill */}
      <path
        d="M14.5 4.5a2 2 0 0 0-2.8 0L9.8 6.4a2 2 0 0 0-.6 1.4v4.7l-2.1-2.1a2 2 0 0 0-2.8 2.8l5.2 5.2a6 6 0 0 0 8.5 0l2.5-2.5a2 2 0 0 0 0-2.8l-1.5-1.5a2 2 0 0 0-2.8 0l-.7.7V6.5a2 2 0 0 0-2-2z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={filled ? "1.5" : "1.8"}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
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
        "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-sans font-medium transition-all min-h-[36px] sm:min-h-0 flex items-center justify-center cursor-pointer",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-xs font-semibold"
          : "border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted/80 hover:text-foreground hover:border-border",
      )}
    >
      {children}
    </button>
  );
}

export function FollowButton({ handle }: { handle: string }) {
  const { followed, toggleFollow, user, profile } = useInkline();
  const { t } = useSettings();
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
        "h-8 min-h-[36px] sm:min-h-0 min-w-[84px] rounded-full px-3 text-xs font-sans font-medium gap-1.5 transition-all duration-200 active:scale-95 cursor-pointer",
        busy && "opacity-80",
        active && "hover:border-destructive hover:text-destructive",
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
      {busy && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
      <span className={cn("transition-opacity duration-150", busy && "opacity-80")}>
        {active ? t("unfollow") : t("follow")}
      </span>
    </Button>
  );
}

export function PostCard({ post, full = false }: { post: Post; full?: boolean }) {
  const { liked, toggleLike, user, profile, refresh } = useInkline();
  const { t } = useSettings();
  const navigate = useNavigate();
  const isLiked = liked.has(post.id);
  const isMine = !!profile && profile.handle === post.author.handle;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(post.body);
  const [busy, setBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [bookmarked, setBookmarked] = useState<boolean>(() => isBookmarked(post.id));

  useEffect(() => {
    const onToggle = (e: Event) => {
      const detail = (e as CustomEvent<{ id: string; bookmarked: boolean }>).detail;
      if (detail && detail.id === post.id) {
        setBookmarked(detail.bookmarked);
      }
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === BOOKMARKS_KEY) {
        setBookmarked(isBookmarked(post.id));
      }
    };
    window.addEventListener("wryto-bookmark-toggle", onToggle);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("wryto-bookmark-toggle", onToggle);
      window.removeEventListener("storage", onStorage);
    };
  }, [post.id]);

  async function saveEdit() {
    if (!draft.trim()) return;
    setBusy(true);
    await supabase.from("posts").update({ body: draft.trim() }).eq("id", post.id);
    setBusy(false);
    setEditing(false);
    await refresh();
  }

  async function remove() {
    if (!window.confirm("Delete this story? This can't be undone.")) return;
    await supabase.from("posts").delete().eq("id", post.id);
    await refresh();
    if (full) void navigate({ to: "/feed" });
  }

  const handleClap = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      void navigate({ to: "/auth" });
      return;
    }
    await toggleLike(post.id);
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nextState = toggleBookmark(post.id);
    setBookmarked(nextState);
    if (nextState) {
      toast.success("Saved to your reading list");
    } else {
      toast.success("Removed from your reading list");
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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

  // Category kicker tag (first tag or fallback to STORY)
  const kicker =
    post.tags && post.tags.length > 0
      ? post.tags[0].replace(/^#/, "").toUpperCase()
      : "STORY";

  return (
    <article
      className={cn(
        "relative transition-colors",
        full
          ? "px-5 py-6 sm:px-8 border-b border-border/50"
          : "border-b border-border/50 pb-8 mb-8 px-5 sm:px-8 last:border-b-0 last:mb-0",
      )}
    >
      {/* Byline Metadata Header */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <ProfilePreview handle={post.author.handle}>
            <Link
              to="/profile/$handle"
              params={{ handle: post.author.handle }}
              className="shrink-0 block"
            >
              <Avatar className="size-8 sm:size-9 rounded-full border border-border/80 shadow-xs">
                {getAvatarUrl(post.author.avatarUrl) && (
                  <AvatarImage
                    src={getAvatarUrl(post.author.avatarUrl)!}
                    alt={post.author.name}
                    className="object-cover"
                  />
                )}
                <AvatarFallback className="bg-accent text-xs font-medium text-accent-foreground font-sans">
                  {post.author.initials}
                </AvatarFallback>
              </Avatar>
            </Link>
          </ProfilePreview>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-sans min-w-0">
            <ProfilePreview handle={post.author.handle}>
              <Link
                to="/profile/$handle"
                params={{ handle: post.author.handle }}
                className="font-medium text-foreground hover:text-primary transition-colors truncate"
              >
                {post.author.name}
              </Link>
            </ProfilePreview>
            <span className="text-muted-foreground/60 select-none">·</span>
            <span className="text-muted-foreground">{post.time}</span>
            <span className="text-muted-foreground/60 select-none">·</span>
            <span className="text-muted-foreground">{post.readTime}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
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
                    onClick={() => void remove()}
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

      {/* Editing State */}
      {editing ? (
        <div className="mt-4 space-y-3">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, 5000))}
            className="min-h-40 font-reading text-base sm:text-[17px] leading-relaxed border-border/70 focus:border-primary"
            aria-label="Edit story"
          />
          <div className="flex justify-end gap-2">
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
      ) : (
        /* Reading Story Content */
        <div className="mt-2">
          {/* Category Kicker */}
          <div className="mb-1.5">
            <Link
              to="/discover"
              search={{ q: kicker.toLowerCase() }}
              className="text-xs font-sans tracking-widest text-primary font-medium uppercase hover:opacity-80 transition-opacity inline-block"
            >
              {kicker}
            </Link>
          </div>

          {/* Title & Excerpt */}
          {full ? (
            <div>
              {post.title && (
                <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-tight">
                  {post.title}
                </h1>
              )}
              <div className="font-reading text-lg sm:text-xl leading-relaxed sm:leading-9 text-foreground/90 mt-4 whitespace-pre-line">
                {post.body}
              </div>
            </div>
          ) : (
            <Link
              to="/post/$id"
              params={{ id: post.id }}
              className="block group"
            >
              {post.title && (
                <h2 className="font-display text-xl sm:text-2xl font-semibold text-foreground group-hover:text-primary transition-colors leading-snug tracking-tight">
                  {post.title}
                </h2>
              )}
              <p className="font-reading text-base leading-relaxed text-foreground/90 line-clamp-3 mt-2">
                {post.body}
              </p>
            </Link>
          )}

          {/* Additional Tags (if any beyond kicker) */}
          {post.tags && post.tags.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {post.tags.slice(1).map((tag) => {
                const cleanTag = tag.replace(/^#/, "");
                return (
                  <Link
                    key={tag}
                    to="/discover"
                    search={{ q: cleanTag }}
                    className="text-xs font-sans text-muted-foreground/80 hover:text-primary transition-colors"
                  >
                    #{cleanTag}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Engagement Footer */}
      <div className="mt-5 flex items-center justify-between pt-1">
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Literary Applause / Clap Button */}
          <button
            type="button"
            onClick={handleClap}
            className={cn(
              "flex items-center gap-1.5 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 text-xs font-sans transition-all duration-150 px-2.5 py-1.5 rounded-full active:scale-95 cursor-pointer",
              isLiked
                ? "text-primary font-semibold bg-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
            )}
            aria-label={isLiked ? "Unlike / Remove applause" : "Applaud this story"}
            title={isLiked ? "Applauded" : "Applaud story"}
          >
            <ClapIcon className="size-4.5" filled={isLiked} />
            <span className="font-sans font-medium">{post.likes}</span>
          </button>

          {/* Comment / Response Count Button */}
          <Link
            to="/post/$id"
            params={{ id: post.id }}
            className="flex items-center gap-1.5 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 text-xs font-sans text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors px-2.5 py-1.5 rounded-full cursor-pointer"
            aria-label={`${post.comments} responses`}
            title="View responses"
          >
            <MessageCircle className="size-4" />
            <span className="font-sans font-medium">{post.comments}</span>
          </Link>
        </div>

        <div className="flex items-center gap-1">
          {/* Bookmark Toggle */}
          <button
            type="button"
            onClick={handleBookmark}
            className={cn(
              "flex items-center justify-center size-9 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:size-8 rounded-full transition-colors cursor-pointer",
              bookmarked
                ? "text-primary hover:bg-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
            )}
            aria-label={bookmarked ? "Remove from reading list" : "Save to reading list"}
            title={bookmarked ? "Saved in reading list" : "Save to reading list"}
          >
            <Bookmark className={cn("size-4", bookmarked && "fill-current text-primary")} />
          </button>

          {/* Share Link Button */}
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center justify-center size-9 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:size-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
            aria-label="Share story"
            title="Copy story link"
          >
            <Share2 className="size-4" />
          </button>
        </div>
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
    </article>
  );
}
