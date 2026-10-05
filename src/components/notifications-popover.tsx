import { useState, useEffect, useCallback } from "react";
import {
  Bell,
  Heart,
  MessageCircle,
  UserPlus,
  CheckCheck,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useInkline } from "@/lib/inkline-context";
import { useSettings } from "@/lib/user-settings";
import { relativeTime } from "@/lib/inkline-data";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NotifItem {
  id: string;
  kind: string;
  postId: string | null;
  isRead: boolean;
  time: string;
  actor: string;
  actorHandle: string;
}

export function NotificationsPopover({ className }: { className?: string }) {
  const { user, unreadCount, refresh } = useInkline();
  const { t } = useSettings();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotifItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"All" | "Likes" | "Comments" | "Followers">("All");

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("notifications")
        .select(
          "id, kind, post_id, is_read, created_at, actor:profiles!notifications_actor_id_fkey(display_name, handle)",
        )
        .or(`recipient_id.eq.${user.id},user_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(20);

      type NotificationDbRow = {
        id: string;
        kind?: string;
        type?: string;
        post_id?: string | null;
        is_read?: boolean;
        read?: boolean;
        created_at: string;
        actor?: { display_name?: string; handle?: string } | null;
      };

      setItems(
        ((data ?? []) as unknown as NotificationDbRow[]).map((row) => ({
          id: row.id,
          kind: row.kind || row.type || "like",
          postId: row.post_id,
          isRead: Boolean(row.is_read ?? row.read),
          time: relativeTime(row.created_at),
          actor: row.actor?.display_name ?? "Someone",
          actorHandle: row.actor?.handle ?? "",
        })),
      );
    } catch (e) {
      console.error("Failed to load notifications:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (open) {
      void loadNotifications();
    }
  }, [open, loadNotifications]);

  const markAllAsRead = async () => {
    if (!user) return;
    // Optimistic update
    setItems((curr) => curr.map((it) => ({ ...it, isRead: true })));
    try {
      await supabase
        .from("notifications")
        .update({ is_read: true, read: true })
        .or(`recipient_id.eq.${user.id},user_id.eq.${user.id}`)
        .eq("is_read", false);
      await refresh();
    } catch (e) {
      console.error("Error marking all read:", e);
    }
  };

  const handleClickItem = async (item: NotifItem) => {
    setOpen(false);
    if (!item.isRead && user) {
      void supabase.from("notifications").update({ is_read: true, read: true }).eq("id", item.id);
      void refresh();
    }

    if (item.postId) {
      void navigate({ to: "/post/$id", params: { id: item.postId } });
    } else if (item.actorHandle) {
      void navigate({ to: "/profile/$handle", params: { handle: item.actorHandle } });
    }
  };

  const filteredItems = items.filter((item) => {
    if (filter === "Likes") return item.kind === "like";
    if (filter === "Comments") return item.kind === "comment" || item.kind === "response";
    if (filter === "Followers") return item.kind === "follow";
    return true;
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t("notifications")}
          className={cn(
            "relative inline-flex size-9 items-center justify-center rounded-full border border-border/80 bg-background/60 text-muted-foreground backdrop-blur-md transition-all hover:bg-accent hover:text-foreground active:scale-95",
            unreadCount > 0 && "text-foreground",
            className,
          )}
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow-sm animate-pulse">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="glass w-80 sm:w-96 rounded-2xl p-0 shadow-2xl backdrop-blur-xl border-border/80"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-sm font-bold text-foreground">{t("notifications")}</h3>
            {unreadCount > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                {unreadCount} new
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <CheckCheck className="size-3.5" />
              <span>{t("markAllRead")}</span>
            </Button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 border-b border-border/50 px-3 py-2 bg-muted/20">
          {(["All", "Likes", "Comments", "Followers"] as const).map((tab) => {
            const labelKey =
              tab === "All"
                ? "allNotif"
                : tab === "Likes"
                  ? "likeNotif"
                  : tab === "Comments"
                    ? "commentNotif"
                    : "followNotif";
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-semibold transition-all",
                  filter === tab
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {t(labelKey)}
              </button>
            );
          })}
        </div>

        {/* Notification list */}
        <div className="max-h-80 overflow-y-auto divide-y divide-border/40">
          {loading && items.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin text-primary" />
              <span>Loading notifications...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <Bell className="mx-auto size-7 text-muted-foreground/40 mb-2" />
              <p>{t("noNotifications")}</p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const isLike = item.kind === "like";
              const isComment = item.kind === "comment" || item.kind === "response";
              const isFollow = item.kind === "follow";

              const Icon = isLike ? Heart : isComment ? MessageCircle : UserPlus;
              const iconColor = isLike
                ? "text-rose-500 bg-rose-500/10"
                : isComment
                  ? "text-blue-500 bg-blue-500/10"
                  : "text-emerald-500 bg-emerald-500/10";

              const actionText = isLike
                ? t("notifLiked")
                : isComment
                  ? t("notifCommented")
                  : t("notifFollowed");

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void handleClickItem(item)}
                  className={cn(
                    "flex w-full items-start gap-3 p-3.5 text-left transition-colors hover:bg-accent/60",
                    !item.isRead && "bg-primary/[0.04]",
                  )}
                >
                  <div
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-full mt-0.5",
                      iconColor,
                    )}
                  >
                    <Icon className="size-4 fill-current" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs leading-snug text-foreground">
                      <span className="font-semibold">{item.actor}</span>{" "}
                      <span className="text-muted-foreground">{actionText}</span>
                    </p>
                    <span className="mt-1 block text-[10px] text-muted-foreground/80 font-medium">
                      {item.time}
                    </span>
                  </div>
                  {!item.isRead && (
                    <span className="size-2 shrink-0 rounded-full bg-primary mt-1.5" />
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border/60 bg-muted/20 p-2">
          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-accent"
          >
            <span>{t("viewAllNotif")}</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
