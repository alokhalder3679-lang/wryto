// ─── Chat Window (right panel with Follow-based Access Control) ─
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Lock, Send, Smile, UserCheck, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChat, type Conversation } from "@/lib/chat-context";
import { getFollowRelationship, formatLastSeen } from "@/lib/chat-api";
import { toggleFollow } from "@/lib/api";
import { MessageBubble } from "./message-bubble";
import { TypingIndicator } from "./typing-indicator";
import { Avatar } from "./conversation-list";
import { ChatCallButtons } from "./call-modals";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const EMOJI_QUICK = ["😊", "😄", "❤️", "🔥", "👏", "😂", "✨", "🙏"];

type Props = {
  conversation: Conversation;
  myId: string;
  onBack?: () => void; // mobile back
};

export function ChatWindow({ conversation, myId, onBack }: Props) {
  const { messages, typingPeers, sendMessage, sendTyping, markRead } = useChat();
  const [draft, setDraft] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Access Control (isFollower / isFollowing) ───────────────
  const [relationship, setRelationship] = useState<{
    isFollowing: boolean;
    isFollower: boolean;
  }>({ isFollowing: false, isFollower: false });
  const [checkingRelationship, setCheckingRelationship] = useState(true);
  const [followBusy, setFollowBusy] = useState(false);

  const isSelf = myId === conversation.participantId;
  const isMutual = isSelf || (relationship.isFollower && relationship.isFollowing);
  // Supabase RLS policy requires mutual follows to insert messages. Align UI with RLS to prevent crashes.
  const canChat = isMutual;
  const canCall = isMutual; // Audio/Video calls require mutual follow

  // Fetch relationship whenever participant or myId changes
  useEffect(() => {
    if (!myId || !conversation.participantId) return;

    let mounted = true;
    setCheckingRelationship(true);

    void getFollowRelationship(myId, conversation.participantId).then((rel) => {
      if (mounted) {
        setRelationship(rel);
        setCheckingRelationship(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [myId, conversation.participantId]);

  const msgs = messages[conversation.id] ?? [];
  const isPeerTyping = typingPeers[conversation.id] ?? false;

  // Scroll to bottom on new messages / typing
  const lastMsgId = msgs[msgs.length - 1]?.id;
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs.length, lastMsgId, isPeerTyping]);

  // Mark as read on open
  useEffect(() => {
    markRead(conversation.id);
  }, [conversation.id, markRead]);

  // ── Follow / Unfollow Handler ────────────────────────────────
  async function handleToggleFollow() {
    if (followBusy || isSelf) return;
    if (!myId || myId === "me") {
      toast.error("Please sign in to follow writers.");
      return;
    }

    setFollowBusy(true);
    const nextFollowing = !relationship.isFollowing;
    setRelationship((prev) => ({ ...prev, isFollowing: nextFollowing }));

    try {
      await toggleFollow(myId, conversation.participantId, relationship.isFollowing);

      window.dispatchEvent(
        new CustomEvent("wryto-follow", {
          detail: {
            handle: conversation.participantHandle,
            delta: nextFollowing ? 1 : -1,
            followerId: myId,
          },
        }),
      );

      // Re-verify from DB
      const updated = await getFollowRelationship(myId, conversation.participantId);
      setRelationship(updated);
    } catch (err) {
      console.warn("Follow error:", err);
      setRelationship((prev) => ({ ...prev, isFollowing: !nextFollowing }));
    } finally {
      setFollowBusy(false);
    }
  }

  function handleInputChange(val: string) {
    if (!canChat) return;
    setDraft(val);
    if (val.trim()) {
      sendTyping(conversation.id, true);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        sendTyping(conversation.id, false);
      }, 2500);
    } else {
      sendTyping(conversation.id, false);
    }
  }

  function handleSend() {
    if (!canChat || !draft.trim()) return;
    if (!myId || myId === "me") {
      toast.error("Please sign in to send messages.");
      return;
    }
    sendMessage(conversation.id, myId, draft, conversation.participantId);
    setDraft("");
    setShowEmoji(false);
    sendTyping(conversation.id, false);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex h-full flex-col bg-background min-w-0 w-full overflow-hidden">
      {/* ── Header ── */}
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-border/60 px-4">
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 lg:hidden"
            onClick={onBack}
          >
            <ArrowLeft className="size-4" />
          </Button>
        )}
        <Avatar
          name={conversation.participantName}
          avatar={conversation.participantAvatar}
          online={conversation.online}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold">{conversation.participantName || "Writer"}</p>
            {isMutual && !isSelf ? (
              <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                Mutual
              </span>
            ) : relationship.isFollower ? (
              <span className="shrink-0 rounded bg-muted px-1.5 py-0.2 text-[10px] font-medium text-muted-foreground">
                Follows you
              </span>
            ) : null}
          </div>
          <p
            className={cn(
              "text-[11px] font-medium",
              conversation.online ? "text-emerald-500" : "text-muted-foreground",
            )}
          >
            {formatLastSeen(conversation.lastSeen, conversation.online)}
          </p>
        </div>

        {/* Follow / Following Button in Chat */}
        {!isSelf && (
          <Button
            variant={relationship.isFollowing ? "outline" : "default"}
            size="sm"
            className="h-8 rounded-full px-3 text-xs font-semibold gap-1.5"
            onClick={handleToggleFollow}
            disabled={followBusy || checkingRelationship}
          >
            {relationship.isFollowing ? (
              <>
                <UserCheck className="size-3.5" />
                <span>Following</span>
              </>
            ) : (
              <>
                <UserPlus className="size-3.5" />
                <span>Follow</span>
              </>
            )}
          </Button>
        )}

        {/* Audio / Video Call Buttons (Active when mutual follow or self) */}
        {canCall && (
          <ChatCallButtons
            peerName={conversation.participantName}
            peerId={conversation.participantId}
          />
        )}
      </div>

      {/* ── One-Way Follower Banner: suggest mutual follow to unlock calls ── */}
      {!isSelf && relationship.isFollower && !relationship.isFollowing && (
        <div className="flex items-center justify-between gap-3 border-b border-border/50 bg-primary/5 px-4 py-2 text-xs text-muted-foreground">
          <span>
            Follow @{conversation.participantHandle} back to unlock audio & video calling.
          </span>
          <button
            onClick={handleToggleFollow}
            disabled={followBusy}
            className="shrink-0 font-semibold text-primary hover:underline"
          >
            Follow back
          </button>
        </div>
      )}

      {/* ── Messages or Empty Chat State ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-4 py-3 sm:py-4 space-y-2 min-w-0 w-full">
        {msgs.length === 0 ? (
          /* Empty Chat State */
          <div className="flex flex-col items-center justify-center p-8 text-center my-auto min-h-[300px]">
            <div className="relative mb-3">
              <Avatar
                name={conversation.participantName}
                avatar={conversation.participantAvatar}
                online={conversation.online}
                size="lg"
              />
            </div>
            <p className="text-base font-bold">{conversation.participantName || "Writer"}</p>
            <p className="text-xs text-muted-foreground">@{conversation.participantHandle || "writer"}</p>

            {isMutual && !isSelf ? (
              <span className="mt-2 inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                Mutual followers
              </span>
            ) : relationship.isFollower ? (
              <span className="mt-2 inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
                Follows you
              </span>
            ) : null}

            <div className="mt-6 max-w-xs space-y-1">
              <p className="text-sm font-semibold">Start conversation</p>
              <p className="text-xs text-muted-foreground">
                {isMutual
                  ? `You and @${conversation.participantHandle || "writer"} follow each other. Send a message or start a call!`
                  : relationship.isFollower
                    ? `@${conversation.participantHandle || "writer"} follows you. Follow them back to start chatting.`
                    : `Follow @${conversation.participantHandle || "writer"} and have them follow you back to chat.`}
              </p>
            </div>
          </div>
        ) : (
          msgs.map((msg, i) => {
            const isMine = msg.senderId === myId;
            const prevMsg = msgs[i - 1];
            const showTail = !prevMsg || prevMsg.senderId !== msg.senderId;
            return <MessageBubble key={msg.id} message={msg} isMine={isMine} showTail={showTail} />;
          })
        )}
        {isPeerTyping && <TypingIndicator name={conversation.participantName} />}
        <div ref={endRef} />
      </div>

      {/* ── Emoji picker (quick) ── */}
      {showEmoji && canChat && (
        <div className="flex flex-wrap gap-2 border-t border-border/60 bg-muted/30 px-4 py-2">
          {EMOJI_QUICK.map((e) => (
            <button
              key={e}
              onClick={() => {
                setDraft((d) => d + e);
                inputRef.current?.focus();
              }}
              className="text-xl transition-transform hover:scale-125 active:scale-95"
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {/* ── Input Bar / Access Control State ── */}
      {canChat ? (
        /* Allowed: Active input box */
        <div className="flex shrink-0 items-end gap-1.5 sm:gap-2 border-t border-border/60 bg-background p-2 sm:p-3 min-w-0 w-full box-border">
          <Button
            variant="ghost"
            size="icon"
            className={cn("size-9 shrink-0 rounded-full", showEmoji && "text-primary")}
            onClick={() => setShowEmoji((v) => !v)}
            aria-label="Emoji"
          >
            <Smile className="size-5" />
          </Button>

          <textarea
            ref={inputRef}
            rows={1}
            cols={1}
            value={draft}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            className={cn(
              "min-w-0 flex-1 resize-none rounded-2xl border border-border bg-muted/50 px-3.5 py-2 text-sm",
              "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40",
              "max-h-32 overflow-y-auto transition-all",
            )}
            style={{ height: "auto", minHeight: "38px" }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
            }}
          />

          <Button
            size="icon"
            className={cn(
              "size-9 shrink-0 rounded-full transition-all",
              !draft.trim() && "opacity-40",
            )}
            onClick={handleSend}
            disabled={!draft.trim()}
            aria-label="Send message"
          >
            <Send className="size-4" />
          </Button>
        </div>
      ) : (
        /* Not Allowed: Disabled input + Lock message & Follow to chat button */
        <div className="border-t border-border/60 bg-muted/30 p-4">
          <div className="mx-auto flex max-w-sm flex-col items-center gap-2 text-center">
            <div className="grid size-8 place-items-center rounded-full bg-muted text-muted-foreground">
              <Lock className="size-4" />
            </div>
            <p className="text-xs font-semibold">You can only message users who follow you</p>
            <p className="text-[11px] text-muted-foreground">
              {relationship.isFollowing
                ? `You are following @${conversation.participantHandle}. Once they follow you back, messaging will unlock.`
                : `Follow @${conversation.participantHandle} so they can follow you back to message.`}
            </p>
            {!relationship.isFollowing && (
              <Button
                size="sm"
                className="mt-1 rounded-full px-4 text-xs font-semibold gap-1.5"
                onClick={handleToggleFollow}
                disabled={followBusy}
              >
                <UserPlus className="size-3.5" />
                <span>Follow to chat</span>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
