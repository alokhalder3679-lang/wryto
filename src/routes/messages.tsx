import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MessageCircle, Search, Sparkles, UserPlus, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ConversationList } from "@/components/chat/conversation-list";
import { ChatWindow } from "@/components/chat/chat-window";
import { CallModals } from "@/components/chat/call-modals";
import { ChatNotificationToast } from "@/components/chat/chat-notifications";
import { useChat } from "@/lib/chat-context";
import { useInkline } from "@/lib/inkline-context";
import { supabase } from "@/integrations/supabase/client";
import { isValidUuid } from "@/lib/chat-api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/messages")({
  validateSearch: (search: Record<string, unknown>): { user?: string; handle?: string } => {
    const res: { user?: string; handle?: string } = {};
    if (typeof search["user"] === "string") res.user = search["user"];
    if (typeof search["handle"] === "string") res.handle = search["handle"];
    return res;
  },
  head: () => ({
    meta: [
      { title: "Messages — Wryto" },
      {
        name: "description",
        content: "Direct messages and real-time conversations on Wryto.",
      },
    ],
  }),
  errorComponent: MessagesErrorComponent,
  component: MessagesPage,
});

function MessagesErrorComponent() {
  return (
    <AppShell title="Messages">
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
        <h2 className="text-xl font-bold font-sans">Unable to load messages</h2>
        <p className="max-w-md text-sm text-muted-foreground font-sans">
          There was an error loading your message threads. Please try refreshing.
        </p>
        <Button onClick={() => window.location.reload()} className="rounded-full">Refresh</Button>
      </div>
    </AppShell>
  );
}

function MessagesPage() {
  const { conversations, activeConvId, setActiveConvId, openConversationWith } = useChat();
  const { user, profile, loading: authLoading } = useInkline();
  const searchParams = Route.useSearch();
  const myId = user?.id ?? profile?.id ?? "";

  const [searchQ, setSearchQ] = useState("");
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");

  // Handle URL query parameter ?user=id or ?handle=writer to auto-open chat
  useEffect(() => {
    const targetUserId = searchParams.user;
    const targetHandle = searchParams.handle;

    if (!user || (!targetUserId && !targetHandle)) return;

    let cancelled = false;
    void (async () => {
      try {
        let query = supabase
          .from("profiles")
          .select("id, handle, display_name, avatar_url, profile_image");
        if (targetUserId) {
          if (!isValidUuid(targetUserId)) {
            console.warn("Invalid user UUID passed to messages:", targetUserId);
            return;
          }
          query = query.eq("id", targetUserId);
        } else if (targetHandle) {
          query = query.eq("handle", targetHandle.replace(/^@/, ""));
        }
        const { data, error } = await query.maybeSingle();
        if (cancelled || error || !data) {
          if (error) console.warn("Could not query profile for chat:", error);
          return;
        }
        await openConversationWith(data);
        if (!cancelled) {
          setMobileView("chat");
        }
      } catch (err) {
        console.warn("Failed to auto-open conversation:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, searchParams.user, searchParams.handle, openConversationWith]);

  if (authLoading) {
    return (
      <AppShell title="Messages">
        <div className="flex h-[calc(100dvh-5rem)] items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm font-sans">Loading messages…</p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell title="Messages">
        <div className="mx-auto flex min-h-[70vh] max-w-md items-center justify-center px-4 py-12 text-center space-y-4">
          <div className="w-full rounded-2xl border border-border/70 bg-card p-8 shadow-xs space-y-4">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <MessageCircle className="size-7" />
            </div>
            <h2 className="font-sans text-xl font-bold text-foreground">
              Direct Messages on Wryto
            </h2>
            <p className="font-sans text-xs text-muted-foreground leading-relaxed">
              Connect one-on-one with writers and readers across Wryto. Sign in to start conversations.
            </p>
            <div className="pt-2">
              <Button asChild className="rounded-full px-6 font-semibold" size="sm">
                <Link to="/auth" search={{ next: "/messages" }}>
                  Sign In to Message
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  const filtered = conversations.filter(
    (c) =>
      !searchQ ||
      (c.participantName && c.participantName.toLowerCase().includes(searchQ.toLowerCase())) ||
      (c.participantHandle && c.participantHandle.toLowerCase().includes(searchQ.toLowerCase())),
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
    <AppShell title="Messages" hideBottomNav={mobileView === "chat"} hideRightRail>
      <CallModals />
      <ChatNotificationToast />

      {/* ── Modern Split-Panel Chat Interface ────────────────── */}
      <div className="flex h-[calc(100vh-3.5rem)] lg:h-screen w-full overflow-hidden bg-background">
        {/* Left Column: Conversations List */}
        <div
          className={cn(
            "w-full md:w-80 lg:w-96 border-r border-border/70 flex flex-col shrink-0 bg-card/40 backdrop-blur-xs",
            mobileView === "chat" && "hidden md:flex",
          )}
        >
          {/* Header & Search */}
          <div className="p-3.5 border-b border-border/70 space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="font-sans text-lg font-bold text-foreground">Messages</h2>
              <span className="text-xs font-sans text-muted-foreground font-medium">
                {conversations.length} {conversations.length === 1 ? "thread" : "threads"}
              </span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search conversations..."
                className="w-full h-9 pl-9 pr-8 rounded-full bg-muted/60 focus:bg-background border border-transparent focus:border-primary/50 text-xs font-sans text-foreground placeholder:text-muted-foreground outline-none transition-colors"
              />
              {searchQ && (
                <button
                  type="button"
                  onClick={() => setSearchQ("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Conversation List Items */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/40">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground space-y-2">
                <p className="text-xs font-sans">
                  {searchQ ? "No matching conversations found." : "No messages yet."}
                </p>
                <Button asChild variant="outline" size="sm" className="rounded-full text-xs">
                  <Link to="/discover">Find Writers to Chat</Link>
                </Button>
              </div>
            ) : (
              <ConversationList
                conversations={filtered}
                activeId={activeConvId}
                onSelect={selectConv}
              />
            )}
          </div>
        </div>

        {/* Right Column: Chat Window or Empty Placeholder */}
        <div
          className={cn(
            "flex-1 flex flex-col bg-background min-w-0 h-full",
            mobileView === "list" && "hidden md:flex",
          )}
        >
          {activeConv ? (
            <ChatWindow
              conversation={activeConv}
              myId={myId}
              onBack={handleBack}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
              <div className="size-14 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                <MessageCircle className="size-7 stroke-[1.5]" />
              </div>
              <h3 className="font-sans text-base font-bold text-foreground">Select a message</h3>
              <p className="font-sans text-xs text-muted-foreground max-w-sm">
                Choose from your existing conversations, or discover writers across Wryto to start a new chat.
              </p>
              <Button asChild size="sm" className="rounded-full font-semibold text-xs mt-2">
                <Link to="/discover">Discover Creators</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
