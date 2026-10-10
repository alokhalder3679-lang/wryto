import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Compass, MessageCircle, Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ConversationList } from "@/components/chat/conversation-list";
import { ChatWindow } from "@/components/chat/chat-window";
import { CallModals } from "@/components/chat/call-modals";
import { ChatNotificationToast } from "@/components/chat/chat-notifications";
import { useChat } from "@/lib/chat-context";
import { useInkline } from "@/lib/inkline-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/messages")({
  validateSearch: (search: Record<string, unknown>): { user?: string; handle?: string } => ({
    user: typeof search.user === "string" ? search.user : undefined,
    handle: typeof search.handle === "string" ? search.handle : undefined,
  }),
  component: MessagesPage,
});

function MessagesPage() {
  const { conversations, activeConvId, setActiveConvId, openConversationWith } = useChat();
  const { user, profile } = useInkline();
  const searchParams = Route.useSearch();
  const myId = user?.id ?? profile?.id ?? "";

  const [searchQ, setSearchQ] = useState("");
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");

  // Handle URL query parameter ?user=id or ?handle=writer to auto-open chat
  useEffect(() => {
    const targetUserId = searchParams.user;
    const targetHandle = searchParams.handle;

    if (!targetUserId && !targetHandle) return;

    void (async () => {
      let query = supabase.from("profiles").select("id, handle, display_name, avatar_url");
      if (targetUserId) {
        query = query.eq("id", targetUserId);
      } else if (targetHandle) {
        query = query.eq("handle", targetHandle);
      }
      const { data } = await query.maybeSingle();
      if (data) {
        await openConversationWith(data);
        setMobileView("chat");
      }
    })();
  }, [searchParams.user, searchParams.handle, openConversationWith]);

  const filtered = conversations.filter(
    (c) =>
      !searchQ ||
      c.participantName.toLowerCase().includes(searchQ.toLowerCase()) ||
      c.participantHandle.toLowerCase().includes(searchQ.toLowerCase()),
  );

  const activeConv = conversations.find((c) => c.id === activeConvId) ?? null;

  function selectConv(id: string) {
    setActiveConvId(id);
    setMobileView("chat");
  }

  function handleBack() {
    setMobileView("list");
    setActiveConvId(null);
  }

  return (
    <AppShell title="Messages" hideBottomNav={mobileView === "chat"}>
      {/* Call modals sit above everything */}
      <CallModals />
      <ChatNotificationToast />

      {/* ── Two-panel layout ── */}
      <div
        className={cn(
          "flex overflow-hidden border border-border/60 min-w-0 w-full",
          mobileView === "chat"
            ? "h-[calc(100dvh-4rem)] rounded-none border-x-0 border-b-0 mx-0 mt-0"
            : "h-[calc(100dvh-5rem)] rounded-2xl mx-3 sm:mx-4 mt-3 sm:mt-4 lg:mx-6",
          "lg:h-[calc(100vh-5rem)] lg:rounded-2xl lg:border lg:mx-6 lg:mt-4",
        )}
      >
        {/* Left: Conversation list */}
        <aside
          className={cn(
            "flex w-full flex-col border-r border-border/60 bg-background lg:w-80 xl:w-96",
            // Mobile: hide when chat is open
            mobileView === "chat" ? "hidden lg:flex" : "flex",
          )}
        >
          {/* Search bar */}
          <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search conversations…"
                className="w-full rounded-full border border-border bg-muted/50 py-2 pl-9 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          {/* List */}
          {filtered.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center px-6 py-8">
              <div className="grid size-12 place-items-center rounded-full bg-muted/60 text-muted-foreground">
                <MessageCircle className="size-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold">
                  {searchQ ? "No matching conversations" : "No conversations yet"}
                </p>
                <p className="text-xs text-muted-foreground max-w-[200px]">
                  {searchQ
                    ? "Check spelling or search by writer handle"
                    : "Connect with writers who follow you to start chatting."}
                </p>
              </div>
              {!searchQ && (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="mt-2 rounded-full gap-1.5 text-xs"
                >
                  <Link to="/discover" search={{ q: "" }}>
                    <Compass className="size-3.5" />
                    <span>Discover writers</span>
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <ConversationList
              conversations={filtered}
              activeId={activeConvId}
              onSelect={selectConv}
            />
          )}
        </aside>

        {/* Right: Chat window */}
        <main
          className={cn(
            "flex-1 min-w-0 bg-background overflow-hidden",
            // Mobile: hide list when chat is open
            mobileView === "list" ? "hidden lg:flex lg:flex-col" : "flex flex-col",
          )}
        >
          {activeConv ? (
            <ChatWindow conversation={activeConv} myId={myId} onBack={handleBack} />
          ) : (
            <EmptyState />
          )}
        </main>
      </div>
    </AppShell>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center px-8">
      <div className="grid size-20 place-items-center rounded-full bg-primary/10">
        <MessageCircle className="size-9 text-primary/60" />
      </div>
      <p className="text-base font-semibold">Your messages</p>
      <p className="text-sm text-muted-foreground max-w-xs">
        Select a conversation from the left to start chatting, or message a writer who follows you.
      </p>
    </div>
  );
}
