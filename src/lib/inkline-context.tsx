import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { POST_SELECT, toPost, toWriter, type Post, type Writer } from "./inkline-data";

type InklineContextValue = {
  posts: Post[];
  writers: Writer[];
  liked: Set<string>;
  followed: Set<string>;
  user: User | null;
  profile: Writer | null;
  loading: boolean;
  unreadCount: number;
  toggleLike: (id: string) => Promise<void>;
  toggleFollow: (handle: string) => Promise<boolean>;
  publishPost: (draft: { title?: string; body: string; tags: string[] }) => Promise<string | null>;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const InklineContext = createContext<InklineContextValue | null>(null);

export function InklineProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [writers, setWriters] = useState<Writer[]>([]);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [followed, setFollowed] = useState<Set<string>>(new Set());
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Writer | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const userId = session?.user?.id ?? null;
  const userIdRef = useRef<string | null>(null);
  userIdRef.current = userId;

  const loadPublic = useCallback(async () => {
    const [postsResult, writersResult] = await Promise.all([
      supabase
        .from("posts")
        .select(POST_SELECT)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("profiles")
        .select("id, handle, display_name, bio, location, avatar_url")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    setPosts(((postsResult.data ?? []) as never[]).map(toPost).filter(Boolean) as Post[]);
    setWriters(((writersResult.data ?? []) as never[]).map(toWriter));
  }, []);

  const loadPersonal = useCallback(async () => {
    const id = userIdRef.current;
    if (!id) {
      setLiked(new Set());
      setFollowed(new Set());
      setProfile(null);
      setUnreadCount(0);
      return;
    }
    const [likesResult, followsResult, profileResult, unreadResult] = await Promise.all([
      supabase.from("likes").select("post_id").eq("user_id", id),
      supabase
        .from("followers")
        .select("following:profiles!followers_following_id_fkey(handle)")
        .eq("follower_id", id),
      supabase
        .from("profiles")
        .select("id, handle, display_name, bio, location, avatar_url")
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", id)
        .eq("is_read", false),
    ]);
    setLiked(
      new Set(((likesResult.data ?? []) as { post_id: string }[]).map((row) => row.post_id)),
    );
    setFollowed(
      new Set(
        ((followsResult.data ?? []) as { following: { handle: string } | null }[])
          .map((row) => row.following?.handle)
          .filter(Boolean) as string[],
      ),
    );
    setProfile(profileResult.data ? toWriter(profileResult.data) : null);
    setUnreadCount(unreadResult.count ?? 0);
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([loadPublic(), loadPersonal()]);
  }, [loadPublic, loadPersonal]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    refresh().finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [refresh, userId]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void refresh();
      }, 250);
    };
    const channel = supabase
      .channel("inkline-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "likes" }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, schedule)
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  const value = useMemo<InklineContextValue>(
    () => ({
      posts,
      writers,
      liked,
      followed,
      user: session?.user ?? null,
      profile,
      loading,
      unreadCount,
      toggleLike: async (id) => {
        const me = userIdRef.current;
        if (!me) return;
        const isLiked = liked.has(id);
        setLiked((current) => {
          const next = new Set(current);
          if (isLiked) next.delete(id);
          else next.add(id);
          return next;
        });
        setPosts((current) =>
          current.map((post) =>
            post.id === id ? { ...post, likes: post.likes + (isLiked ? -1 : 1) } : post,
          ),
        );
        if (isLiked) await supabase.from("likes").delete().eq("user_id", me).eq("post_id", id);
        else await supabase.from("likes").insert({ user_id: me, post_id: id });
      },
      toggleFollow: async (handle) => {
        const me = userIdRef.current;
        if (!me) {
          toast.error("Sign in to follow writers.");
          return false;
        }
        let targetId = writers.find((writer) => writer.handle === handle)?.id;
        if (!targetId) {
          const { data } = await supabase
            .from("profiles")
            .select("id")
            .eq("handle", handle)
            .maybeSingle();
          targetId = data?.id;
        }
        if (!targetId) {
          toast.error("Couldn't find that writer.");
          return false;
        }
        if (targetId === me) {
          toast.error("You can't follow yourself.");
          return false;
        }
        const isFollowing = followed.has(handle);
        const flip = (add: boolean) =>
          setFollowed((current) => {
            const next = new Set(current);
            if (add) next.add(handle);
            else next.delete(handle);
            return next;
          });
        const announce = (delta: number) => {
          window.dispatchEvent(
            new CustomEvent("wryto-follow", { detail: { handle, delta, followerId: me } }),
          );
          window.dispatchEvent(
            new CustomEvent("inkline-follow", { detail: { handle, delta, followerId: me } }),
          );
        };
        flip(!isFollowing);
        announce(isFollowing ? -1 : 1);
        const { error } = isFollowing
          ? await supabase
              .from("followers")
              .delete()
              .eq("follower_id", me)
              .eq("following_id", targetId)
          : await supabase.from("followers").insert({ follower_id: me, following_id: targetId });
        if (error && error.code !== "23505") {
          flip(isFollowing);
          announce(isFollowing ? 1 : -1);
          toast.error(
            isFollowing
              ? "Couldn't unfollow. Please try again."
              : "Couldn't follow. Please try again.",
          );
          return false;
        }
        toast.success(isFollowing ? "Unfollowed successfully" : "Followed successfully");
        return true;
      },
      publishPost: async ({ title, body, tags }) => {
        const me = userIdRef.current;
        if (!me) return null;
        try {
          const trimmedTitle = title?.trim() ? title.trim() : null;
          // Dual-column compatibility: provide both body and content so whichever schema variation exists is satisfied
          const { data, error } = await supabase
            .from("posts")
            .insert({
              author_id: me,
              title: trimmedTitle,
              body,
              content: body,
              tags: tags || [],
            } as any)
            .select("id")
            .single();

          if (error) {
            console.error("publishPost primary error:", error);
            // Fallback retry without content column if column doesn't exist
            const retry = await supabase
              .from("posts")
              .insert({ author_id: me, title: trimmedTitle, body, tags: tags || [] })
              .select("id")
              .single();
            if (retry.error) {
              console.error("publishPost retry error:", retry.error);
              return null;
            }
            await refresh();
            return retry.data.id;
          }
          await refresh();
          return data.id;
        } catch (err) {
          console.error("publishPost unexpected exception:", err);
          return null;
        }
      },
      refresh,
      signOut: async () => {
        await supabase.auth.signOut();
        setSession(null);
      },
    }),
    [posts, writers, liked, followed, session, profile, loading, unreadCount, refresh],
  );

  return <InklineContext.Provider value={value}>{children}</InklineContext.Provider>;
}

export function useInkline() {
  const value = useContext(InklineContext);
  if (!value) throw new Error("useInkline must be used inside InklineProvider");
  return value;
}

export const useWryto = useInkline;
export const WrytoProvider = InklineProvider;
export const WrytoContext = InklineContext;
