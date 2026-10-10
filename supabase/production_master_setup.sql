-- =============================================================================
-- WRYTO PRODUCTION MASTER SETUP & OPTIMIZATION SCRIPT
-- =============================================================================
-- Architecture: Complete, production-grade schema, RLS, Realtime, Triggers,
--               RPC Functions, and Performance Indexes for Wryto.
-- Safety: Fully idempotent. Safe to copy-paste and run in Supabase SQL Editor.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. EXTENSIONS
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. PROFILES TABLE (Core User Entities)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  handle          text UNIQUE NOT NULL,
  username        text,
  display_name    text NOT NULL,
  bio             text,
  location        text,
  avatar_url      text,
  profile_image   text,
  followers_count integer NOT NULL DEFAULT 0,
  following_count integer NOT NULL DEFAULT 0,
  posts_count     integer NOT NULL DEFAULT 0,
  is_online       boolean NOT NULL DEFAULT false,
  last_seen       timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Ensure all columns exist if table was previously partially created
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_image text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS followers_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS following_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS posts_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_online boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- -----------------------------------------------------------------------------
-- 1.1 USER PRESENCE TABLE (Dedicated Realtime Online/Offline Status)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_presence (
  user_id    uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_online  boolean NOT NULL DEFAULT false,
  last_seen  timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_presence_select" ON public.user_presence;
CREATE POLICY "user_presence_select"
  ON public.user_presence FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "user_presence_upsert" ON public.user_presence;
CREATE POLICY "user_presence_upsert"
  ON public.user_presence FOR ALL
  TO authenticated, anon
  USING (auth.uid() IS NULL OR auth.uid() = user_id)
  WITH CHECK (auth.uid() IS NULL OR auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 2. USER SETTINGS TABLE (App Preferences & Privacy)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id         uuid PRIMARY KEY,
  language        text NOT NULL DEFAULT 'en',
  theme           text NOT NULL DEFAULT 'system',
  font_size       text NOT NULL DEFAULT 'medium',
  reading_mode    boolean NOT NULL DEFAULT false,
  is_private      boolean NOT NULL DEFAULT false,
  who_can_follow  text NOT NULL DEFAULT 'everyone',
  who_can_comment text NOT NULL DEFAULT 'everyone',
  notify_all      boolean NOT NULL DEFAULT true,
  notify_likes    boolean NOT NULL DEFAULT true,
  notify_comments boolean NOT NULL DEFAULT true,
  notify_follows  boolean NOT NULL DEFAULT true,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Ensure foreign key constraint explicitly named user_settings_user_id_fkey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_settings_user_id_fkey' AND table_name = 'user_settings'
  ) THEN
    ALTER TABLE public.user_settings 
      ADD CONSTRAINT user_settings_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3. USER BLOCKS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_blocks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id  uuid NOT NULL,
  blocked_id  uuid NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_blocks_unique UNIQUE (blocker_id, blocked_id),
  CONSTRAINT user_blocks_no_self CHECK (blocker_id <> blocked_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_blocks_blocker_id_fkey' AND table_name = 'user_blocks'
  ) THEN
    ALTER TABLE public.user_blocks 
      ADD CONSTRAINT user_blocks_blocker_id_fkey 
      FOREIGN KEY (blocker_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_blocks_blocked_id_fkey' AND table_name = 'user_blocks'
  ) THEN
    ALTER TABLE public.user_blocks 
      ADD CONSTRAINT user_blocks_blocked_id_fkey 
      FOREIGN KEY (blocked_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 4. POSTS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.posts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id   uuid NOT NULL,
  title       text,
  body        text NOT NULL,
  tags        text[] NOT NULL DEFAULT '{}'::text[],
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'posts_author_id_fkey' AND table_name = 'posts'
  ) THEN
    ALTER TABLE public.posts 
      ADD CONSTRAINT posts_author_id_fkey 
      FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 5. COMMENTS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     uuid NOT NULL,
  author_id   uuid NOT NULL,
  body        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'comments_post_id_fkey' AND table_name = 'comments'
  ) THEN
    ALTER TABLE public.comments 
      ADD CONSTRAINT comments_post_id_fkey 
      FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'comments_author_id_fkey' AND table_name = 'comments'
  ) THEN
    ALTER TABLE public.comments 
      ADD CONSTRAINT comments_author_id_fkey 
      FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 6. LIKES TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.likes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     uuid NOT NULL,
  user_id     uuid NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT likes_post_user_unique UNIQUE (post_id, user_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'likes_post_id_fkey' AND table_name = 'likes'
  ) THEN
    ALTER TABLE public.likes 
      ADD CONSTRAINT likes_post_id_fkey 
      FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'likes_user_id_fkey' AND table_name = 'likes'
  ) THEN
    ALTER TABLE public.likes 
      ADD CONSTRAINT likes_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 7. FOLLOWERS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.followers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id   uuid NOT NULL,
  following_id  uuid NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT followers_unique_pair UNIQUE (follower_id, following_id),
  CONSTRAINT followers_no_self CHECK (follower_id <> following_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'followers_follower_id_fkey' AND table_name = 'followers'
  ) THEN
    ALTER TABLE public.followers 
      ADD CONSTRAINT followers_follower_id_fkey 
      FOREIGN KEY (follower_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'followers_following_id_fkey' AND table_name = 'followers'
  ) THEN
    ALTER TABLE public.followers 
      ADD CONSTRAINT followers_following_id_fkey 
      FOREIGN KEY (following_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 8. NOTIFICATIONS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id  uuid NOT NULL,
  actor_id      uuid,
  kind          text NOT NULL,
  post_id       uuid,
  comment_id    uuid,
  is_read       boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Ensure kind constraint covers all events
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_kind_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_kind_check 
  CHECK (kind IN ('like', 'comment', 'follow', 'message', 'call'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'notifications_recipient_id_fkey' AND table_name = 'notifications'
  ) THEN
    ALTER TABLE public.notifications 
      ADD CONSTRAINT notifications_recipient_id_fkey 
      FOREIGN KEY (recipient_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'notifications_actor_id_fkey' AND table_name = 'notifications'
  ) THEN
    ALTER TABLE public.notifications 
      ADD CONSTRAINT notifications_actor_id_fkey 
      FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'notifications_post_id_fkey' AND table_name = 'notifications'
  ) THEN
    ALTER TABLE public.notifications 
      ADD CONSTRAINT notifications_post_id_fkey 
      FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'notifications_comment_id_fkey' AND table_name = 'notifications'
  ) THEN
    ALTER TABLE public.notifications 
      ADD CONSTRAINT notifications_comment_id_fkey 
      FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON DELETE CASCADE;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 9. CONVERSATIONS TABLE (1-on-1 Chat Threads)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id      uuid NOT NULL,
  user2_id      uuid NOT NULL,
  last_message  text,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT conversations_canonical_order CHECK (user1_id < user2_id),
  CONSTRAINT conversations_pair_unique UNIQUE (user1_id, user2_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'conversations_user1_id_fkey' AND table_name = 'conversations'
  ) THEN
    ALTER TABLE public.conversations 
      ADD CONSTRAINT conversations_user1_id_fkey 
      FOREIGN KEY (user1_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'conversations_user2_id_fkey' AND table_name = 'conversations'
  ) THEN
    ALTER TABLE public.conversations 
      ADD CONSTRAINT conversations_user2_id_fkey 
      FOREIGN KEY (user2_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 10. MESSAGES TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid,
  sender_id       uuid NOT NULL,
  receiver_id     uuid NOT NULL,
  content         text NOT NULL,
  is_seen         boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'messages_conversation_id_fkey' AND table_name = 'messages'
  ) THEN
    ALTER TABLE public.messages 
      ADD CONSTRAINT messages_conversation_id_fkey 
      FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'messages_sender_id_fkey' AND table_name = 'messages'
  ) THEN
    ALTER TABLE public.messages 
      ADD CONSTRAINT messages_sender_id_fkey 
      FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'messages_receiver_id_fkey' AND table_name = 'messages'
  ) THEN
    ALTER TABLE public.messages 
      ADD CONSTRAINT messages_receiver_id_fkey 
      FOREIGN KEY (receiver_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 11. CALLS TABLE (WebRTC Signaling Registry)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.calls (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id   uuid NOT NULL,
  receiver_id uuid NOT NULL,
  call_type   text NOT NULL CHECK (call_type IN ('audio', 'video')),
  status      text NOT NULL CHECK (status IN ('ringing', 'accepted', 'rejected', 'ended')) DEFAULT 'ringing',
  created_at  timestamptz NOT NULL DEFAULT now(),
  ended_at    timestamptz
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'calls_caller_id_fkey' AND table_name = 'calls'
  ) THEN
    ALTER TABLE public.calls 
      ADD CONSTRAINT calls_caller_id_fkey 
      FOREIGN KEY (caller_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'calls_receiver_id_fkey' AND table_name = 'calls'
  ) THEN
    ALTER TABLE public.calls 
      ADD CONSTRAINT calls_receiver_id_fkey 
      FOREIGN KEY (receiver_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 12. REPORTS TABLE (Moderation)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reports (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id     uuid,
  post_id         uuid,
  target_user_id  uuid,
  reason          text NOT NULL,
  details         text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'reports_reporter_id_fkey' AND table_name = 'reports'
  ) THEN
    ALTER TABLE public.reports 
      ADD CONSTRAINT reports_reporter_id_fkey 
      FOREIGN KEY (reporter_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'reports_post_id_fkey' AND table_name = 'reports'
  ) THEN
    ALTER TABLE public.reports 
      ADD CONSTRAINT reports_post_id_fkey 
      FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'reports_target_user_id_fkey' AND table_name = 'reports'
  ) THEN
    ALTER TABLE public.reports 
      ADD CONSTRAINT reports_target_user_id_fkey 
      FOREIGN KEY (target_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 13. PERFORMANCE INDEXES
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_profiles_handle_trgm ON public.profiles USING gin (handle gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_name_trgm ON public.profiles USING gin (display_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_bio_trgm ON public.profiles USING gin (bio gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_posts_author ON public.posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_created ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_title_trgm ON public.posts USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_posts_body_trgm ON public.posts USING gin (body gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_comments_post ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_author ON public.comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_created ON public.comments(created_at ASC);

CREATE INDEX IF NOT EXISTS idx_likes_post ON public.likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user ON public.likes(user_id);

CREATE INDEX IF NOT EXISTS idx_followers_follower ON public.followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_followers_following ON public.followers(following_id);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_actor ON public.notifications(actor_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(recipient_id) WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_conversations_user1 ON public.conversations(user1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user2 ON public.conversations(user2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON public.conversations(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON public.messages(conversation_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_calls_caller ON public.calls(caller_id);
CREATE INDEX IF NOT EXISTS idx_calls_receiver ON public.calls(receiver_id);
CREATE INDEX IF NOT EXISTS idx_calls_status ON public.calls(status);

-- -----------------------------------------------------------------------------
-- 14. SECURITY DEFINER HELPER FUNCTIONS
-- -----------------------------------------------------------------------------

-- Presence updater
CREATE OR REPLACE FUNCTION public.update_user_presence(p_is_online boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET is_online = p_is_online,
      last_seen = now()
  WHERE id = auth.uid();
END;
$$;

-- Dedicated User Presence Upsert RPC (called by client chat presence tracking)
CREATE OR REPLACE FUNCTION public.set_user_presence(
  p_user_id uuid,
  p_is_online boolean
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.user_presence (user_id, is_online, last_seen, updated_at)
  VALUES (
    p_user_id,
    p_is_online,
    now(),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE
  SET 
    is_online = EXCLUDED.is_online,
    last_seen = CASE WHEN EXCLUDED.is_online THEN public.user_presence.last_seen ELSE now() END,
    updated_at = now();

  UPDATE public.profiles
  SET 
    is_online = p_is_online,
    last_seen = now()
  WHERE id = p_user_id;
END;
$$;

-- Blocking check
CREATE OR REPLACE FUNCTION public.is_blocked_between(_a uuid, _b uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE (blocker_id = _a AND blocked_id = _b)
       OR (blocker_id = _b AND blocked_id = _a)
  );
$$;

-- Privacy author visibility check
CREATE OR REPLACE FUNCTION public.can_view_author(_author uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public
AS $$
DECLARE
  v_viewer uuid := auth.uid();
  v_is_private boolean;
BEGIN
  IF v_viewer IS NOT NULL AND v_viewer = _author THEN
    RETURN true;
  END IF;

  IF v_viewer IS NOT NULL AND public.is_blocked_between(v_viewer, _author) THEN
    RETURN false;
  END IF;

  SELECT is_private INTO v_is_private FROM public.user_settings WHERE user_id = _author;
  IF v_is_private IS TRUE THEN
    IF v_viewer IS NULL THEN
      RETURN false;
    END IF;
    RETURN EXISTS (
      SELECT 1 FROM public.followers 
      WHERE follower_id = v_viewer AND following_id = _author
    );
  END IF;

  RETURN true;
END;
$$;

-- Follow permission check
CREATE OR REPLACE FUNCTION public.can_follow(_target uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public
AS $$
DECLARE
  v_viewer uuid := auth.uid();
  v_who text;
BEGIN
  IF v_viewer IS NULL OR v_viewer = _target THEN
    RETURN false;
  END IF;

  IF public.is_blocked_between(v_viewer, _target) THEN
    RETURN false;
  END IF;

  SELECT who_can_follow INTO v_who FROM public.user_settings WHERE user_id = _target;
  IF v_who = 'nobody' THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

-- Comment permission check
CREATE OR REPLACE FUNCTION public.can_comment(_post uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public
AS $$
DECLARE
  v_viewer uuid := auth.uid();
  v_author uuid;
  v_who text;
BEGIN
  IF v_viewer IS NULL THEN
    RETURN false;
  END IF;

  SELECT author_id INTO v_author FROM public.posts WHERE id = _post;
  IF v_author IS NULL THEN
    RETURN false;
  END IF;

  IF v_viewer = v_author THEN
    RETURN true;
  END IF;

  IF public.is_blocked_between(v_viewer, v_author) THEN
    RETURN false;
  END IF;

  SELECT who_can_comment INTO v_who FROM public.user_settings WHERE user_id = v_author;
  IF v_who = 'nobody' THEN
    RETURN false;
  END IF;

  IF v_who = 'followers' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.followers 
      WHERE follower_id = v_viewer AND following_id = v_author
    );
  END IF;

  RETURN true;
END;
$$;

-- Chat message permission check (Receiver must follow sender)
CREATE OR REPLACE FUNCTION public.can_send_message(_sender_id uuid, _receiver_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT (_sender_id = _receiver_id) OR EXISTS (
    SELECT 1 FROM public.followers
    WHERE follower_id = _receiver_id
      AND following_id = _sender_id
  );
$$;

-- Call permission check (Mutual follow required)
CREATE OR REPLACE FUNCTION public.can_call_user(_caller_id uuid, _receiver_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT (_caller_id = _receiver_id) OR (
    EXISTS (
      SELECT 1 FROM public.followers
      WHERE follower_id = _receiver_id AND following_id = _caller_id
    )
    AND
    EXISTS (
      SELECT 1 FROM public.followers
      WHERE follower_id = _caller_id AND following_id = _receiver_id
    )
  );
$$;

-- Notification preference checker
CREATE OR REPLACE FUNCTION public.wants_notification(_kind text, _user uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public
AS $$
DECLARE
  v_settings public.user_settings%ROWTYPE;
BEGIN
  SELECT * INTO v_settings FROM public.user_settings WHERE user_id = _user;
  IF NOT FOUND THEN
    RETURN true;
  END IF;

  IF NOT v_settings.notify_all THEN
    RETURN false;
  END IF;

  IF _kind = 'like' AND NOT v_settings.notify_likes THEN
    RETURN false;
  END IF;

  IF _kind = 'comment' AND NOT v_settings.notify_comments THEN
    RETURN false;
  END IF;

  IF _kind = 'follow' AND NOT v_settings.notify_follows THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

-- Following feed RPC
CREATE OR REPLACE FUNCTION public.following_feed(_limit int DEFAULT 50, _before timestamptz DEFAULT NULL)
RETURNS SETOF public.posts
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT p.*
  FROM public.posts p
  JOIN public.followers f ON f.following_id = p.author_id
  WHERE f.follower_id = auth.uid()
    AND (_before IS NULL OR p.created_at < _before)
    AND public.can_view_author(p.author_id)
  ORDER BY p.created_at DESC
  LIMIT LEAST(_limit, 100);
$$;

-- Mutual followers RPC
CREATE OR REPLACE FUNCTION public.mutual_followers(_target uuid, _limit int DEFAULT 3)
RETURNS TABLE (
  id uuid,
  handle text,
  display_name text,
  total bigint
)
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public
AS $$
DECLARE
  v_me uuid := auth.uid();
  v_total bigint;
BEGIN
  IF v_me IS NULL OR v_me = _target THEN
    RETURN;
  END IF;

  SELECT COUNT(DISTINCT f1.following_id) INTO v_total
  FROM public.followers f1
  JOIN public.followers f2 ON f2.follower_id = f1.following_id
  WHERE f1.follower_id = v_me
    AND f2.following_id = _target;

  IF v_total = 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    pr.id,
    pr.handle,
    pr.display_name,
    v_total AS total
  FROM public.followers f1
  JOIN public.followers f2 ON f2.follower_id = f1.following_id
  JOIN public.profiles pr ON pr.id = f1.following_id
  WHERE f1.follower_id = v_me
    AND f2.following_id = _target
  LIMIT _limit;
END;
$$;

-- Public privacy query RPC
CREATE OR REPLACE FUNCTION public.public_privacy(_user uuid)
RETURNS TABLE (
  is_private boolean,
  who_can_comment text,
  who_can_follow text
)
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT 
    COALESCE(s.is_private, false),
    COALESCE(s.who_can_comment, 'everyone'),
    COALESCE(s.who_can_follow, 'everyone')
  FROM (SELECT 1) _
  LEFT JOIN public.user_settings s ON s.user_id = _user;
$$;

-- -----------------------------------------------------------------------------
-- 15. AUTOMATION TRIGGERS
-- -----------------------------------------------------------------------------

-- Trigger A: Signup automation (Profile + Settings)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_handle      text;
  v_display     text;
  v_avatar      text;
  v_base_handle text;
  v_suffix      int := 0;
BEGIN
  v_display := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1),
    'writer'
  );

  v_base_handle := lower(regexp_replace(
    COALESCE(
      NEW.raw_user_meta_data->>'handle',
      NEW.raw_user_meta_data->>'preferred_username',
      split_part(NEW.email, '@', 1),
      'writer'
    ),
    '[^a-z0-9_]', '_', 'g'
  ));

  IF length(v_base_handle) < 2 THEN
    v_base_handle := 'writer_' || substr(NEW.id::text, 1, 6);
  END IF;

  v_handle := v_base_handle;

  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE handle = v_handle AND id <> NEW.id) LOOP
    v_suffix := v_suffix + 1;
    v_handle := v_base_handle || '_' || v_suffix;
  END LOOP;

  v_avatar := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture',
    NEW.raw_user_meta_data->>'profile_image'
  );

  INSERT INTO public.profiles (
    id, handle, username, display_name, avatar_url, profile_image, created_at, updated_at
  )
  VALUES (
    NEW.id, v_handle, v_handle, v_display, v_avatar, v_avatar, now(), now()
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = COALESCE(public.profiles.display_name, EXCLUDED.display_name),
    avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
    profile_image = COALESCE(public.profiles.profile_image, EXCLUDED.profile_image),
    updated_at = now();

  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user error for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger B: Messages (Auto-creates/updates conversations & notifies)
CREATE OR REPLACE FUNCTION public.trg_on_new_message()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv_id uuid := NEW.conversation_id;
  v_u1 uuid;
  v_u2 uuid;
BEGIN
  -- Strict Check: Does receiver follow sender?
  IF NOT public.can_send_message(NEW.sender_id, NEW.receiver_id) THEN
    RAISE EXCEPTION 'User must follow you to chat';
  END IF;

  IF NEW.sender_id < NEW.receiver_id THEN
    v_u1 := NEW.sender_id;
    v_u2 := NEW.receiver_id;
  ELSE
    v_u1 := NEW.receiver_id;
    v_u2 := NEW.sender_id;
  END IF;

  IF v_conv_id IS NULL THEN
    INSERT INTO public.conversations (user1_id, user2_id, last_message, updated_at)
    VALUES (v_u1, v_u2, NEW.content, NEW.created_at)
    ON CONFLICT (user1_id, user2_id)
    DO UPDATE SET 
      last_message = EXCLUDED.last_message,
      updated_at = EXCLUDED.updated_at
    RETURNING id INTO v_conv_id;

    NEW.conversation_id := v_conv_id;
  ELSE
    UPDATE public.conversations
    SET last_message = NEW.content,
        updated_at = NEW.created_at
    WHERE id = v_conv_id;
  END IF;

  IF public.wants_notification('message', NEW.receiver_id) THEN
    INSERT INTO public.notifications (recipient_id, actor_id, kind)
    VALUES (NEW.receiver_id, NEW.sender_id, 'message');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_message_created ON public.messages;
CREATE TRIGGER trg_message_created
  BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.trg_on_new_message();

-- Trigger C: Calls (Notifies recipient of incoming call)
CREATE OR REPLACE FUNCTION public.trg_on_new_call()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'ringing' AND public.wants_notification('call', NEW.receiver_id) THEN
    INSERT INTO public.notifications (recipient_id, actor_id, kind)
    VALUES (NEW.receiver_id, NEW.caller_id, 'call');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_call_created ON public.calls;
CREATE TRIGGER trg_call_created
  AFTER INSERT ON public.calls
  FOR EACH ROW EXECUTE FUNCTION public.trg_on_new_call();

-- Trigger D: Post Counter on Profiles
CREATE OR REPLACE FUNCTION public.trg_update_posts_count()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles SET posts_count = posts_count + 1 WHERE id = NEW.author_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles SET posts_count = GREATEST(posts_count - 1, 0) WHERE id = OLD.author_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_posts_count ON public.posts;
CREATE TRIGGER trg_posts_count
  AFTER INSERT OR DELETE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.trg_update_posts_count();

-- Trigger E: Followers Counter on Profiles
CREATE OR REPLACE FUNCTION public.trg_update_followers_count()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    UPDATE public.profiles SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles SET following_count = GREATEST(following_count - 1, 0) WHERE id = OLD.follower_id;
    UPDATE public.profiles SET followers_count = GREATEST(followers_count - 1, 0) WHERE id = OLD.following_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_followers_count ON public.followers;
CREATE TRIGGER trg_followers_count
  AFTER INSERT OR DELETE ON public.followers
  FOR EACH ROW EXECUTE FUNCTION public.trg_update_followers_count();

-- Trigger F: Social Notifications (Likes, Comments, Follows)
CREATE OR REPLACE FUNCTION public.trg_notify_social()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipient uuid;
BEGIN
  IF TG_TABLE_NAME = 'likes' THEN
    SELECT author_id INTO v_recipient FROM public.posts WHERE id = NEW.post_id;
    IF v_recipient IS NOT NULL AND v_recipient <> NEW.user_id AND public.wants_notification('like', v_recipient) THEN
      INSERT INTO public.notifications (recipient_id, actor_id, kind, post_id)
      VALUES (v_recipient, NEW.user_id, 'like', NEW.post_id);
    END IF;
  ELSIF TG_TABLE_NAME = 'comments' THEN
    SELECT author_id INTO v_recipient FROM public.posts WHERE id = NEW.post_id;
    IF v_recipient IS NOT NULL AND v_recipient <> NEW.author_id AND public.wants_notification('comment', v_recipient) THEN
      INSERT INTO public.notifications (recipient_id, actor_id, kind, post_id, comment_id)
      VALUES (v_recipient, NEW.author_id, 'comment', NEW.post_id, NEW.id);
    END IF;
  ELSIF TG_TABLE_NAME = 'followers' THEN
    IF NEW.following_id <> NEW.follower_id AND public.wants_notification('follow', NEW.following_id) THEN
      INSERT INTO public.notifications (recipient_id, actor_id, kind)
      VALUES (NEW.following_id, NEW.follower_id, 'follow');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_likes ON public.likes;
CREATE TRIGGER trg_notify_likes
  AFTER INSERT ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_social();

DROP TRIGGER IF EXISTS trg_notify_comments ON public.comments;
CREATE TRIGGER trg_notify_comments
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_social();

DROP TRIGGER IF EXISTS trg_notify_followers ON public.followers;
CREATE TRIGGER trg_notify_followers
  AFTER INSERT ON public.followers
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_social();

-- -----------------------------------------------------------------------------
-- 16. ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- PROFILES
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT
  USING (public.can_view_author(id) OR auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- USER SETTINGS
DROP POLICY IF EXISTS "user_settings_select" ON public.user_settings;
CREATE POLICY "user_settings_select" ON public.user_settings FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_settings_insert" ON public.user_settings;
CREATE POLICY "user_settings_insert" ON public.user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_settings_update" ON public.user_settings;
CREATE POLICY "user_settings_update" ON public.user_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- USER BLOCKS
DROP POLICY IF EXISTS "user_blocks_select" ON public.user_blocks;
CREATE POLICY "user_blocks_select" ON public.user_blocks FOR SELECT
  USING (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "user_blocks_insert" ON public.user_blocks;
CREATE POLICY "user_blocks_insert" ON public.user_blocks FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "user_blocks_delete" ON public.user_blocks;
CREATE POLICY "user_blocks_delete" ON public.user_blocks FOR DELETE
  USING (auth.uid() = blocker_id);

-- POSTS
DROP POLICY IF EXISTS "posts_select" ON public.posts;
CREATE POLICY "posts_select" ON public.posts FOR SELECT
  USING (public.can_view_author(author_id) OR auth.uid() = author_id);

DROP POLICY IF EXISTS "posts_insert" ON public.posts;
CREATE POLICY "posts_insert" ON public.posts FOR INSERT
  WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "posts_update" ON public.posts;
CREATE POLICY "posts_update" ON public.posts FOR UPDATE
  USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "posts_delete" ON public.posts;
CREATE POLICY "posts_delete" ON public.posts FOR DELETE
  USING (auth.uid() = author_id);

-- COMMENTS
DROP POLICY IF EXISTS "comments_select" ON public.comments;
CREATE POLICY "comments_select" ON public.comments FOR SELECT
  USING (public.can_view_author(author_id));

DROP POLICY IF EXISTS "comments_insert" ON public.comments;
CREATE POLICY "comments_insert" ON public.comments FOR INSERT
  WITH CHECK (auth.uid() = author_id AND public.can_comment(post_id));

DROP POLICY IF EXISTS "comments_delete" ON public.comments;
CREATE POLICY "comments_delete" ON public.comments FOR DELETE
  USING (auth.uid() = author_id);

-- LIKES
DROP POLICY IF EXISTS "likes_select" ON public.likes;
CREATE POLICY "likes_select" ON public.likes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "likes_insert" ON public.likes;
CREATE POLICY "likes_insert" ON public.likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "likes_delete" ON public.likes;
CREATE POLICY "likes_delete" ON public.likes FOR DELETE
  USING (auth.uid() = user_id);

-- FOLLOWERS
DROP POLICY IF EXISTS "followers_select" ON public.followers;
CREATE POLICY "followers_select" ON public.followers FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "followers_insert" ON public.followers;
CREATE POLICY "followers_insert" ON public.followers FOR INSERT
  WITH CHECK (auth.uid() = follower_id AND public.can_follow(following_id));

DROP POLICY IF EXISTS "followers_delete" ON public.followers;
CREATE POLICY "followers_delete" ON public.followers FOR DELETE
  USING (auth.uid() = follower_id);

-- NOTIFICATIONS
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
CREATE POLICY "notifications_select" ON public.notifications FOR SELECT
  USING (auth.uid() = recipient_id);

DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE
  USING (auth.uid() = recipient_id);

-- CONVERSATIONS
DROP POLICY IF EXISTS "conversations_select" ON public.conversations;
CREATE POLICY "conversations_select" ON public.conversations FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "conversations_insert" ON public.conversations;
CREATE POLICY "conversations_insert" ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "conversations_update" ON public.conversations;
CREATE POLICY "conversations_update" ON public.conversations FOR UPDATE
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- MESSAGES
DROP POLICY IF EXISTS "messages_select" ON public.messages;
CREATE POLICY "messages_select" ON public.messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "messages_insert" ON public.messages;
CREATE POLICY "messages_insert" ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    public.can_send_message(sender_id, receiver_id)
  );

DROP POLICY IF EXISTS "messages_update" ON public.messages;
CREATE POLICY "messages_update" ON public.messages FOR UPDATE
  USING (auth.uid() = receiver_id OR auth.uid() = sender_id);

-- CALLS
DROP POLICY IF EXISTS "calls_select" ON public.calls;
CREATE POLICY "calls_select" ON public.calls FOR SELECT
  USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "calls_insert" ON public.calls;
CREATE POLICY "calls_insert" ON public.calls FOR INSERT
  WITH CHECK (
    auth.uid() = caller_id AND
    public.can_call_user(caller_id, receiver_id)
  );

DROP POLICY IF EXISTS "calls_update" ON public.calls;
CREATE POLICY "calls_update" ON public.calls FOR UPDATE
  USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- REPORTS
DROP POLICY IF EXISTS "reports_insert" ON public.reports;
CREATE POLICY "reports_insert" ON public.reports FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = reporter_id);

-- -----------------------------------------------------------------------------
-- 17. REALTIME PUBLICATION CONFIGURATION (Idempotent)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_table text;
  v_tables text[] := ARRAY['posts', 'likes', 'comments', 'notifications', 'conversations', 'messages', 'calls', 'user_presence'];
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = v_table
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', v_table);
    END IF;
  END LOOP;
END $$;

ALTER TABLE public.posts REPLICA IDENTITY FULL;
ALTER TABLE public.likes REPLICA IDENTITY FULL;
ALTER TABLE public.comments REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.calls REPLICA IDENTITY FULL;
ALTER TABLE public.user_presence REPLICA IDENTITY FULL;

-- -----------------------------------------------------------------------------
-- 18. STORAGE CONFIGURATION: PUBLIC AVATARS BUCKET & POLICIES
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public Access for Avatars" ON storage.objects;
CREATE POLICY "Public Access for Avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- -----------------------------------------------------------------------------
-- 19. INITIAL PROFILE BACKFILL & SYNCHRONIZATION
-- -----------------------------------------------------------------------------
UPDATE public.profiles p
SET posts_count = (SELECT COUNT(*) FROM public.posts WHERE author_id = p.id),
    followers_count = (SELECT COUNT(*) FROM public.followers WHERE following_id = p.id),
    following_count = (SELECT COUNT(*) FROM public.followers WHERE follower_id = p.id);

-- =============================================================================
-- ALL DONE! The Wryto Supabase backend is 100% production-ready.
-- =============================================================================
