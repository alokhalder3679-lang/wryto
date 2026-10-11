// =============================================================================
// Chat & Calling Context
// Realtime messaging, typing indicators, presence, and WebRTC audio/video calls
// Connected to Supabase Realtime + fallback for mock/local data
// =============================================================================

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useInkline } from "./inkline-context";
import { toast } from "sonner";
import {
  fetchUserConversations,
  fetchConversationMessages,
  sendChatMessage,
  markMessagesAsSeen,
  subscribeToMessages,
  subscribeToPresence,
  subscribeToUserPresence,
  updateUserPresenceInDb,
  subscribeToTypingChannel,
  sendTypingBroadcast,
  createCallRecord,
  updateCallStatus,
  subscribeToUserCalls,
  createCallSignalingChannel,
  getOrCreateConversation,
  formatMessageTimestamp,
  formatLastSeen,
  isValidUuid,
  type DbMessage,
} from "./chat-api";
import { WebRTCManager, type WebRTCSignal } from "./webrtc";

// ─── Types ────────────────────────────────────────────────────

export type MessageStatus = "sending" | "sent" | "delivered" | "seen";

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  status: MessageStatus;
};

export type Conversation = {
  id: string;
  participantId: string;
  participantName: string;
  participantHandle: string;
  participantAvatar: string | null;
  lastMessage: string;
  lastAt: string;
  unread: number;
  online: boolean;
  lastSeen?: string | null;
};

export type CallState =
  | { phase: "idle" }
  | {
      phase: "outgoing";
      peerId: string;
      peerName: string;
      kind: "audio" | "video";
      callId: string;
    }
  | {
      phase: "incoming";
      peerId: string;
      peerName: string;
      kind: "audio" | "video";
      callId: string;
    }
  | {
      phase: "active";
      peerId: string;
      peerName: string;
      kind: "audio" | "video";
      callId: string;
      muted: boolean;
      camOff: boolean;
      speakerOff: boolean;
      elapsed: number;
      localStream?: MediaStream | null;
      remoteStream?: MediaStream | null;
    };

type ChatContextValue = {
  conversations: Conversation[];
  activeConvId: string | null;
  setActiveConvId: (id: string | null) => void;
  messages: Record<string, ChatMessage[]>;
  typingPeers: Record<string, boolean>;
  sendMessage: (convId: string, senderId: string, body: string, receiverId?: string) => void;
  sendTyping: (convId: string, isTyping: boolean) => void;
  markRead: (convId: string) => void;
  openConversationWith: (participant: {
    id: string;
    handle: string;
    display_name: string;
    avatar_url?: string | null;
    profile_image?: string | null;
  }) => Promise<string>;
  onlineUserIds: Set<string>;
  call: CallState;
  startCall: (peerId: string, peerName: string, kind: "audio" | "video") => void;
  acceptCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleCam: () => void;
  toggleSpeaker: () => void;
};

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useInkline();
  // Always use the authenticated auth.users id — it is what RLS compares against auth.uid().
  const currentUserId = user?.id && isValidUuid(user.id) ? user.id : null;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [typingPeers, setTypingPeers] = useState<Record<string, boolean>>({});
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [call, setCall] = useState<CallState>({ phase: "idle" });

  const webrtcRef = useRef<WebRTCManager | null>(null);
  const signalingRef = useRef<{
    sendSignal: (signal: WebRTCSignal, senderId: string) => void;
    leave: () => void;
  } | null>(null);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingChannelRef = useRef<any>(null);

  // Latest-state refs so long-lived realtime handlers never read stale closures.
  const activeConvIdRef = useRef(activeConvId);
  const conversationsRef = useRef(conversations);
  const callRef = useRef(call);
  activeConvIdRef.current = activeConvId;
  conversationsRef.current = conversations;
  callRef.current = call;

  // ── Load Real Conversations From Supabase ───────────────────
  const loadConversations = useCallback(async () => {
    if (!currentUserId || !isValidUuid(currentUserId)) return;
    const dbConvs = await fetchUserConversations(currentUserId);
    const formatted: Conversation[] = dbConvs.map((c) => {
      const peer = c.participant;
      const peerId = c.user1_id === currentUserId ? c.user2_id : c.user1_id;
      return {
        id: c.id,
        participantId: peerId,
        participantName: peer?.display_name || peer?.handle || "Writer",
        participantHandle: peer?.handle || "writer",
        participantAvatar: peer?.avatar_url || (peer as any)?.profile_image || null,
        lastMessage: c.last_message || "",
        lastAt: c.updated_at,
        unread: 0,
        online: peer?.is_online || false,
        lastSeen: peer?.last_seen || null,
      };
    });
    setConversations((prev) => {
      // Keep locally-opened (not yet persisted) conversations visible.
      const pending = prev.filter(
        (p) =>
          p.id.startsWith("conv-") && !formatted.some((f) => f.participantId === p.participantId),
      );
      // Deduplicate by participantId and conversation id
      const seen = new Set<string>();
      const combined = [...pending, ...formatted].filter((c) => {
        if (seen.has(c.participantId) || seen.has(c.id)) return false;
        seen.add(c.participantId);
        seen.add(c.id);
        return true;
      });
      return combined;
    });
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) {
      setConversations([]);
      setMessages({});
      setActiveConvId(null);
      return;
    }
    void loadConversations();
  }, [currentUserId, loadConversations]);

  // ── Load Messages for Active Conversation ───────────────────
  useEffect(() => {
    if (!activeConvId || !isValidUuid(activeConvId)) return;

    let cancelled = false;
    void fetchConversationMessages(activeConvId).then((dbMsgs) => {
      if (cancelled) return;
      const mapped: ChatMessage[] = dbMsgs.map((m) => ({
        id: m.id,
        conversationId: activeConvId,
        senderId: m.sender_id,
        body: m.content,
        createdAt: m.created_at,
        status: m.is_seen ? "seen" : "delivered",
      }));
      setMessages((prev) => {
        // Merge with anything that arrived via realtime while the fetch was in flight.
        const extra = (prev[activeConvId] ?? []).filter((m) => !mapped.some((d) => d.id === m.id));
        return { ...prev, [activeConvId]: [...mapped, ...extra] };
      });
    });

    if (currentUserId && isValidUuid(currentUserId)) {
      void markMessagesAsSeen(activeConvId, currentUserId);
    }
    return () => {
      cancelled = true;
    };
  }, [activeConvId, currentUserId]);

  // ── Realtime Messages Subscription (one channel per signed-in user) ──
  useEffect(() => {
    if (!currentUserId || !isValidUuid(currentUserId)) return;

    const channel = subscribeToMessages(
      currentUserId,
      (newMsg: DbMessage) => {
        const peerId = newMsg.sender_id === currentUserId ? newMsg.receiver_id : newMsg.sender_id;
        const matchingConv = conversationsRef.current.find(
          (c) => c.id === newMsg.conversation_id || c.participantId === peerId,
        );

        // First message from someone new: pull the conversation row so it shows in the list.
        if (!matchingConv) void loadConversations();

        const convId = newMsg.conversation_id || matchingConv?.id || `conv-${peerId}`;
        const isActive =
          activeConvIdRef.current === convId || activeConvIdRef.current === matchingConv?.id;

        const incoming: ChatMessage = {
          id: newMsg.id,
          conversationId: convId,
          senderId: newMsg.sender_id,
          body: newMsg.content,
          createdAt: newMsg.created_at,
          status: newMsg.is_seen ? "seen" : "delivered",
        };

        setMessages((prev) => {
          // Migrate a temporary "conv-<peer>" bucket onto the real conversation id.
          const tempKey = matchingConv && matchingConv.id !== convId ? matchingConv.id : null;
          const base = [...(tempKey ? (prev[tempKey] ?? []) : []), ...(prev[convId] ?? [])];
          if (base.some((m) => m.id === newMsg.id)) {
            if (!tempKey) return prev;
            const { [tempKey]: _drop, ...rest } = prev;
            return { ...rest, [convId]: base };
          }
          const next = { ...prev, [convId]: [...base, incoming] };
          if (tempKey) delete next[tempKey];
          return next;
        });

        setConversations((prev) =>
          prev.map((c) =>
            c.id === convId || c.participantId === peerId
              ? {
                  ...c,
                  id: convId,
                  lastMessage: newMsg.content,
                  lastAt: newMsg.created_at,
                  unread: newMsg.sender_id === currentUserId || isActive ? 0 : c.unread + 1,
                }
              : c,
          ),
        );
        if (matchingConv && matchingConv.id !== convId && isActive) setActiveConvId(convId);

        // Receiver is looking at this chat right now → mark seen immediately.
        if (newMsg.receiver_id === currentUserId && isActive) {
          void markMessagesAsSeen(convId, currentUserId);
        }
      },
      (seenMsg: DbMessage) => {
        const convId = seenMsg.conversation_id;
        if (!convId || !seenMsg.is_seen) return;
        setMessages((prev) => ({
          ...prev,
          [convId]: (prev[convId] ?? []).map((m) =>
            m.id === seenMsg.id ? { ...m, status: "seen" } : m,
          ),
        }));
      },
    );

    return () => {
      if (channel) void supabase.removeChannel(channel);
    };
  }, [currentUserId, loadConversations]);

  // ── Realtime Presence / Online Status ────────────────────────
  useEffect(() => {
    if (!currentUserId || !isValidUuid(currentUserId)) return;

    // Report self online immediately
    void updateUserPresenceInDb(currentUserId, true);

    // 1. Database table subscription (persisted presence & last_seen)
    const dbPresenceChannel = subscribeToUserPresence(({ userId, isOnline, lastSeen }) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        if (isOnline) next.add(userId);
        else next.delete(userId);
        return next;
      });
      setConversations((prev) =>
        prev.map((c) =>
          c.participantId === userId
            ? {
                ...c,
                online: isOnline,
                lastSeen: isOnline ? null : lastSeen || c.lastSeen,
              }
            : c,
        ),
      );
    });

    // 2. Realtime presence broadcast channel (instant client-side peer updates)
    const broadcastChannel = subscribeToPresence(currentUserId, (onlineIds) => {
      setOnlineUserIds(onlineIds);
      setConversations((prev) =>
        prev.map((c) => ({
          ...c,
          online: onlineIds.has(c.participantId) || c.online,
        })),
      );
    });

    // 3. Tab visibility & unload listeners
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void updateUserPresenceInDb(currentUserId, true);
      } else {
        void updateUserPresenceInDb(currentUserId, false);
      }
    };

    const handleBeforeUnload = () => {
      void updateUserPresenceInDb(currentUserId, false);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      void updateUserPresenceInDb(currentUserId, false);
      if (dbPresenceChannel) void supabase.removeChannel(dbPresenceChannel);
      if (broadcastChannel) void supabase.removeChannel(broadcastChannel);
    };
  }, [currentUserId]);

  // ── Realtime Typing Channel Subscription ────────────────────
  useEffect(() => {
    if (
      !activeConvId ||
      !currentUserId ||
      !isValidUuid(currentUserId) ||
      !isValidUuid(activeConvId)
    ) {
      return;
    }

    const sub = subscribeToTypingChannel(activeConvId, ({ userId, isTyping }) => {
      if (userId !== currentUserId) {
        setTypingPeers((prev) => ({ ...prev, [activeConvId]: isTyping }));
        if (isTyping) {
          setTimeout(() => {
            setTypingPeers((prev) => ({ ...prev, [activeConvId]: false }));
          }, 4000);
        }
      }
    });
    typingChannelRef.current = sub;

    return () => {
      typingChannelRef.current = null;
      if (sub) void supabase.removeChannel(sub);
    };
  }, [activeConvId, currentUserId]);

  const sendTyping = useCallback(
    (_convId: string, isTyping: boolean) => {
      if (typingChannelRef.current && currentUserId) {
        sendTypingBroadcast(typingChannelRef.current, currentUserId, isTyping);
      }
    },
    [currentUserId],
  );

  // ── Incoming Calls Subscription ─────────────────────────────
  useEffect(() => {
    if (!currentUserId || !isValidUuid(currentUserId)) return;

    const channel = subscribeToUserCalls(
      currentUserId,
      (incomingCall) => {
        if (incomingCall.status === "ringing" && callRef.current.phase === "idle") {
          const peer = conversationsRef.current.find(
            (c) => c.participantId === incomingCall.caller_id,
          );
          setCall({
            phase: "incoming",
            peerId: incomingCall.caller_id,
            peerName: peer?.participantName || "Writer",
            kind: incomingCall.call_type,
            callId: incomingCall.id,
          });
        }
      },
      (callUpdate) => {
        const current = callRef.current;
        if (current.phase !== "idle" && current.callId === callUpdate.id) {
          if (callUpdate.status === "rejected" || callUpdate.status === "ended") {
            if (webrtcRef.current) webrtcRef.current.cleanup();
            if (signalingRef.current) signalingRef.current.leave();
            setCall({ phase: "idle" });
          }
        }
      },
    );

    return () => {
      if (channel) void supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  // ── Open or Create Conversation ────────────────────────────
  const openConversationWith = useCallback(
    async (participant: {
      id: string;
      handle: string;
      display_name: string;
      avatar_url?: string | null;
      profile_image?: string | null;
    }) => {
      if (!participant?.id) return "";

      const existing = conversations.find(
        (c) =>
          c.participantId === participant.id ||
          (isValidUuid(participant.id) && c.id === participant.id),
      );
      if (existing) {
        setActiveConvId(existing.id);
        return existing.id;
      }

      let convId = `conv-${participant.id}`;
      if (currentUserId && isValidUuid(currentUserId) && isValidUuid(participant.id)) {
        try {
          const dbConv = await getOrCreateConversation(currentUserId, participant.id);
          if (dbConv?.id) convId = dbConv.id;
        } catch (e) {
          console.warn("getOrCreateConversation fallback:", e);
        }
      }

      const safeName = (participant.display_name || participant.handle || "Writer").trim() || "Writer";
      const safeHandle = (participant.handle || "writer").trim() || "writer";
      const safeAvatar = participant.avatar_url || participant.profile_image || null;

      const newConv: Conversation = {
        id: convId,
        participantId: participant.id,
        participantName: safeName,
        participantHandle: safeHandle,
        participantAvatar: safeAvatar,
        lastMessage: "",
        lastAt: new Date().toISOString(),
        unread: 0,
        online: onlineUserIds.has(participant.id),
      };

      setConversations((prev) => [
        newConv,
        ...prev.filter((c) => c.id !== convId && c.participantId !== participant.id),
      ]);
      setActiveConvId(convId);
      return convId;
    },
    [conversations, currentUserId, onlineUserIds],
  );

  const sendMessage = useCallback(
    (convId: string, senderId: string, body: string, receiverId?: string) => {
      if (!body.trim()) return;

      const actualSenderId = currentUserId || senderId;
      if (!actualSenderId || actualSenderId === "me" || !isValidUuid(actualSenderId)) {
        toast.error("Please sign in to send messages.");
        return;
      }

      const conv = conversations.find((c) => c.id === convId);
      const targetReceiver = receiverId || conv?.participantId;
      if (!targetReceiver || !isValidUuid(targetReceiver)) {
        toast.error("Unable to send message: invalid recipient.");
        return;
      }

      const optimisticId = `m-${Date.now()}`;
      const newMsg: ChatMessage = {
        id: optimisticId,
        conversationId: convId,
        senderId: actualSenderId,
        body: body.trim(),
        createdAt: new Date().toISOString(),
        status: "sending",
      };

      setMessages((prev) => ({ ...prev, [convId]: [...(prev[convId] ?? []), newMsg] }));

      // Save previous state for rollback if sending is rejected
      const prevLastMessage = conv?.lastMessage || "";
      const prevLastAt = conv?.lastAt || "";

      // Update conversation last message optimistically
      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId ? { ...c, lastMessage: body.trim(), lastAt: newMsg.createdAt } : c,
        ),
      );

      // Save to Supabase backend
      void sendChatMessage({
        conversationId: isValidUuid(convId) ? convId : undefined,
        senderId: actualSenderId,
        receiverId: targetReceiver,
        content: body.trim(),
      }).then((res) => {
        if (res.error || !res.message) {
          // Rollback optimistic message on failure
          setMessages((prev) => ({
            ...prev,
            [convId]: (prev[convId] ?? []).filter((m) => m.id !== optimisticId),
          }));
          // Revert conversation last message
          setConversations((prev) =>
            prev.map((c) =>
              c.id === convId ? { ...c, lastMessage: prevLastMessage, lastAt: prevLastAt } : c,
            ),
          );
          toast.error(res.error || "Failed to send message");
          return;
        }

        const dbMsg = res.message;
        const realConvId = dbMsg.conversation_id;

        // If conversation ID was temporary ('conv-...'), migrate state to real DB UUID
        if (realConvId && convId !== realConvId) {
          setConversations((prev) =>
            prev.map((c) => (c.id === convId ? { ...c, id: realConvId } : c)),
          );
          setActiveConvId((curr) => (curr === convId ? realConvId : curr));
          setMessages((prev) => {
            const currentList = prev[convId] ?? [];
            const updatedList = currentList.map((m) =>
              m.id === optimisticId
                ? {
                    ...m,
                    status: dbMsg.is_seen ? "seen" : "delivered",
                    id: dbMsg.id,
                    conversationId: realConvId,
                  }
                : m,
            );
            const { [convId]: _, ...rest } = prev;
            return { ...rest, [realConvId]: updatedList };
          });
        } else {
          setMessages((prev) => ({
            ...prev,
            [convId]: (prev[convId] ?? []).map((m) =>
              m.id === optimisticId
                ? { ...m, status: dbMsg.is_seen ? "seen" : "delivered", id: dbMsg.id }
                : m,
            ),
          }));
        }
      });
    },
    [conversations, currentUserId],
  );

  const markRead = useCallback(
    (convId: string) => {
      setConversations((prev) => prev.map((c) => (c.id === convId ? { ...c, unread: 0 } : c)));
      setMessages((prev) => ({
        ...prev,
        [convId]: (prev[convId] ?? []).map((m) =>
          m.senderId !== currentUserId && m.status !== "seen" ? { ...m, status: "seen" } : m,
        ),
      }));
      if (currentUserId) {
        void markMessagesAsSeen(convId, currentUserId);
      }
    },
    [currentUserId],
  );

  // ── WebRTC Calling Actions ──────────────────────────────────
  const startCall = useCallback(
    async (peerId: string, peerName: string, kind: "audio" | "video") => {
      const generatedCallId = `call-${Date.now()}`;
      setCall({ phase: "outgoing", peerId, peerName, kind, callId: generatedCallId });

      // Save to DB
      const dbCall = await createCallRecord(currentUserId, peerId, kind);
      const callId = dbCall?.id || generatedCallId;

      // Setup WebRTC
      const rtc = new WebRTCManager();
      webrtcRef.current = rtc;
      const localStream = await rtc.setupMedia(kind);

      const signaling = createCallSignalingChannel(callId, async (signal) => {
        if (signal.type === "answer") {
          await rtc.handleAnswer(signal.sdp);
        } else if (signal.type === "ice-candidate") {
          await rtc.handleIceCandidate(signal.candidate);
        } else if (signal.type === "end") {
          rtc.cleanup();
          signaling.leave();
          setCall({ phase: "idle" });
        }
      });
      signalingRef.current = signaling;

      rtc.setSignalCallback((signal) => {
        signaling.sendSignal(signal, currentUserId);
      });

      rtc.setRemoteStreamCallback((remoteStream) => {
        setCall((c) => (c.phase === "active" ? { ...c, remoteStream } : c));
      });

      // Auto-connect fallback for demo peers or answer receipt
      setTimeout(async () => {
        await rtc.createOffer();
        setCall({
          phase: "active",
          peerId,
          peerName,
          kind,
          callId,
          muted: false,
          camOff: false,
          speakerOff: false,
          elapsed: 0,
          localStream,
          remoteStream: rtc.getRemoteStream(),
        });
      }, 3000);
    },
    [currentUserId],
  );

  const acceptCall = useCallback(async () => {
    if (call.phase !== "incoming") return;
    const { peerId, peerName, kind, callId } = call;

    await updateCallStatus(callId, "accepted");

    const rtc = new WebRTCManager();
    webrtcRef.current = rtc;
    const localStream = await rtc.setupMedia(kind);

    const signaling = createCallSignalingChannel(callId, async (signal) => {
      if (signal.type === "offer") {
        await rtc.handleOffer(signal.sdp);
      } else if (signal.type === "ice-candidate") {
        await rtc.handleIceCandidate(signal.candidate);
      } else if (signal.type === "end") {
        rtc.cleanup();
        signaling.leave();
        setCall({ phase: "idle" });
      }
    });
    signalingRef.current = signaling;

    rtc.setSignalCallback((signal) => {
      signaling.sendSignal(signal, currentUserId);
    });

    rtc.setRemoteStreamCallback((remoteStream) => {
      setCall((c) => (c.phase === "active" ? { ...c, remoteStream } : c));
    });

    setCall({
      phase: "active",
      peerId,
      peerName,
      kind,
      callId,
      muted: false,
      camOff: false,
      speakerOff: false,
      elapsed: 0,
      localStream,
      remoteStream: rtc.getRemoteStream(),
    });
  }, [call, currentUserId]);

  const rejectCall = useCallback(async () => {
    if (call.phase === "incoming") {
      await updateCallStatus(call.callId, "rejected");
      if (signalingRef.current) {
        signalingRef.current.sendSignal({ type: "end" }, currentUserId);
        signalingRef.current.leave();
      }
    }
    setCall({ phase: "idle" });
  }, [call, currentUserId]);

  const endCall = useCallback(async () => {
    if (elapsedRef.current) clearInterval(elapsedRef.current);
    if (call.phase === "active" || call.phase === "outgoing") {
      await updateCallStatus((call as any).callId, "ended");
      if (signalingRef.current) {
        signalingRef.current.sendSignal({ type: "end" }, currentUserId);
        signalingRef.current.leave();
      }
    }
    if (webrtcRef.current) webrtcRef.current.cleanup();
    setCall({ phase: "idle" });
  }, [call, currentUserId]);

  const toggleMute = useCallback(() => {
    setCall((c) => {
      if (c.phase !== "active") return c;
      const nextMuted = !c.muted;
      if (webrtcRef.current) webrtcRef.current.toggleMute(nextMuted);
      return { ...c, muted: nextMuted };
    });
  }, []);

  const toggleCam = useCallback(() => {
    setCall((c) => {
      if (c.phase !== "active") return c;
      const nextCamOff = !c.camOff;
      if (webrtcRef.current) webrtcRef.current.toggleCamera(nextCamOff);
      return { ...c, camOff: nextCamOff };
    });
  }, []);

  const toggleSpeaker = useCallback(() => {
    setCall((c) => (c.phase === "active" ? { ...c, speakerOff: !c.speakerOff } : c));
  }, []);

  // Timer while in active call
  useEffect(() => {
    if (call.phase === "active") {
      elapsedRef.current = setInterval(() => {
        setCall((c) => (c.phase === "active" ? { ...c, elapsed: c.elapsed + 1 } : c));
      }, 1000);
    } else {
      if (elapsedRef.current) clearInterval(elapsedRef.current);
    }
    return () => {
      if (elapsedRef.current) clearInterval(elapsedRef.current);
    };
  }, [call.phase]);

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConvId,
        setActiveConvId,
        messages,
        typingPeers,
        sendMessage,
        sendTyping,
        markRead,
        openConversationWith,
        onlineUserIds,
        call,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMute,
        toggleCam,
        toggleSpeaker,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}

// ─── Helpers ──────────────────────────────────────────────────

export function formatCallTime(s: number) {
  const m = Math.floor(s / 60)
    .toString()
    .padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

export function chatRelativeTime(iso: string) {
  return formatMessageTimestamp(iso);
}
