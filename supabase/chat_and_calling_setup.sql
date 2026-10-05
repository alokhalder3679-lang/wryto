-- =============================================================================
-- Wryto Real-Time Chat & Audio/Video Calling Backend Setup SQL
-- Run this script in your Supabase SQL Editor.
-- Safe to re-run: uses IF NOT EXISTS, DROP POLICY IF EXISTS, and CREATE OR REPLACE.
-- =============================================================================

-- =============================================================================
-- 1. ONLINE STATUS IN PROFILES
-- =============================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_online boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen  timestamptz NOT NULL DEFAULT now();

-- Helper function to update online status & last_seen
CREATE OR REPLACE FUNCTION public.update_user_presence(p_is_online boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET is_online = p_is_online,
      last_seen = now()
  WHERE id = auth.uid();
END;
$$;

-- =============================================================================
-- 2. FOLLOWERS TABLE & PERMISSION FUNCTIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.followers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT followers_unique_pair UNIQUE (follower_id, following_id),
  CONSTRAINT followers_no_self CHECK (follower_id <> following_id)
);

CREATE INDEX IF NOT EXISTS idx_followers_pair ON public.followers(follower_id, following_id);
CREATE INDEX IF NOT EXISTS idx_followers_follower ON public.followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_followers_following ON public.followers(following_id);

ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "followers: anyone can read" ON public.followers;
DROP POLICY IF EXISTS "followers_select" ON public.followers;
CREATE POLICY "followers_select" ON public.followers FOR SELECT USING (true);

DROP POLICY IF EXISTS "followers: auth user can follow" ON public.followers;
DROP POLICY IF EXISTS "followers_insert" ON public.followers;
CREATE POLICY "followers_insert" ON public.followers FOR INSERT WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "followers: auth user can unfollow" ON public.followers;
DROP POLICY IF EXISTS "followers_delete" ON public.followers;
CREATE POLICY "followers_delete" ON public.followers FOR DELETE USING (auth.uid() = follower_id);

-- Does receiver follow sender? (or self-messaging)
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

-- Does mutual follow exist? (Audio & video calling requires mutual follow)
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

-- =============================================================================
-- 3. CONVERSATIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.conversations (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user2_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_message text,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_conversation_pair UNIQUE (user1_id, user2_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_user1 ON public.conversations(user1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user2 ON public.conversations(user2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON public.conversations(updated_at DESC);

-- =============================================================================
-- 4. MESSAGES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.messages (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid        REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id       uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content         text        NOT NULL,
  is_seen         boolean     NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON public.messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at DESC);

-- =============================================================================
-- 5. CALLS TABLE (AUDIO / VIDEO CALLS)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.calls (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id   uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  call_type   text        NOT NULL CHECK (call_type IN ('audio', 'video')),
  status      text        NOT NULL CHECK (status IN ('ringing', 'accepted', 'rejected', 'ended')) DEFAULT 'ringing',
  created_at  timestamptz NOT NULL DEFAULT now(),
  ended_at    timestamptz
);

CREATE INDEX IF NOT EXISTS idx_calls_caller ON public.calls(caller_id);
CREATE INDEX IF NOT EXISTS idx_calls_receiver ON public.calls(receiver_id);
CREATE INDEX IF NOT EXISTS idx_calls_status ON public.calls(status);
CREATE INDEX IF NOT EXISTS idx_calls_created ON public.calls(created_at DESC);

-- =============================================================================
-- 6. AUTOMATIC CONVERSATION & NOTIFICATION TRIGGERS
-- =============================================================================

-- Automatically link/create conversation and notify receiver on new message
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

  -- Canonical pair ordering (smaller UUID is user1_id)
  IF NEW.sender_id < NEW.receiver_id THEN
    v_u1 := NEW.sender_id;
    v_u2 := NEW.receiver_id;
  ELSE
    v_u1 := NEW.receiver_id;
    v_u2 := NEW.sender_id;
  END IF;

  -- Ensure conversation row exists
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

  -- Insert notification for receiver (if notifications table exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'notifications'
  ) THEN
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

-- Notify receiver on incoming call
CREATE OR REPLACE FUNCTION public.trg_on_new_call()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'ringing' THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'notifications'
    ) THEN
      INSERT INTO public.notifications (recipient_id, actor_id, kind)
      VALUES (NEW.receiver_id, NEW.caller_id, 'call');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_call_created ON public.calls;
CREATE TRIGGER trg_call_created
  AFTER INSERT ON public.calls
  FOR EACH ROW EXECUTE FUNCTION public.trg_on_new_call();

-- =============================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- CONVERSATIONS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversations: participants read" ON public.conversations;
DROP POLICY IF EXISTS "conversations_select" ON public.conversations;
CREATE POLICY "conversations_select"
  ON public.conversations FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "conversations: participants insert" ON public.conversations;
DROP POLICY IF EXISTS "conversations_insert" ON public.conversations;
CREATE POLICY "conversations_insert"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "conversations: participants update" ON public.conversations;
DROP POLICY IF EXISTS "conversations_update" ON public.conversations;
CREATE POLICY "conversations_update"
  ON public.conversations FOR UPDATE
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- MESSAGES
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages: sender or receiver read" ON public.messages;
DROP POLICY IF EXISTS "messages_select" ON public.messages;
CREATE POLICY "messages_select"
  ON public.messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "messages: sender insert" ON public.messages;
DROP POLICY IF EXISTS "messages_insert" ON public.messages;
CREATE POLICY "messages_insert"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    public.can_send_message(sender_id, receiver_id)
  );

DROP POLICY IF EXISTS "messages: receiver mark seen" ON public.messages;
DROP POLICY IF EXISTS "messages_update" ON public.messages;
CREATE POLICY "messages_update"
  ON public.messages FOR UPDATE
  USING (auth.uid() = receiver_id OR auth.uid() = sender_id);

-- CALLS
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "calls: participants read" ON public.calls;
DROP POLICY IF EXISTS "calls_select" ON public.calls;
CREATE POLICY "calls_select"
  ON public.calls FOR SELECT
  USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "calls: caller insert" ON public.calls;
DROP POLICY IF EXISTS "calls_insert" ON public.calls;
CREATE POLICY "calls_insert"
  ON public.calls FOR INSERT
  WITH CHECK (
    auth.uid() = caller_id AND
    public.can_call_user(caller_id, receiver_id)
  );

DROP POLICY IF EXISTS "calls: participants update" ON public.calls;
DROP POLICY IF EXISTS "calls_update" ON public.calls;
CREATE POLICY "calls_update"
  ON public.calls FOR UPDATE
  USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- =============================================================================
-- 8. ENABLE REALTIME REPLICATION (SAFE & IDEMPOTENT)
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'calls'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.calls;
  END IF;
END $$;

-- Set replica identity to full so update/delete payloads include entire row
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.calls REPLICA IDENTITY FULL;

-- =============================================================================
-- 9. CLEANUP DEMO / ORPHAN DATA
-- =============================================================================

DELETE FROM public.messages 
WHERE sender_id NOT IN (SELECT id FROM public.profiles)
   OR receiver_id NOT IN (SELECT id FROM public.profiles);

DELETE FROM public.conversations
WHERE user1_id NOT IN (SELECT id FROM public.profiles)
   OR user2_id NOT IN (SELECT id FROM public.profiles);
