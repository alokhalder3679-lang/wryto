-- =============================================================================
-- Wryto: Follow-Based Chat & Calling Restriction System
-- Enforces Instagram-style DM permission:
-- A user can send messages ONLY IF the receiver follows the sender.
-- Audio & Video calling is unlocked when both users follow each other (Mutual).
-- Safe to run in Supabase SQL Editor.
-- =============================================================================

-- =============================================================================
-- 1. FOLLOWERS TABLE & INDEXES
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.followers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id   uuid NOT NULL,
  following_id  uuid NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT followers_unique_pair UNIQUE (follower_id, following_id),
  CONSTRAINT followers_no_self CHECK (follower_id <> following_id)
);

-- Foreign keys to public.profiles
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

CREATE INDEX IF NOT EXISTS idx_followers_pair ON public.followers(follower_id, following_id);
CREATE INDEX IF NOT EXISTS idx_followers_follower ON public.followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_followers_following ON public.followers(following_id);

-- Enable RLS on followers
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "followers: anyone can read" ON public.followers;
CREATE POLICY "followers: anyone can read"
  ON public.followers FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "followers: auth user can follow" ON public.followers;
CREATE POLICY "followers: auth user can follow"
  ON public.followers FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "followers: auth user can unfollow" ON public.followers;
CREATE POLICY "followers: auth user can unfollow"
  ON public.followers FOR DELETE
  USING (auth.uid() = follower_id);


-- =============================================================================
-- 2. SECURITY DEFINER PERMISSION FUNCTIONS
-- =============================================================================

-- Does receiver follow sender? (or self-messaging)
-- Returns true ONLY if receiver follows sender (follower_id = receiver, following_id = sender)
CREATE OR REPLACE FUNCTION public.can_send_message(_sender_id uuid, _receiver_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT (_sender_id = _receiver_id) OR EXISTS (
    SELECT 1 FROM public.followers
    WHERE follower_id = _receiver_id
      AND following_id = _sender_id
  );
$$;

-- Does mutual follow exist between caller and receiver?
-- Audio & video calling requires both users to follow each other (or self-call)
CREATE OR REPLACE FUNCTION public.can_call_user(_caller_id uuid, _receiver_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
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
-- 3. TRIGGER-LEVEL ENFORCEMENT & CONVERSATION SYNC
-- =============================================================================

CREATE OR REPLACE FUNCTION public.trg_on_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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


-- =============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- MESSAGES
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages: sender insert" ON public.messages;
CREATE POLICY "messages: sender insert"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    public.can_send_message(sender_id, receiver_id)
  );

DROP POLICY IF EXISTS "messages: sender or receiver read" ON public.messages;
CREATE POLICY "messages: sender or receiver read"
  ON public.messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "messages: receiver mark seen" ON public.messages;
CREATE POLICY "messages: receiver mark seen"
  ON public.messages FOR UPDATE
  USING (auth.uid() = receiver_id OR auth.uid() = sender_id);

-- CONVERSATIONS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversations: participants read" ON public.conversations;
CREATE POLICY "conversations: participants read"
  ON public.conversations FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "conversations: participants insert" ON public.conversations;
CREATE POLICY "conversations: participants insert"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "conversations: participants update" ON public.conversations;
CREATE POLICY "conversations: participants update"
  ON public.conversations FOR UPDATE
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- CALLS
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "calls: caller insert" ON public.calls;
CREATE POLICY "calls: caller insert"
  ON public.calls FOR INSERT
  WITH CHECK (
    auth.uid() = caller_id AND
    public.can_call_user(caller_id, receiver_id)
  );

DROP POLICY IF EXISTS "calls: participants read" ON public.calls;
CREATE POLICY "calls: participants read"
  ON public.calls FOR SELECT
  USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "calls: participants update" ON public.calls;
CREATE POLICY "calls: participants update"
  ON public.calls FOR UPDATE
  USING (auth.uid() = caller_id OR auth.uid() = receiver_id);


-- =============================================================================
-- 5. CLEANUP DEMO / ORPHANED DATA
-- =============================================================================

-- Clean up any invalid or demo messages that do not belong to real registered profiles
DELETE FROM public.messages 
WHERE sender_id NOT IN (SELECT id FROM public.profiles)
   OR receiver_id NOT IN (SELECT id FROM public.profiles);

DELETE FROM public.conversations
WHERE user1_id NOT IN (SELECT id FROM public.profiles)
   OR user2_id NOT IN (SELECT id FROM public.profiles);


-- =============================================================================
-- 6. REALTIME PUBLICATION ENSURANCE
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

ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.calls REPLICA IDENTITY FULL;
