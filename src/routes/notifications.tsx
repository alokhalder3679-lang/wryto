import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCheck, Heart, MessageCircle, UserPlus, Bell } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { FollowButton } from "@/components/post-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl } from "@/lib/avatar";
import { initialsOf } from "@/lib/inkline-data";
import { supabase } from "@/integrations/supabase/client";
import { relativeTime } from "@/lib/inkline-data";
import { useInkline } from "@/lib/inkline-context";
import { useSettings } from "@/lib/user-settings";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/notifications")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Notifications — Wryto" },
      { name: "description", content: "See new likes, responses, and followers on Wryto." },
      { property: "og:title", content: "Notifications — Wryto" },
      { property: "og:description", content: "See new likes, responses, and followers on Wryto." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: NotificationsErrorComponent,
  component: NotificationsPage,
});

function NotificationsErrorComponent() {
  return (
    <AppShell title="Notifications">
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
        <h2 className="text-xl font-bold font-sans">Unable to load notifications</h2>
        <p className="max-w-md text-sm text-muted-foreground font-sans">
          There was a problem loading your notification stream. Please try refreshing.
        </p>
        <Button onClick={() => window.location.reload()} className="rounded-full">Refresh</Button>
      </div>
    </AppShell>
  );
}

type Item = {
  id: string;
  kind: string;
  postId: string | null;
  isRead: boolean;
  time: string;
  actor: string;
  actorHandle: string;
  actorAvatar: string | null;
};

function NotificationsPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, refresh } = useInkline();
  const { t } = useSettings();
  const [items, setItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState<"All" | "Likes" | "Comments" | "Followers">("All");

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select(
        "id, kind, post_id, is_read, created_at, actor:profiles!notifications_actor_id_fkey(display_name, handle, avatar_url, profile_image)",
      )
      .eq("recipient_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    setItems(
      ((data ?? []) as never[]).map(
        (row: {
          id: string;
          kind: string;
          post_id: string | null;
          is_read: boolean;
          created_at: string;
          actor: { display_name: string; handle: string; avatar_url?: string; profile_image?: string } | null;
        }) => ({
          id: row.id,
          kind: row.kind || "like",
          postId: row.post_id,
          isRead: Boolean(row.is_read),
          time: relativeTime(row.created_at),
          actor: row.actor?.display_name ?? "Someone",
          actorHandle: row.actor?.handle ?? "",
          actorAvatar: row.actor?.avatar_url || row.actor?.profile_image || null,
        }),
      ),
    );
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) void navigate({ to: "/auth", replace: true });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifications-live-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${user.id}`,
        },
        () => void load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, load]);

  async function markAllRead() {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("recipient_id", user.id)
      .eq("is_read", false);
    await Promise.all([load(), refresh()]);
  }

  const visible = items.filter((item) => {
    if (filter === "Likes") return item.kind === "like";
    if (filter === "Comments") return item.kind === "comment" || item.kind === "response";
    if (filter === "Followers") return item.kind === "follow";
    return true;
  });

  const filterTabs: Array<{ id: "All" | "Likes" | "Comments" | "Followers"; label: string }> = [
    { id: "All", label: "All" },
    { id: "Likes", label: "Likes" },
    { id: "Comments", label: "Comments" },
    { id: "Followers", label: "Followers" },
  ];

  return (
    <AppShell
      title="Notifications"
      action={
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void markAllRead()}
          className="text-xs font-sans font-semibold text-primary hover:text-primary gap-1"
        >
          <CheckCheck className="size-3.5" />
          <span>Mark all read</span>
        </Button>
      }
    >
      {/* ── Filter Tabs ───────────────────────────────────────── */}
      <div className="flex border-b border-border/70 bg-background/85 backdrop-blur-md sticky top-0 z-20">
        {filterTabs.map((item) => (
          <button
            key={item.id}
            onClick={() => setFilter(item.id)}
            className={cn(
              "flex-1 py-3 text-center text-xs sm:text-sm font-sans font-semibold transition-colors relative cursor-pointer",
              filter === item.id
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/30",
            )}
          >
            <span>{item.label}</span>
            {filter === item.id && (
              <span className="absolute bottom-0 inset-x-8 h-1 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* ── Notifications Stream ──────────────────────────────── */}
      <div className="divide-y divide-border/60">
        {visible.map((item) => {
          const isLike = item.kind === "like";
          const isComment = item.kind === "comment" || item.kind === "response";
          const isFollow = item.kind === "follow";

          const ActionIcon = isLike ? Heart : isComment ? MessageCircle : UserPlus;
          const actionText = isLike
            ? "liked your post"
            : isComment
              ? "commented on your post"
              : "started following you";

          const destination = item.postId ? `/post/${item.postId}` : `/profile/${item.actorHandle}`;

          return (
            <Link
              key={item.id}
              to={destination}
              className={cn(
                "flex items-center gap-3.5 p-4 hover:bg-muted/20 transition-colors block relative",
                !item.isRead && "bg-primary/4",
              )}
            >
              {/* Actor Avatar with Icon Badge */}
              <div className="relative shrink-0">
                <Avatar className="size-10 ring-1 ring-border">
                  {getAvatarUrl(item.actorAvatar) && (
                    <AvatarImage src={getAvatarUrl(item.actorAvatar)!} alt={item.actor} />
                  )}
                  <AvatarFallback className="text-xs font-bold font-sans">
                    {initialsOf(item.actor)}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={cn(
                    "absolute -bottom-1 -right-1 size-5 rounded-full flex items-center justify-center ring-2 ring-background",
                    isLike && "bg-rose-500 text-white",
                    isComment && "bg-blue-500 text-white",
                    isFollow && "bg-primary text-primary-foreground",
                  )}
                >
                  <ActionIcon className="size-3 stroke-[2]" />
                </div>
              </div>

              {/* Notification Body */}
              <div className="flex-1 min-w-0 font-sans text-xs sm:text-sm">
                <p className="text-foreground leading-snug">
                  <span className="font-bold hover:underline">{item.actor}</span>{" "}
                  <span className="text-muted-foreground">{actionText}</span>
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{item.time}</p>
              </div>

              {/* Follow Button if follower notification */}
              {isFollow && item.actorHandle && (
                <div onClick={(e) => e.stopPropagation()}>
                  <FollowButton handle={item.actorHandle} />
                </div>
              )}

              {/* Unread Indicator Dot */}
              {!item.isRead && (
                <span className="size-2 rounded-full bg-primary shrink-0 ml-1" />
              )}
            </Link>
          );
        })}

        {!visible.length && (
          <div className="py-20 text-center px-6 space-y-3">
            <div className="size-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
              <Bell className="size-6" />
            </div>
            <h3 className="font-sans text-base font-bold text-foreground">No notifications yet</h3>
            <p className="font-sans text-xs text-muted-foreground max-w-sm mx-auto">
              When someone likes your posts, leaves a comment, or follows you, you'll see it here.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
