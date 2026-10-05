-- =============================================================================
-- Wryto Backend Setup SQL
-- Run this entire file in the Supabase SQL Editor (once).
-- Safe to re-run: uses IF NOT EXISTS and CREATE OR REPLACE throughout.
-- =============================================================================


-- =============================================================================
-- 0. EXTENSIONS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- fuzzy / trigram search
CREATE EXTENSION IF NOT EXISTS "unaccent";  -- accent-insensitive search


-- =============================================================================
-- 1. USER SETTINGS (language preference + all other prefs)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id       uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  language      text        NOT NULL DEFAULT 'en',
  theme         text        NOT NULL DEFAULT 'dark',
  font_size     text        NOT NULL DEFAULT 'medium',
  reading_mode  boolean     NOT NULL DEFAULT false,
  is_private    boolean     NOT NULL DEFAULT false,
  who_can_follow text       NOT NULL DEFAULT 'everyone',
  who_can_comment text      NOT NULL DEFAULT 'everyone',
  notify_all    boolean     NOT NULL DEFAULT true,
  notify_likes  boolean     NOT NULL DEFAULT true,
  notify_comments boolean   NOT NULL DEFAULT true,
  notify_follows boolean    NOT NULL DEFAULT true,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Make sure the language column exists even if table was already created without it
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en';

-- RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_settings: owner select" ON public.user_settings;
CREATE POLICY "user_settings: owner select"
  ON public.user_settings FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_settings: owner insert" ON public.user_settings;
CREATE POLICY "user_settings: owner insert"
  ON public.user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_settings: owner update" ON public.user_settings;
CREATE POLICY "user_settings: owner update"
  ON public.user_settings FOR UPDATE
  USING (auth.uid() = user_id);


-- =============================================================================
-- 2. REPORTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.reports (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  post_id         uuid        REFERENCES public.posts(id) ON DELETE SET NULL,
  target_user_id  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  reason          text        NOT NULL,
  details         text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Authenticated users can file a report
DROP POLICY IF EXISTS "reports: authenticated insert" ON public.reports;
CREATE POLICY "reports: authenticated insert"
  ON public.reports FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = reporter_id);

-- Only admins (service role) can read reports — regular users cannot enumerate them
-- No SELECT policy added here intentionally.


-- =============================================================================
-- 3. USER BLOCKS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.user_blocks (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id  uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id  uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS user_blocks_blocker_idx ON public.user_blocks (blocker_id);
CREATE INDEX IF NOT EXISTS user_blocks_blocked_idx ON public.user_blocks (blocked_id);

-- RLS
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_blocks: owner select" ON public.user_blocks;
CREATE POLICY "user_blocks: owner select"
  ON public.user_blocks FOR SELECT
  USING (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "user_blocks: owner insert" ON public.user_blocks;
CREATE POLICY "user_blocks: owner insert"
  ON public.user_blocks FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "user_blocks: owner delete" ON public.user_blocks;
CREATE POLICY "user_blocks: owner delete"
  ON public.user_blocks FOR DELETE
  USING (auth.uid() = blocker_id);


-- =============================================================================
-- 4. NOTIFICATIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  kind         text        NOT NULL CHECK (kind IN ('like', 'comment', 'follow')),
  post_id      uuid        REFERENCES public.posts(id) ON DELETE CASCADE,
  is_read      boolean     NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_recipient_idx ON public.notifications (recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_actor_idx     ON public.notifications (actor_id);

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications: owner select" ON public.notifications;
CREATE POLICY "notifications: owner select"
  ON public.notifications FOR SELECT
  USING (auth.uid() = recipient_id);

DROP POLICY IF EXISTS "notifications: owner update (mark read)" ON public.notifications;
CREATE POLICY "notifications: owner update (mark read)"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = recipient_id);

-- System/triggers insert notifications; authenticated users should not insert directly
-- (triggers run as security definer so they can bypass RLS)


-- =============================================================================
-- 5. SECURITY-DEFINER HELPERS (referenced in AGENTS.md)
-- =============================================================================

-- can_view_author(author_id) → true unless the viewer has blocked or been blocked
CREATE OR REPLACE FUNCTION public.can_view_author(author_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE (blocker_id = auth.uid() AND blocked_id = author_id)
       OR (blocker_id = author_id   AND blocked_id = auth.uid())
  );
$$;

-- can_follow(target_id) → true if not blocked and target account allows it
CREATE OR REPLACE FUNCTION public.can_follow(target_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT
    NOT EXISTS (
      SELECT 1 FROM public.user_blocks
      WHERE (blocker_id = auth.uid() AND blocked_id = target_id)
         OR (blocker_id = target_id   AND blocked_id = auth.uid())
    )
    AND
    (
      -- target has no settings row → default is 'everyone'
      NOT EXISTS (SELECT 1 FROM public.user_settings WHERE user_id = target_id)
      OR
      (SELECT who_can_follow FROM public.user_settings WHERE user_id = target_id) = 'everyone'
    );
$$;

-- can_comment(post_author_id) → true if not blocked and author allows comments
CREATE OR REPLACE FUNCTION public.can_comment(post_author_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT
    NOT EXISTS (
      SELECT 1 FROM public.user_blocks
      WHERE (blocker_id = auth.uid() AND blocked_id = post_author_id)
         OR (blocker_id = post_author_id AND blocked_id = auth.uid())
    )
    AND
    (
      NOT EXISTS (SELECT 1 FROM public.user_settings WHERE user_id = post_author_id)
      OR
      (SELECT who_can_comment FROM public.user_settings WHERE user_id = post_author_id) = 'everyone'
    );
$$;


-- =============================================================================
-- 6. FULL-TEXT SEARCH INDEXES
-- =============================================================================

-- Profiles — search by handle, display_name, bio
CREATE INDEX IF NOT EXISTS profiles_handle_trgm_idx
  ON public.profiles USING gin (handle gin_trgm_ops);

CREATE INDEX IF NOT EXISTS profiles_display_name_trgm_idx
  ON public.profiles USING gin (display_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS profiles_bio_trgm_idx
  ON public.profiles USING gin (bio gin_trgm_ops);

-- Posts — search by title and body
CREATE INDEX IF NOT EXISTS posts_title_trgm_idx
  ON public.posts USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS posts_body_trgm_idx
  ON public.posts USING gin (body gin_trgm_ops);


-- =============================================================================
-- 7. NOTIFICATION TRIGGER FUNCTIONS
-- =============================================================================

-- Helper: insert a notification, silently skipping if actor = recipient
CREATE OR REPLACE FUNCTION public.create_notification(
  p_recipient_id uuid,
  p_actor_id     uuid,
  p_kind         text,
  p_post_id      uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Do not notify yourself
  IF p_recipient_id = p_actor_id THEN
    RETURN;
  END IF;

  -- Check recipient wants this notification kind
  IF EXISTS (
    SELECT 1 FROM public.user_settings
    WHERE user_id = p_recipient_id
      AND (
        (p_kind = 'like'    AND notify_likes    = false) OR
        (p_kind = 'comment' AND notify_comments = false) OR
        (p_kind = 'follow'  AND notify_follows  = false)
      )
  ) THEN
    RETURN;
  END IF;

  INSERT INTO public.notifications (recipient_id, actor_id, kind, post_id)
  VALUES (p_recipient_id, p_actor_id, p_kind, p_post_id);
END;
$$;


-- Trigger: likes → notify post author
CREATE OR REPLACE FUNCTION public.trg_notify_on_like()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_author_id uuid;
BEGIN
  SELECT author_id INTO v_author_id FROM public.posts WHERE id = NEW.post_id;
  IF v_author_id IS NOT NULL THEN
    PERFORM public.create_notification(v_author_id, NEW.user_id, 'like', NEW.post_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_like ON public.likes;
CREATE TRIGGER trg_notify_on_like
  AFTER INSERT ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_on_like();


-- Trigger: comments → notify post author
CREATE OR REPLACE FUNCTION public.trg_notify_on_comment()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_author_id uuid;
BEGIN
  SELECT author_id INTO v_author_id FROM public.posts WHERE id = NEW.post_id;
  IF v_author_id IS NOT NULL THEN
    PERFORM public.create_notification(v_author_id, NEW.author_id, 'comment', NEW.post_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_comment ON public.comments;
CREATE TRIGGER trg_notify_on_comment
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_on_comment();


-- Trigger: followers → notify the followed user
CREATE OR REPLACE FUNCTION public.trg_notify_on_follow()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.create_notification(NEW.following_id, NEW.follower_id, 'follow');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_follow ON public.followers;
CREATE TRIGGER trg_notify_on_follow
  AFTER INSERT ON public.followers
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_on_follow();


-- =============================================================================
-- 8. AUTO-CREATE PROFILE ON SIGNUP
-- =============================================================================

CREATE OR REPLACE FUNCTION public.trg_on_auth_user_created()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_handle      text;
  v_display     text;
  v_avatar      text;
  v_base_handle text;
  v_suffix      int := 0;
BEGIN
  -- Derive handle from email or provider metadata
  v_display := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1),
    'writer'
  );

  v_base_handle := lower(regexp_replace(
    COALESCE(NEW.raw_user_meta_data->>'preferred_username', split_part(NEW.email, '@', 1), 'writer'),
    '[^a-z0-9_]', '_', 'g'
  ));

  v_handle := v_base_handle;

  -- Ensure handle is unique
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE handle = v_handle) LOOP
    v_suffix  := v_suffix + 1;
    v_handle  := v_base_handle || '_' || v_suffix;
  END LOOP;

  v_avatar := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture'
  );

  INSERT INTO public.profiles (id, handle, username, display_name, avatar_url, profile_image, created_at, updated_at)
  VALUES (NEW.id, v_handle, v_handle, v_display, v_avatar, v_avatar, now(), now())
  ON CONFLICT (id) DO NOTHING;

  -- Seed default user_settings
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.trg_on_auth_user_created();


-- =============================================================================
-- 9. REALTIME
-- =============================================================================

-- Enable realtime for notifications (users see new pings instantly)
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Optional: also enable realtime for posts, likes, comments (for live feed)
-- (Uncomment if not already enabled)
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.likes;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;


-- =============================================================================
-- 10. RLS ON EXISTING TABLES (profiles, posts, likes, comments, followers)
--     Only adds policies if they don't conflict with existing ones.
-- =============================================================================

-- PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles: public read" ON public.profiles;
CREATE POLICY "profiles: public read"
  ON public.profiles FOR SELECT
  USING (public.can_view_author(id) OR auth.uid() = id);

DROP POLICY IF EXISTS "profiles: owner update" ON public.profiles;
CREATE POLICY "profiles: owner update"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles: owner insert" ON public.profiles;
CREATE POLICY "profiles: owner insert"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- POSTS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "posts: public read" ON public.posts;
CREATE POLICY "posts: public read"
  ON public.posts FOR SELECT
  USING (public.can_view_author(author_id) OR auth.uid() = author_id);

DROP POLICY IF EXISTS "posts: authenticated create" ON public.posts;
CREATE POLICY "posts: authenticated create"
  ON public.posts FOR INSERT
  WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "posts: owner update" ON public.posts;
CREATE POLICY "posts: owner update"
  ON public.posts FOR UPDATE
  USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "posts: owner delete" ON public.posts;
CREATE POLICY "posts: owner delete"
  ON public.posts FOR DELETE
  USING (auth.uid() = author_id);

-- LIKES
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "likes: public read" ON public.likes;
CREATE POLICY "likes: public read"
  ON public.likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "likes: authenticated insert" ON public.likes;
CREATE POLICY "likes: authenticated insert"
  ON public.likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "likes: owner delete" ON public.likes;
CREATE POLICY "likes: owner delete"
  ON public.likes FOR DELETE
  USING (auth.uid() = user_id);

-- COMMENTS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comments: public read" ON public.comments;
CREATE POLICY "comments: public read"
  ON public.comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "comments: authenticated insert" ON public.comments;
CREATE POLICY "comments: authenticated insert"
  ON public.comments FOR INSERT
  WITH CHECK (auth.uid() = author_id AND public.can_comment(
    (SELECT author_id FROM public.posts WHERE id = post_id)
  ));

DROP POLICY IF EXISTS "comments: owner delete" ON public.comments;
CREATE POLICY "comments: owner delete"
  ON public.comments FOR DELETE
  USING (auth.uid() = author_id);

-- FOLLOWERS
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "followers: public read" ON public.followers;
CREATE POLICY "followers: public read"
  ON public.followers FOR SELECT USING (true);

DROP POLICY IF EXISTS "followers: authenticated insert" ON public.followers;
CREATE POLICY "followers: authenticated insert"
  ON public.followers FOR INSERT
  WITH CHECK (auth.uid() = follower_id AND public.can_follow(following_id));

DROP POLICY IF EXISTS "followers: owner delete" ON public.followers;
CREATE POLICY "followers: owner delete"
  ON public.followers FOR DELETE
  USING (auth.uid() = follower_id);


-- =============================================================================
-- Done! ✅
-- Tables created: user_settings, reports, user_blocks, notifications
-- Triggers:  trg_notify_on_like, trg_notify_on_comment, trg_notify_on_follow
--            trg_on_auth_user_created (auto profile + settings on signup)
-- Helpers:   can_view_author(), can_follow(), can_comment()
-- Indexes:   pg_trgm on profiles (handle, display_name, bio) and posts (title, body)
-- Realtime:  notifications table published
-- =============================================================================
