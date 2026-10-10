import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Heart, MessageCircle, UserPlus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
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
        <h2 className="text-xl font-bold">Unable to load notifications</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          There was a problem loading your notification stream. Please try refreshing.
        </p>
        <Button onClick={() => window.location.reload()}>Refresh</Button>
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
        "id, kind, post_id, is_read, created_at, actor:profiles!notifications_actor_id_fkey(display_name, handle)",
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
          actor: { display_name: string; handle: string } | null;
        }) => ({
          id: row.id,
          kind: row.kind || "like",
          postId: row.post_id,
          isRead: Boolean(row.is_read),
          time: relativeTime(row.created_at),
          actor: row.actor?.display_name ?? "Someone",
          actorHandle: row.actor?.handle ?? "",
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
      .channel("notifications-live")
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
    { id: "All", label: t("allNotif") },
    { id: "Likes", label: t("likeNotif") },
    { id: "Comments", label: t("commentNotif") },
    { id: "Followers", label: t("followNotif") },
  ];

  return (
    <AppShell
      title={t("notifications")}
      action={
        <Button variant="ghost" size="sm" onClick={() => void markAllRead()}>
          {t("markAllRead")}
        </Button>
      }
    >
      <div className="flex gap-6 border-b border-border px-5 sm:px-8 overflow-x-auto">
        {filterTabs.map((item) => (
          <button
            key={item.id}
            onClick={() => setFilter(item.id)}
            className={cn(
              "border-b-2 py-4 text-sm font-semibold whitespace-nowrap transition-colors",
              filter === item.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div>
        {visible.map((item) => {
          const Icon =
            item.kind === "like" ? Heart : item.kind === "comment" ? MessageCircle : UserPlus;
          const text =
            item.kind === "like"
              ? t("notifLiked")
              : item.kind === "comment"
                ? t("notifCommented")
                : t("notifFollowed");
          const body = (
            <div
              className={cn(
                "flex gap-4 border-b border-border px-5 py-5 sm:px-8 transition-colors hover:bg-accent/30",
                !item.isRead && "bg-accent/40",
              )}
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-primary">
                <Icon className="size-4" />
              </div>
              <p className="text-sm leading-6">
                <strong>{item.actor}</strong> {text}
                <span className="ml-2 text-xs text-muted-foreground">{item.time}</span>
              </p>
              {!item.isRead && <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" />}
            </div>
          );
          return item.postId ? (
            <Link key={item.id} to="/post/$id" params={{ id: item.postId }} className="block">
              {body}
            </Link>
          ) : (
            <Link
              key={item.id}
              to="/profile/$handle"
              params={{ handle: item.actorHandle }}
              className="block"
            >
              {body}
            </Link>
          );
        })}
        {!visible.length && (
          <p className="px-6 py-20 text-center font-reading text-lg text-muted-foreground">
            {t("noNotifications")}
          </p>
        )}
      </div>
    </AppShell>
  );
}
