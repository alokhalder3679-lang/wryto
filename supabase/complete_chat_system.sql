-- =============================================================================
-- WRYTO: Complete Production Chat & Realtime System Setup
-- Run this script in your Supabase SQL Editor.
-- Safe to re-run: fully idempotent, uses IF NOT EXISTS and DROP POLICY IF EXISTS.
-- =============================================================================

-- =============================================================================
-- 1. PROFILES & ONLINE STATUS
-- =============================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_online boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen  timestamptz NOT NULL DEFAULT now();

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
-- 2. CONVERSATIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.conversations (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id     uuid        NOT NULL,
  user2_id     uuid        NOT NULL,
  last_message text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT conversations_unique_pair UNIQUE (user1_id, user2_id)
);

ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS user1_id uuid;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS user2_id uuid;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS last_message text;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_conversations_user1 ON public.conversations(user1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user2 ON public.conversations(user2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON public.conversations(updated_at DESC);

-- =============================================================================
-- 3. MESSAGES TABLE & COLUMN COMPATIBILITY
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.messages (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid        REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id       uuid        NOT NULL,
  receiver_id     uuid        NOT NULL,
  content         text        NOT NULL,
  is_seen         boolean     NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  -- If table had recipient_id instead of receiver_id, rename it
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'recipient_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'receiver_id'
  ) THEN
    ALTER TABLE public.messages RENAME COLUMN recipient_id TO receiver_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'conversation_id') THEN
    ALTER TABLE public.messages ADD COLUMN conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'sender_id') THEN
    ALTER TABLE public.messages ADD COLUMN sender_id uuid;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'receiver_id') THEN
    ALTER TABLE public.messages ADD COLUMN receiver_id uuid;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'content') THEN
    ALTER TABLE public.messages ADD COLUMN content text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'is_seen') THEN
    ALTER TABLE public.messages ADD COLUMN is_seen boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'created_at') THEN
    ALTER TABLE public.messages ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON public.messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at DESC);

-- =============================================================================
-- 4. CORE CHAT LOGIC: AUTO-CONVERSATION CREATION TRIGGER
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_chat_message()
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
  -- Canonical pair ordering: smaller UUID is user1_id
  IF NEW.sender_id < NEW.receiver_id THEN
    v_u1 := NEW.sender_id;
    v_u2 := NEW.receiver_id;
  ELSE
    v_u1 := NEW.receiver_id;
    v_u2 := NEW.sender_id;
  END IF;

  -- 1. Ensure conversation exists
  IF v_conv_id IS NULL THEN
    SELECT id INTO v_conv_id
    FROM public.conversations
    WHERE user1_id = v_u1 AND user2_id = v_u2;

    IF v_conv_id IS NULL THEN
      INSERT INTO public.conversations (user1_id, user2_id, last_message, created_at, updated_at)
      VALUES (v_u1, v_u2, NEW.content, COALESCE(NEW.created_at, now()), COALESCE(NEW.created_at, now()))
      ON CONFLICT (user1_id, user2_id)
      DO UPDATE SET
        last_message = EXCLUDED.last_message,
        updated_at = EXCLUDED.updated_at
      RETURNING id INTO v_conv_id;
    ELSE
      UPDATE public.conversations
      SET last_message = NEW.content,
          updated_at = COALESCE(NEW.created_at, now())
      WHERE id = v_conv_id;
    END IF;

    NEW.conversation_id := v_conv_id;
  ELSE
    UPDATE public.conversations
    SET last_message = NEW.content,
        updated_at = COALESCE(NEW.created_at, now())
    WHERE id = v_conv_id;
  END IF;

  -- 2. Notify receiver if notifications table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'notifications'
  ) THEN
    INSERT INTO public.notifications (recipient_id, actor_id, kind)
    VALUES (NEW.receiver_id, NEW.sender_id, 'message')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_message_created ON public.messages;
CREATE TRIGGER trg_message_created
  BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_chat_message();

-- =============================================================================
-- 5. RPC FUNCTION: send_message (Atomic 1-call Message Sender)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.send_message(
  p_receiver_id uuid,
  p_content text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_id uuid := auth.uid();
  v_u1 uuid;
  v_u2 uuid;
  v_conv_id uuid;
  v_msg_id uuid;
  v_now timestamptz := now();
  v_result jsonb;
BEGIN
  IF v_sender_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_receiver_id IS NULL THEN
    RAISE EXCEPTION 'Receiver ID is required';
  END IF;

  IF trim(p_content) = '' THEN
    RAISE EXCEPTION 'Message content cannot be empty';
  END IF;

  -- Canonical pair ordering
  IF v_sender_id < p_receiver_id THEN
    v_u1 := v_sender_id;
    v_u2 := p_receiver_id;
  ELSE
    v_u1 := p_receiver_id;
    v_u2 := v_sender_id;
  END IF;

  -- Find or create conversation
  SELECT id INTO v_conv_id
  FROM public.conversations
  WHERE user1_id = v_u1 AND user2_id = v_u2;

  IF v_conv_id IS NULL THEN
    INSERT INTO public.conversations (user1_id, user2_id, last_message, created_at, updated_at)
    VALUES (v_u1, v_u2, p_content, v_now, v_now)
    ON CONFLICT (user1_id, user2_id)
    DO UPDATE SET last_message = EXCLUDED.last_message, updated_at = EXCLUDED.updated_at
    RETURNING id INTO v_conv_id;
  ELSE
    UPDATE public.conversations
    SET last_message = p_content, updated_at = v_now
    WHERE id = v_conv_id;
  END IF;

  -- Insert message
  INSERT INTO public.messages (conversation_id, sender_id, receiver_id, content, is_seen, created_at)
  VALUES (v_conv_id, v_sender_id, p_receiver_id, p_content, false, v_now)
  RETURNING id INTO v_msg_id;

  SELECT jsonb_build_object(
    'id', m.id,
    'conversation_id', m.conversation_id,
    'sender_id', m.sender_id,
    'receiver_id', m.receiver_id,
    'content', m.content,
    'is_seen', m.is_seen,
    'created_at', m.created_at
  ) INTO v_result
  FROM public.messages m
  WHERE m.id = v_msg_id;

  RETURN v_result;
END;
$$;

-- =============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- CONVERSATIONS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversations_select" ON public.conversations;
DROP POLICY IF EXISTS "conversations: participants read" ON public.conversations;
CREATE POLICY "conversations_select"
  ON public.conversations FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "conversations_insert" ON public.conversations;
DROP POLICY IF EXISTS "conversations: participants insert" ON public.conversations;
CREATE POLICY "conversations_insert"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "conversations_update" ON public.conversations;
DROP POLICY IF EXISTS "conversations: participants update" ON public.conversations;
CREATE POLICY "conversations_update"
  ON public.conversations FOR UPDATE
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- MESSAGES
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select" ON public.messages;
DROP POLICY IF EXISTS "messages: sender or receiver read" ON public.messages;
CREATE POLICY "messages_select"
  ON public.messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "messages_insert" ON public.messages;
DROP POLICY IF EXISTS "messages: sender insert" ON public.messages;
CREATE POLICY "messages_insert"
  ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "messages_update" ON public.messages;
DROP POLICY IF EXISTS "messages: receiver mark seen" ON public.messages;
CREATE POLICY "messages_update"
  ON public.messages FOR UPDATE
  USING (auth.uid() = receiver_id OR auth.uid() = sender_id);

DROP POLICY IF EXISTS "messages_delete" ON public.messages;
CREATE POLICY "messages_delete"
  ON public.messages FOR DELETE
  USING (auth.uid() = sender_id);

-- =============================================================================
-- 7. ENABLE REALTIME REPLICATION (SAFE & IDEMPOTENT)
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
END $$;

ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;

-- =============================================================================
-- 8. FLUSH & RELOAD SCHEMA CACHE
-- =============================================================================

NOTIFY pgrst, 'reload schema';
