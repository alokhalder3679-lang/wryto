// =============================================================================
// Chat & Calling API Layer
// Supabase Database queries, Realtime subscriptions, Presence & WebRTC Signaling
// =============================================================================

import { supabase } from "@/integrations/supabase/client";
import type { WebRTCSignal } from "./webrtc";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type DbMessage = {
  id: string;
  conversation_id: string | null;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_seen: boolean;
  created_at: string;
};

export type DbConversation = {
  id: string;
  user1_id: string;
  user2_id: string;
  last_message: string | null;
  updated_at: string;
  participant?: {
    id: string;
    handle: string;
    display_name: string;
    avatar_url: string | null;
    is_online?: boolean;
    last_seen?: string;
  };
};

export type DbCall = {
  id: string;
  caller_id: string;
  receiver_id: string;
  call_type: "audio" | "video";
  status: "ringing" | "accepted" | "rejected" | "ended";
  created_at: string;
  ended_at?: string | null;
};

// =============================================================================
// 1. Conversations & Messages
// =============================================================================

export async function fetchUserConversations(userId: string): Promise<DbConversation[]> {
  try {
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .order("updated_at", { ascending: false });

    if (error || !data) return [];

    const conversations = data as DbConversation[];
    // Hydrate participant profile for each conversation
    const participantIds = conversations.map((c) =>
      c.user1_id === userId ? c.user2_id : c.user1_id,
    );

    if (participantIds.length > 0) {
      const [profilesRes, presenceRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, handle, display_name, avatar_url, is_online, last_seen")
          .in("id", participantIds),
        supabase
          .from("user_presence")
          .select("user_id, is_online, last_seen")
          .in("user_id", participantIds),
      ]);

      const presenceMap = new Map((presenceRes.data ?? []).map((p: any) => [p.user_id, p]));
      const profileMap = new Map(
        (profilesRes.data ?? []).map((p: any) => {
          const pres = presenceMap.get(p.id);
          return [
            p.id,
            {
              ...p,
              is_online: pres ? Boolean(pres.is_online) : p.is_online || false,
              last_seen: pres ? pres.last_seen : p.last_seen || null,
            },
          ];
        }),
      );

      conversations.forEach((c) => {
        const peerId = c.user1_id === userId ? c.user2_id : c.user1_id;
        c.participant = profileMap.get(peerId);
      });
    }

    return conversations;
  } catch (err) {
    console.warn("fetchUserConversations error:", err);
    return [];
  }
}

export async function fetchConversationMessages(
  conversationId: string,
  limit = 100,
): Promise<DbMessage[]> {
  try {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error || !data) return [];
    return data as DbMessage[];
  } catch (err) {
    console.warn("fetchConversationMessages error:", err);
    return [];
  }
}

export type SendChatMessageResult = {
  message: DbMessage | null;
  error?: string;
};

export async function sendChatMessage(input: {
  conversationId?: string;
  senderId: string;
  receiverId: string;
  content: string;
}): Promise<SendChatMessageResult> {
  const content = input.content.trim();
  if (!content) return { message: null, error: "Message cannot be empty" };

  try {
    // 1. Resolve or create conversation in database
    let conversationId = input.conversationId;
    if (!conversationId || conversationId.startsWith("conv-")) {
      const dbConv = await getOrCreateConversation(input.senderId, input.receiverId);
      if (dbConv?.id) {
        conversationId = dbConv.id;
      }
    }

    const validConvId =
      conversationId && !conversationId.startsWith("conv-") ? conversationId : null;

    // 2. Atomic RPC function execution
    const { data: rpcRes, error: rpcErr } = await supabase.rpc("send_chat_message", {
      p_sender_id: input.senderId,
      p_receiver_id: input.receiverId,
      p_content: content,
      p_conversation_id: validConvId,
    });

    if (!rpcErr && rpcRes) {
      return { message: rpcRes as DbMessage };
    }

    // 3. Fallback: Direct insert into messages table
    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: validConvId,
        sender_id: input.senderId,
        receiver_id: input.receiverId,
        content,
        is_seen: false,
      })
      .select("*")
      .single();

    if (error) {
      return { message: null, error: error.message };
    }

    return { message: data as DbMessage };
  } catch (err: any) {
    return { message: null, error: err?.message || "Failed to send message" };
  }
}

export async function markMessagesAsSeen(
  conversationId: string,
  receiverId: string,
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("messages")
      .update({ is_seen: true })
      .eq("conversation_id", conversationId)
      .eq("receiver_id", receiverId)
      .eq("is_seen", false);

    // Fallback if column is named recipient_id
    if (error && error.message?.includes("receiver_id")) {
      const fb = await supabase
        .from("messages")
        .update({ is_seen: true })
        .eq("conversation_id", conversationId)
        .eq("recipient_id", receiverId)
        .eq("is_seen", false);
      return !fb.error;
    }

    return !error;
  } catch {
    return false;
  }
}

export async function getFollowRelationship(
  currentUserId: string,
  participantId: string,
): Promise<{ isFollowing: boolean; isFollower: boolean }> {
  try {
    if (!currentUserId || !participantId || currentUserId === participantId) {
      return { isFollowing: true, isFollower: true };
    }
    const [followingRes, followerRes] = await Promise.all([
      supabase
        .from("followers")
        .select("id")
        .eq("follower_id", currentUserId)
        .eq("following_id", participantId)
        .maybeSingle(),
      supabase
        .from("followers")
        .select("id")
        .eq("follower_id", participantId)
        .eq("following_id", currentUserId)
        .maybeSingle(),
    ]);

    return {
      isFollowing: !!followingRes.data,
      isFollower: !!followerRes.data,
    };
  } catch (err) {
    console.warn("getFollowRelationship error:", err);
    return { isFollowing: false, isFollower: false };
  }
}

export async function getOrCreateConversation(
  userA: string,
  userB: string,
): Promise<DbConversation | null> {
  try {
    // 1. Try secure RPC function
    const { data: rpcConvId, error: rpcErr } = await supabase.rpc("get_or_create_conversation", {
      p_user1: userA,
      p_user2: userB,
    });

    if (!rpcErr && rpcConvId) {
      const { data: conv } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", rpcConvId)
        .maybeSingle();

      if (conv) return conv as DbConversation;
      return {
        id: rpcConvId,
        user1_id: userA < userB ? userA : userB,
        user2_id: userA < userB ? userB : userA,
        last_message: null,
        updated_at: new Date().toISOString(),
      };
    }

    // 2. Direct PostgREST query
    const u1 = userA < userB ? userA : userB;
    const u2 = userA < userB ? userB : userA;

    // Check if exists
    const { data: existing } = await supabase
      .from("conversations")
      .select("*")
      .or(`and(user1_id.eq.${u1},user2_id.eq.${u2}),and(user1_id.eq.${u2},user2_id.eq.${u1})`)
      .maybeSingle();

    if (existing) return existing as DbConversation;

    // Insert new conversation row
    const { data: created, error: createErr } = await supabase
      .from("conversations")
      .insert({
        user1_id: u1,
        user2_id: u2,
        last_message: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (!createErr && created) return created as DbConversation;

    // In case of race condition:
    const { data: retry } = await supabase
      .from("conversations")
      .select("*")
      .or(`and(user1_id.eq.${u1},user2_id.eq.${u2}),and(user1_id.eq.${u2},user2_id.eq.${u1})`)
      .maybeSingle();
    if (retry) return retry as DbConversation;

    return null;
  } catch (err) {
    console.error("[ChatAPI] getOrCreateConversation error:", err);
    return null;
  }
}

// =============================================================================
// 2. Realtime Messages & Conversation Subscription
// =============================================================================

export function subscribeToMessages(
  userId: string,
  onNewMessage: (msg: DbMessage) => void,
  onMessageSeen?: (msg: DbMessage) => void,
): RealtimeChannel {
  const channel = supabase
    .channel(`chat:messages:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
      },
      (payload) => {
        const msg = payload.new as DbMessage;
        if (!msg) return;
        // Deliver if current user is either receiver or sender
        if (msg.receiver_id === userId || msg.sender_id === userId) {
          onNewMessage(msg);
        }
      },
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "messages",
      },
      (payload) => {
        const msg = payload.new as DbMessage;
        if (!msg) return;
        if (msg.receiver_id === userId || msg.sender_id === userId) {
          onMessageSeen?.(msg);
        }
      },
    )
    .subscribe((status, err) => {
      if (err) console.error(`[Realtime:chat] Subscription error:`, err);
    });

  return channel;
}

// =============================================================================
// 3. Online Presence & Status Tracking
// =============================================================================

export async function updateUserPresenceInDb(userId: string, isOnline: boolean): Promise<void> {
  if (!userId) return;
  try {
    const { error } = await supabase.rpc("set_user_presence", {
      p_user_id: userId,
      p_is_online: isOnline,
    });
    if (!error) return;
  } catch {
    // fallback
  }

  try {
    await supabase.from("user_presence").upsert({
      user_id: userId,
      is_online: isOnline,
      last_seen: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  } catch {
    // ignore
  }
}

export function subscribeToUserPresence(
  onPresenceUpdate: (data: { userId: string; isOnline: boolean; lastSeen: string | null }) => void,
): RealtimeChannel {
  const channel = supabase
    .channel("realtime:user_presence")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "user_presence",
      },
      (payload) => {
        const row = payload.new as any;
        if (row?.user_id) {
          onPresenceUpdate({
            userId: row.user_id,
            isOnline: Boolean(row.is_online),
            lastSeen: row.last_seen || null,
          });
        }
      },
    )
    .subscribe();

  return channel;
}

export function subscribeToPresence(
  userId: string,
  onPresenceChange: (onlineUserIds: Set<string>) => void,
): RealtimeChannel {
  const channel = supabase.channel("online-users", {
    config: { presence: { key: userId } },
  });

  channel
    .on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const onlineIds = new Set(Object.keys(state));
      onPresenceChange(onlineIds);
    })
    .on("presence", { event: "join" }, ({ key }) => {
      const state = channel.presenceState();
      const onlineIds = new Set(Object.keys(state));
      onlineIds.add(key);
      onPresenceChange(onlineIds);
    })
    .on("presence", { event: "leave" }, ({ key }) => {
      const state = channel.presenceState();
      const onlineIds = new Set(Object.keys(state));
      onlineIds.delete(key);
      onPresenceChange(onlineIds);
    })
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ online_at: new Date().toISOString() });
        void updateUserPresenceInDb(userId, true);
      }
    });

  return channel;
}

// =============================================================================
// Time Formatting Helpers (WhatsApp / Instagram style)
// =============================================================================

export function formatMessageTimestamp(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);

  // If created within the last 60 seconds
  if (diffSec < 60 && diffSec >= -5) {
    return "Just now";
  }

  // If created within the last 60 minutes
  if (diffMin < 60 && diffMin >= 1) {
    return `${diffMin} min ago`;
  }

  // Same day: e.g. "10:45 AM"
  const timeStr = date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const isSameDay =
    now.getFullYear() === date.getFullYear() &&
    now.getMonth() === date.getMonth() &&
    now.getDate() === date.getDate();

  if (isSameDay) {
    return timeStr;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    yesterday.getFullYear() === date.getFullYear() &&
    yesterday.getMonth() === date.getMonth() &&
    yesterday.getDate() === date.getDate();

  if (isYesterday) {
    return "Yesterday";
  }

  // Within the last 7 days: show weekday name e.g. "Mon"
  if (diffMs < 7 * 24 * 60 * 60 * 1000) {
    return date.toLocaleDateString(undefined, { weekday: "short" });
  }

  // Older: e.g. "12 Oct"
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: now.getFullYear() === date.getFullYear() ? undefined : "numeric",
  });
}

export function formatLastSeen(lastSeenIso: string | null | undefined, isOnline: boolean): string {
  if (isOnline) return "Online";
  if (!lastSeenIso) return "Offline";

  const date = new Date(lastSeenIso);
  if (isNaN(date.getTime())) return "Offline";

  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60 && diffSec >= -5) {
    return "Last seen just now";
  }

  const timeStr = date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const isSameDay =
    now.getFullYear() === date.getFullYear() &&
    now.getMonth() === date.getMonth() &&
    now.getDate() === date.getDate();

  if (isSameDay) {
    return `Last seen at ${timeStr}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    yesterday.getFullYear() === date.getFullYear() &&
    yesterday.getMonth() === date.getMonth() &&
    yesterday.getDate() === date.getDate();

  if (isYesterday) {
    return `Last seen yesterday at ${timeStr}`;
  }

  const dateStr = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `Last seen ${dateStr} at ${timeStr}`;
}

// =============================================================================
// 4. Typing Indicator Broadcast
// =============================================================================

export function sendTypingBroadcast(
  channel: RealtimeChannel,
  userId: string,
  isTyping: boolean,
): void {
  void channel.send({
    type: "broadcast",
    event: "typing",
    payload: { userId, isTyping },
  });
}

export function subscribeToTypingChannel(
  conversationId: string,
  onTyping: (payload: { userId: string; isTyping: boolean }) => void,
): RealtimeChannel {
  return supabase
    .channel(`chat:typing:${conversationId}`, {
      config: { broadcast: { self: false } },
    })
    .on("broadcast", { event: "typing" }, ({ payload }) => {
      if (payload) onTyping(payload as { userId: string; isTyping: boolean });
    })
    .subscribe();
}

// =============================================================================
// 5. Calls & Signaling System
// =============================================================================

export async function createCallRecord(
  callerId: string,
  receiverId: string,
  callType: "audio" | "video",
): Promise<DbCall | null> {
  try {
    const { data, error } = await supabase
      .from("calls")
      .insert({
        caller_id: callerId,
        receiver_id: receiverId,
        call_type: callType,
        status: "ringing",
        created_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error || !data) {
      console.warn("createCallRecord fallback/error:", error);
      return null;
    }
    return data as DbCall;
  } catch (err) {
    console.warn("createCallRecord error:", err);
    return null;
  }
}

export async function updateCallStatus(
  callId: string,
  status: "ringing" | "accepted" | "rejected" | "ended",
): Promise<boolean> {
  try {
    const patch: any = { status };
    if (status === "ended" || status === "rejected") {
      patch.ended_at = new Date().toISOString();
    }
    const { error } = await supabase.from("calls").update(patch).eq("id", callId);
    return !error;
  } catch {
    return false;
  }
}

export function subscribeToUserCalls(
  userId: string,
  onIncomingCall: (call: DbCall) => void,
  onCallStateUpdate: (call: DbCall) => void,
): RealtimeChannel {
  return supabase
    .channel(`realtime:calls:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "calls",
        filter: `receiver_id=eq.${userId}`,
      },
      (payload) => {
        onIncomingCall(payload.new as DbCall);
      },
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "calls",
      },
      (payload) => {
        const row = payload.new as DbCall;
        if (row.caller_id === userId || row.receiver_id === userId) {
          onCallStateUpdate(row);
        }
      },
    )
    .subscribe();
}

export function createCallSignalingChannel(
  callId: string,
  onSignal: (signal: WebRTCSignal, fromUserId?: string) => void,
): {
  channel: RealtimeChannel;
  sendSignal: (signal: WebRTCSignal, senderId: string) => void;
  leave: () => void;
} {
  const channel = supabase.channel(`call:signaling:${callId}`, {
    config: { broadcast: { self: false } },
  });

  channel
    .on("broadcast", { event: "signal" }, ({ payload }) => {
      if (payload?.signal) {
        onSignal(payload.signal as WebRTCSignal, payload.from);
      }
    })
    .subscribe();

  const sendSignal = (signal: WebRTCSignal, senderId: string) => {
    void channel.send({
      type: "broadcast",
      event: "signal",
      payload: { signal, from: senderId },
    });
  };

  const leave = () => {
    void supabase.removeChannel(channel);
  };

  return { channel, sendSignal, leave };
}
