import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookOpen, Compass, Feather, MessageCircle, Search, X } from "lucide-react";
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
      { title: "Dispatches & Messages — Wryto" },
      {
        name: "description",
        content: "Direct dispatches and quiet literary conversations with writers.",
      },
    ],
  }),
  errorComponent: MessagesErrorComponent,
  component: MessagesPage,
});

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
            <p className="font-reading text-sm">Opening dispatches…</p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell title="Messages">
        <div className="mx-auto flex min-h-[70vh] max-w-lg items-center justify-center px-4 py-12">
          <div className="w-full rounded-2xl border border-border/70 bg-card p-8 sm:p-10 text-center shadow-xs space-y-6">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
              <MessageCircle className="size-7 stroke-[1.75]" />
            </div>
            <div className="space-y-2">
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Private Letters & Dispatches
              </h2>
              <p className="font-reading text-sm text-muted-foreground leading-relaxed">
                Connect one-on-one with writers and readers across Wryto. Sign in to your account to send and receive private letters.
              </p>
            </div>
            <blockquote className="font-display italic text-sm text-foreground/80 border-y border-border/50 py-3">
              “Letters are among the most significant memorial a person can leave behind them.”
            </blockquote>
            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild className="rounded-full min-h-[44px] px-6 text-xs font-sans font-medium">
                <Link to="/auth" search={{ next: "/messages" }}>
                  Sign In to Wryto
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="rounded-full min-h-[44px] px-6 text-xs font-sans font-medium border-border/80"
              >
                <Link to="/feed">Explore Stories</Link>
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
    <AppShell title="Messages" hideBottomNav={mobileView === "chat"}>
      {/* Call modals sit above everything */}
      <CallModals />
      <ChatNotificationToast />

      {/* ── Two-panel layout matching the warm editorial design ── */}
      <div className="mx-auto max-w-6xl w-full px-2 sm:px-4 lg:px-6 py-3 sm:py-4">
        <div
          className={cn(
            "flex overflow-hidden border border-border/70 rounded-2xl bg-card shadow-2xs",
            mobileView === "chat"
              ? "h-[calc(100dvh-4rem)] rounded-none border-x-0 border-b-0"
              : "h-[calc(100dvh-5.5rem)]",
            "lg:h-[calc(100vh-6rem)] lg:rounded-2xl lg:border",
          )}
        >
          {/* Left Panel: Conversation list */}
          <aside
            className={cn(
              "flex w-full flex-col border-r border-border/60 bg-background lg:w-80 xl:w-96 shrink-0",
              // Mobile: hide list when chat is open
              mobileView === "chat" ? "hidden lg:flex" : "flex",
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-3.5">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-lg font-bold tracking-tight text-foreground">
                  Dispatches
                </h1>
                {conversations.length > 0 && (
                  <span className="rounded-full bg-muted/70 px-2 py-0.5 text-[11px] font-sans font-medium text-muted-foreground">
                    {conversations.length}
                  </span>
                )}
              </div>
            </div>

            {/* Search bar */}
            <div className="border-b border-border/60 px-3.5 py-2.5">
              <div className="relative flex items-center rounded-xl border border-border/60 bg-muted/30 px-3 py-1 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                <Search className="size-4 text-muted-foreground shrink-0" />
                <input
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  placeholder="Search conversations…"
                  className="h-9 w-full bg-transparent border-0 pl-2.5 pr-2 text-xs font-sans text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
                  aria-label="Search conversations"
                />
                {searchQ && (
                  <button
                    type="button"
                    onClick={() => setSearchQ("")}
                    className="flex size-7 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer rounded-full"
                    aria-label="Clear search"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Conversation list or empty list */}
            {filtered.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center p-6 text-center space-y-3 my-auto">
                <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                  <Feather className="size-5 stroke-[1.75]" />
                </div>
                <div className="space-y-1">
                  <p className="font-display text-base font-semibold text-foreground">
                    {searchQ ? "No matching dispatches" : "No dispatches yet"}
                  </p>
                  <p className="font-reading text-xs text-muted-foreground leading-relaxed max-w-[220px]">
                    {searchQ
                      ? "Check spelling or search for another writer's name."
                      : "Connect with writers who follow you to start exchanging letters and ideas."}
                  </p>
                </div>
                {!searchQ && (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="mt-2 rounded-full text-xs font-sans min-h-[44px] px-4 border-border/80"
                  >
                    <Link to="/discover">
                      <Compass className="size-3.5 mr-1.5" />
                      <span>Discover writers</span>
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                <ConversationList
                  conversations={filtered}
                  activeId={activeConvId}
                  onSelect={selectConv}
                />
              </div>
            )}
          </aside>

          {/* Right Panel: Chat window or empty selection state */}
          <main
            className={cn(
              "flex-1 min-w-0 bg-background overflow-hidden",
              // Mobile: hide when on list view
              mobileView === "list" ? "hidden lg:flex lg:flex-col" : "flex flex-col",
            )}
          >
            {activeConv ? (
              <ChatWindow conversation={activeConv} myId={myId} onBack={handleBack} />
            ) : (
              <EmptyMessagesState />
            )}
          </main>
        </div>
      </div>
    </AppShell>
  );
}

function EmptyMessagesState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center max-w-md mx-auto space-y-6">
      <div className="grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
        <Feather className="size-8 stroke-[1.75]" />
      </div>
      <div className="space-y-2">
        <blockquote className="font-display italic text-lg sm:text-xl text-foreground/90 leading-relaxed">
          “Letters are among the most significant memorial a person can leave behind them.”
        </blockquote>
        <p className="text-xs font-sans tracking-widest uppercase text-primary font-medium">
          — Johann Wolfgang von Goethe
        </p>
      </div>
      <p className="font-reading text-sm text-muted-foreground leading-relaxed">
        Select a conversation from the left to read and send dispatches, or visit any writer's profile to begin a quiet dialogue.
      </p>
      <Button
        asChild
        variant="outline"
        className="rounded-full min-h-[44px] px-5 text-xs font-sans font-medium border-border/80"
      >
        <Link to="/discover">
          <Compass className="size-3.5 mr-2" />
          <span>Explore Writers</span>
        </Link>
      </Button>
    </div>
  );
}

function MessagesErrorComponent() {
  return (
    <AppShell title="Messages">
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 my-auto min-h-[400px]">
        <div className="rounded-2xl bg-destructive/10 p-4 text-destructive">
          <BookOpen className="size-8 stroke-[1.75]" />
        </div>
        <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Unable to open dispatches
        </h2>
        <p className="max-w-md font-reading text-sm text-muted-foreground leading-relaxed">
          There was an issue opening your conversations. Please try refreshing or returning to the feed.
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="rounded-full min-h-[44px]"
          >
            Refresh
          </Button>
          <Button asChild className="rounded-full min-h-[44px]">
            <Link to="/feed">Go to Feed</Link>
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
