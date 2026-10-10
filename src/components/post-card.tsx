import { Link, useNavigate } from "@tanstack/react-router";
import { ProfilePreview } from "@/components/profile-preview";
import {
  Heart,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Trash2,
  Flag,
  UserX,
} from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import { type Post } from "@/lib/inkline-data";
import { useInkline } from "@/lib/inkline-context";
import { useSettings } from "@/lib/user-settings";
import { cn } from "@/lib/utils";

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
        "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "glass text-muted-foreground hover:text-foreground",
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
        "min-w-[92px] gap-1.5 transition-all duration-200 active:scale-95",
        busy && "opacity-80",
        active && "hover:border-destructive hover:text-destructive",
      )}
      onClick={async (event) => {
        event.preventDefault();
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

  async function saveEdit() {
    if (!draft.trim()) return;
    setBusy(true);
    await supabase.from("posts").update({ body: draft.trim() }).eq("id", post.id);
    setBusy(false);
    setEditing(false);
    await refresh();
  }
  async function remove() {
    if (!window.confirm("Delete this post? This can't be undone.")) return;
    await supabase.from("posts").delete().eq("id", post.id);
    await refresh();
    if (full) void navigate({ to: "/feed" });
  }
  return (
    <article
      className={cn(
        "glass glass-hover animate-rise mx-4 my-4 rounded-2xl px-5 py-6 sm:mx-6 sm:px-7 sm:py-7",
        full &&
          "mx-0 my-0 rounded-none border-x-0 border-t-0 bg-transparent shadow-none hover:shadow-none sm:mx-0 sm:px-8",
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar className="size-10">
          {getAvatarUrl(post.author.avatarUrl) && (
            <AvatarImage
              src={getAvatarUrl(post.author.avatarUrl)!}
              alt={post.author.name}
              className="object-cover"
            />
          )}
          <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">
            {post.author.initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <ProfilePreview handle={post.author.handle}>
              <Link
                to="/profile/$handle"
                params={{ handle: post.author.handle }}
                className="min-w-0"
              >
                <span className="block truncate text-sm font-semibold">{post.author.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  @{post.author.handle} · {post.time}
                </span>
              </Link>
            </ProfilePreview>
            <div className="flex items-center gap-1.5 shrink-0">
              <FollowButton handle={post.author.handle} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 rounded-full text-muted-foreground hover:text-foreground"
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="glass w-44 rounded-xl">
                  {isMine && !editing && (
                    <>
                      <DropdownMenuItem
                        onClick={() => setEditing(true)}
                        className="cursor-pointer gap-2"
                      >
                        <Pencil className="size-3.5" />
                        <span>{t("editPost")}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => void remove()}
                        className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                        <span>{t("deletePost")}</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
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
                    className="cursor-pointer gap-2 text-muted-foreground hover:text-foreground"
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
                      className="cursor-pointer gap-2 text-destructive focus:text-destructive"
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
          {editing ? (
            <div className="mt-4 space-y-2">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, 5000))}
                className="min-h-40 font-reading text-[17px] leading-8"
                aria-label="Edit post"
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
                <Button size="sm" disabled={busy || !draft.trim()} onClick={() => void saveEdit()}>
                  {busy ? "Saving…" : t("save")}
                </Button>
              </div>
            </div>
          ) : (
            <Link to="/post/$id" params={{ id: post.id }} className="mt-4 block">
              {post.title && (
                <h2
                  className={cn(
                    "font-display font-semibold leading-tight",
                    full ? "text-3xl sm:text-4xl" : "text-xl sm:text-2xl",
                  )}
                >
                  {post.title}
                </h2>
              )}
              <p
                className={cn(
                  "mt-2 whitespace-pre-line font-reading leading-8 text-foreground/90",
                  full ? "text-xl leading-9" : "text-[17px]",
                )}
              >
                {post.body}
              </p>
            </Link>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <Link
                key={tag}
                to="/discover"
                search={{ q: tag }}
                className="text-xs font-medium text-primary"
              >
                #{tag}
              </Link>
            ))}
          </div>
          <div className="mt-5 flex items-center gap-1 text-muted-foreground">
            <Button
              variant="ghost"
              size="sm"
              className={cn("gap-1.5 px-2", isLiked && "text-primary")}
              onClick={() => {
                if (!user) {
                  void navigate({ to: "/auth" });
                  return;
                }
                void toggleLike(post.id);
              }}
              aria-label={isLiked ? "Unlike post" : "Like post"}
            >
              <Heart className={cn(isLiked && "fill-current")} /> {post.likes}
            </Button>
            <Button asChild variant="ghost" size="sm" className="gap-1.5 px-2">
              <Link to="/post/$id" params={{ id: post.id }}>
                <MessageCircle /> {post.comments}
              </Link>
            </Button>
            {isMine && !editing && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="px-2"
                  onClick={() => setEditing(true)}
                  aria-label="Edit post"
                >
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="px-2 hover:text-destructive"
                  onClick={() => void remove()}
                  aria-label="Delete post"
                >
                  <Trash2 />
                </Button>
              </>
            )}
            <span className="ml-auto text-xs">{post.readTime}</span>
          </div>
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
