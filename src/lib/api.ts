import { supabase } from "@/integrations/supabase/client";
import {
  POST_SELECT,
  toPost,
  toWriter,
  type Post,
  type Writer,
  type Comment,
} from "@/lib/inkline-data";
import type { RealtimeChannel } from "@supabase/supabase-js";

// ==============================================================================
// 1. Posts API
// ==============================================================================

export type CreatePostInput = {
  title?: string;
  body: string;
  tags?: string[];
};

export async function fetchPostsFeed(options?: {
  limit?: number;
  offset?: number;
  topic?: string;
}): Promise<Post[]> {
  const limit = options?.limit ?? 50;
  let query = supabase
    .from("posts")
    .select(POST_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (options?.offset) {
    query = query.range(options.offset, options.offset + limit - 1);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching posts feed:", error);
    return [];
  }

  let posts = ((data ?? []) as never[]).map(toPost).filter(Boolean) as Post[];
  if (options?.topic && options.topic !== "all") {
    posts = posts.filter((p) => p.tags.includes(options.topic!));
  }
  return posts;
}

export async function fetchPostById(id: string): Promise<Post | null> {
  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return toPost(data as never);
}

export async function createPost(authorId: string, input: CreatePostInput): Promise<string | null> {
  const { data, error } = await supabase
    .from("posts")
    .insert({
      author_id: authorId,
      title: input.title?.trim() || null,
      body: input.body.trim(),
      content: input.body.trim(),
      tags: input.tags ?? [],
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating post:", error);
    return null;
  }
  return data.id;
}

export async function deletePost(postId: string, authorId: string): Promise<boolean> {
  const { error } = await supabase
    .from("posts")
    .delete()
    .eq("id", postId)
    .eq("author_id", authorId);

  if (error) {
    console.error("Error deleting post:", error);
    return false;
  }
  return true;
}

// ==============================================================================
// 2. Comments API
// ==============================================================================

export async function fetchComments(postId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from("comments")
    .select(
      "id, body, content, created_at, author:profiles!comments_author_id_fkey(id, handle, display_name, bio, location, avatar_url, profile_image)",
    )
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching comments:", error);
    return [];
  }

  return ((data ?? []) as never[]).map((row: any) => ({
    id: row.id,
    body: row.body || row.content || "",
    createdAt: row.created_at,
    time: new Date(row.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    author: toWriter(row.author),
  }));
}

export async function addComment(
  postId: string,
  authorId: string,
  content: string,
): Promise<Comment | null> {
  const { data, error } = await supabase
    .from("comments")
    .insert({
      post_id: postId,
      author_id: authorId,
      body: content.trim(),
      content: content.trim(),
    })
    .select(
      "id, body, content, created_at, author:profiles!comments_author_id_fkey(id, handle, display_name, bio, location, avatar_url, profile_image)",
    )
    .single();

  if (error || !data) {
    console.error("Error adding comment:", error);
    return null;
  }

  return {
    id: (data as any).id,
    body: (data as any).body,
    createdAt: (data as any).created_at,
    time: "Now",
    author: toWriter((data as any).author),
  };
}

export async function deleteComment(commentId: string, authorId: string): Promise<boolean> {
  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", commentId)
    .eq("author_id", authorId);

  if (error) {
    console.error("Error deleting comment:", error);
    return false;
  }
  return true;
}

// ==============================================================================
// 3. Likes API
// ==============================================================================

export async function toggleLike(
  postId: string,
  userId: string,
  currentlyLiked: boolean,
): Promise<boolean> {
  if (currentlyLiked) {
    const { error } = await supabase
      .from("likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", userId);
    return !error;
  } else {
    const { error } = await supabase.from("likes").insert({ post_id: postId, user_id: userId });
    return !error;
  }
}

export async function fetchUserLikes(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase.from("likes").select("post_id").eq("user_id", userId);

  if (error) return new Set();
  return new Set(((data ?? []) as { post_id: string }[]).map((r) => r.post_id));
}

// ==============================================================================
// 4. Follows & Profiles API
// ==============================================================================

export async function fetchUserProfile(handleOrId: string): Promise<Writer | null> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(handleOrId);
  const column = isUuid ? "id" : "handle";

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, handle, username, display_name, bio, location, avatar_url, profile_image, followers_count, following_count, posts_count",
    )
    .eq(column, handleOrId)
    .maybeSingle();

  if (error || !data) return null;
  return toWriter(data);
}

export async function updateProfile(
  userId: string,
  updates: {
    handle?: string;
    display_name?: string;
    bio?: string;
    location?: string;
    avatar_url?: string;
  },
): Promise<boolean> {
  const { error } = await supabase
    .from("profiles")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  return !error;
}

export async function fetchFollowers(
  profileId: string,
): Promise<{ id: string; handle: string; display_name: string }[]> {
  const { data, error } = await supabase
    .from("followers")
    .select("follower:profiles!followers_follower_id_fkey(id, handle, display_name)")
    .eq("following_id", profileId);

  if (error) return [];
  return ((data ?? []) as any[]).flatMap((r) => (r.follower ? [r.follower] : []));
}

export async function fetchFollowing(
  profileId: string,
): Promise<{ id: string; handle: string; display_name: string }[]> {
  const { data, error } = await supabase
    .from("followers")
    .select("following:profiles!followers_following_id_fkey(id, handle, display_name)")
    .eq("follower_id", profileId);

  if (error) return [];
  return ((data ?? []) as any[]).flatMap((r) => (r.following ? [r.following] : []));
}

export async function toggleFollow(
  followerId: string,
  followingId: string,
  currentlyFollowing: boolean,
): Promise<boolean> {
  if (currentlyFollowing) {
    const { error } = await supabase
      .from("followers")
      .delete()
      .eq("follower_id", followerId)
      .eq("following_id", followingId);
    return !error;
  } else {
    const { error } = await supabase
      .from("followers")
      .insert({ follower_id: followerId, following_id: followingId });
    return !error;
  }
}

// ==============================================================================
// 5. Notifications API
// ==============================================================================

export type NotificationItem = {
  id: string;
  type: string;
  kind: string;
  postId: string | null;
  read: boolean;
  createdAt: string;
  actor: {
    display_name: string;
    handle: string;
  } | null;
};

export async function fetchNotifications(userId: string): Promise<NotificationItem[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select(
      "id, kind, type, post_id, is_read, read, created_at, actor:profiles!notifications_actor_id_fkey(display_name, handle)",
    )
    .or(`recipient_id.eq.${userId},user_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }

  return ((data ?? []) as any[]).map((r) => ({
    id: r.id,
    type: r.kind || r.type || "notification",
    kind: r.kind || r.type || "notification",
    postId: r.post_id,
    read: r.is_read ?? r.read ?? false,
    createdAt: r.created_at,
    actor: r.actor,
  }));
}

export async function markNotificationsAsRead(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, read: true })
    .or(`recipient_id.eq.${userId},user_id.eq.${userId}`)
    .eq("is_read", false);

  return !error;
}

// ==============================================================================
// 6. Real-Time Subscriptions
// ==============================================================================

export function subscribeToFeed(onUpdate: () => void): RealtimeChannel {
  return supabase
    .channel("realtime:feed")
    .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, onUpdate)
    .on("postgres_changes", { event: "*", schema: "public", table: "likes" }, onUpdate)
    .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, onUpdate)
    .subscribe();
}

export function subscribeToPostDetails(postId: string, onUpdate: () => void): RealtimeChannel {
  return supabase
    .channel(`realtime:post:${postId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "comments", filter: `post_id=eq.${postId}` },
      onUpdate,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "likes", filter: `post_id=eq.${postId}` },
      onUpdate,
    )
    .subscribe();
}

export function subscribeToNotifications(userId: string, onUpdate: () => void): RealtimeChannel {
  return supabase
    .channel(`realtime:notifications:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `recipient_id=eq.${userId}`,
      },
      onUpdate,
    )
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
      onUpdate,
    )
    .subscribe();
}

// ==============================================================================
// 7. Search API
// ==============================================================================

export type SearchUserResult = {
  id: string;
  handle: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
};

export type SearchPostResult = {
  id: string;
  title: string | null;
  body: string;
  tags: string[];
  created_at: string;
  author: { handle: string; display_name: string } | null;
};

export async function searchUsers(query: string, limit = 10): Promise<SearchUserResult[]> {
  if (!query.trim()) return [];

  const pattern = `%${query.trim()}%`;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, handle, display_name, bio, avatar_url")
    .or(`handle.ilike.${pattern},display_name.ilike.${pattern},bio.ilike.${pattern}`)
    .limit(limit);

  if (error) {
    console.error("Error searching users:", error);
    return [];
  }

  return ((data ?? []) as any[]).map((r) => ({
    id: r.id,
    handle: r.handle,
    display_name: r.display_name,
    bio: r.bio ?? null,
    avatar_url: r.avatar_url ?? null,
  }));
}

export async function searchPosts(query: string, limit = 10): Promise<SearchPostResult[]> {
  if (!query.trim()) return [];

  const pattern = `%${query.trim()}%`;
  const { data, error } = await supabase
    .from("posts")
    .select(
      "id, title, body, tags, created_at, author:profiles!posts_author_id_fkey(handle, display_name)",
    )
    .or(`title.ilike.${pattern},body.ilike.${pattern}`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error searching posts:", error);
    return [];
  }

  return ((data ?? []) as any[]).map((r) => ({
    id: r.id,
    title: r.title ?? null,
    body: r.body ?? "",
    tags: r.tags ?? [],
    created_at: r.created_at,
    author: r.author ?? null,
  }));
}

// ==============================================================================
// 8. Notifications – mark a single notification read
// ==============================================================================

export async function markNotificationRead(notificationId: string): Promise<boolean> {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, read: true })
    .eq("id", notificationId);

  return !error;
}

// ==============================================================================
// 9. Report API
// ==============================================================================

export type ReportInput = {
  postId?: string | null;
  targetUserId?: string | null;
  reason: string;
  details?: string;
};

export async function reportContent(reporterId: string, input: ReportInput): Promise<boolean> {
  const { error } = await supabase.from("reports").insert({
    reporter_id: reporterId,
    post_id: input.postId ?? null,
    target_user_id: input.targetUserId ?? null,
    reason: input.reason,
    details: input.details?.trim() || null,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Error reporting content:", error);
    return false;
  }
  return true;
}

// ==============================================================================
// 10. Block API
// ==============================================================================

export async function blockUser(blockerId: string, blockedId: string): Promise<boolean> {
  // Insert block record
  const { error: blockErr } = await supabase
    .from("user_blocks")
    .insert({ blocker_id: blockerId, blocked_id: blockedId, user_id: blockerId });

  if (blockErr && (blockErr as any).code !== "23505") {
    // 23505 = unique_violation (already blocked) — treat as success
    console.error("Error blocking user:", blockErr);
    return false;
  }

  // Remove follow relationships bidirectionally
  await supabase
    .from("followers")
    .delete()
    .eq("follower_id", blockerId)
    .eq("following_id", blockedId);
  await supabase
    .from("followers")
    .delete()
    .eq("follower_id", blockedId)
    .eq("following_id", blockerId);

  return true;
}

export async function unblockUser(blockerId: string, blockedId: string): Promise<boolean> {
  const { error } = await supabase
    .from("user_blocks")
    .delete()
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId);

  if (error) {
    console.error("Error unblocking user:", error);
    return false;
  }
  return true;
}

export async function fetchBlockedIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("user_blocks")
    .select("blocked_id")
    .eq("blocker_id", userId);

  if (error) return new Set();
  return new Set(((data ?? []) as { blocked_id: string }[]).map((r) => r.blocked_id));
}
