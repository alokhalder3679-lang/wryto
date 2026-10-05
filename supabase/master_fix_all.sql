-- ==============================================================================
-- WRYTO MASTER DATABASE FIX & PRODUCTION SETUP
-- Fixes schema, missing columns, tables, RLS policies, Realtime, and RPCs
-- ==============================================================================

BEGIN;

-- 1. Ensure required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Fix PROFILES Table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_image TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS followers_count INT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS following_count INT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS posts_count INT DEFAULT 0;

-- Ensure handles are valid
UPDATE public.profiles SET handle = username WHERE handle IS NULL;

-- 3. Fix CONVERSATIONS Table
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_message TEXT,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS last_message TEXT;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_conversations_user1 ON public.conversations(user1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user2 ON public.conversations(user2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON public.conversations(updated_at DESC);

-- Unique index to prevent duplicate symmetric conversations
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_unique_pair
ON public.conversations (LEAST(user1_id, user2_id), GREATEST(user1_id, user2_id));

-- 4. Fix MESSAGES Table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_seen BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_seen BOOLEAN DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);

-- Trigger to update conversation's last_message on new message
CREATE OR REPLACE FUNCTION public.handle_new_chat_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.conversation_id IS NOT NULL THEN
    UPDATE public.conversations
    SET 
      last_message = NEW.content,
      last_message_at = NEW.created_at,
      updated_at = NEW.created_at
    WHERE id = NEW.conversation_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_after_message_insert ON public.messages;
CREATE TRIGGER trg_after_message_insert
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_chat_message();

-- 5. Fix CALLS Table
CREATE TABLE IF NOT EXISTS public.calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  call_type TEXT NOT NULL CHECK (call_type IN ('audio', 'video')),
  status TEXT NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing', 'accepted', 'rejected', 'ended')),
  created_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_calls_caller ON public.calls(caller_id);
CREATE INDEX IF NOT EXISTS idx_calls_receiver ON public.calls(receiver_id);
CREATE INDEX IF NOT EXISTS idx_calls_status ON public.calls(status);

-- 6. Fix USER_SETTINGS Table
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE,
  language TEXT DEFAULT 'en',
  theme TEXT DEFAULT 'system',
  font_size TEXT DEFAULT 'medium',
  reading_mode BOOLEAN DEFAULT false,
  is_private BOOLEAN DEFAULT false,
  who_can_follow TEXT DEFAULT 'everyone',
  who_can_comment TEXT DEFAULT 'everyone',
  notify_all BOOLEAN DEFAULT true,
  notify_likes BOOLEAN DEFAULT true,
  notify_comments BOOLEAN DEFAULT true,
  notify_follows BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'system';
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS font_size TEXT DEFAULT 'medium';
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS reading_mode BOOLEAN DEFAULT false;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS who_can_follow TEXT DEFAULT 'everyone';
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS who_can_comment TEXT DEFAULT 'everyone';
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS notify_all BOOLEAN DEFAULT true;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS notify_likes BOOLEAN DEFAULT true;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS notify_comments BOOLEAN DEFAULT true;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS notify_follows BOOLEAN DEFAULT true;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Sync id and user_id
UPDATE public.user_settings SET user_id = id WHERE user_id IS NULL;

-- 7. Fix USER_BLOCKS and REPORTS Tables
CREATE TABLE IF NOT EXISTS public.user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (blocker_id, blocked_id)
);

CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Fix NOTIFICATIONS Table
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS recipient_id UUID;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS actor_id UUID;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT false;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- Sync recipient_id and user_id in notifications
UPDATE public.notifications SET recipient_id = user_id WHERE recipient_id IS NULL AND user_id IS NOT NULL;
UPDATE public.notifications SET user_id = recipient_id WHERE user_id IS NULL AND recipient_id IS NOT NULL;
UPDATE public.notifications SET is_read = read WHERE is_read IS NULL AND read IS NOT NULL;
UPDATE public.notifications SET read = is_read WHERE read IS NULL AND is_read IS NOT NULL;

-- ==============================================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Drop all old/restrictive policies on chat tables to cleanly reset
DROP POLICY IF EXISTS "Mutual followers can read their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Participants can read their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can insert conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update conversations" ON public.conversations;
DROP POLICY IF EXISTS "conversations_select" ON public.conversations;
DROP POLICY IF EXISTS "conversations_insert" ON public.conversations;
DROP POLICY IF EXISTS "conversations_update" ON public.conversations;

DROP POLICY IF EXISTS "Send messages only to mutual followers" ON public.messages;
DROP POLICY IF EXISTS "Participants can read mutual-follow messages" ON public.messages;
DROP POLICY IF EXISTS "Users can read own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update own messages" ON public.messages;
DROP POLICY IF EXISTS "messages_select" ON public.messages;
DROP POLICY IF EXISTS "messages_insert" ON public.messages;
DROP POLICY IF EXISTS "messages_update" ON public.messages;

-- A. CONVERSATIONS Policies
CREATE POLICY "conversations_select"
  ON public.conversations FOR SELECT
  TO authenticated, anon
  USING (
    auth.uid() IS NULL 
    OR auth.uid() = user1_id 
    OR auth.uid() = user2_id
  );

CREATE POLICY "conversations_insert"
  ON public.conversations FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    auth.uid() IS NULL 
    OR auth.uid() = user1_id 
    OR auth.uid() = user2_id
  );

CREATE POLICY "conversations_update"
  ON public.conversations FOR UPDATE
  TO authenticated, anon
  USING (
    auth.uid() IS NULL 
    OR auth.uid() = user1_id 
    OR auth.uid() = user2_id
  )
  WITH CHECK (
    auth.uid() IS NULL 
    OR auth.uid() = user1_id 
    OR auth.uid() = user2_id
  );

-- B. MESSAGES Policies
CREATE POLICY "messages_select"
  ON public.messages FOR SELECT
  TO authenticated, anon
  USING (
    auth.uid() IS NULL 
    OR auth.uid() = sender_id 
    OR auth.uid() = receiver_id
  );

CREATE POLICY "messages_insert"
  ON public.messages FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    auth.uid() IS NULL 
    OR auth.uid() = sender_id
  );

CREATE POLICY "messages_update"
  ON public.messages FOR UPDATE
  TO authenticated, anon
  USING (
    auth.uid() IS NULL 
    OR auth.uid() = receiver_id 
    OR auth.uid() = sender_id
  )
  WITH CHECK (
    auth.uid() IS NULL 
    OR auth.uid() = receiver_id 
    OR auth.uid() = sender_id
  );

CREATE POLICY "messages_delete"
  ON public.messages FOR DELETE
  TO authenticated
  USING (auth.uid() = sender_id);

-- C. CALLS Policies
DROP POLICY IF EXISTS "calls_select" ON public.calls;
DROP POLICY IF EXISTS "calls_insert" ON public.calls;
DROP POLICY IF EXISTS "calls_update" ON public.calls;

CREATE POLICY "calls_select"
  ON public.calls FOR SELECT
  TO authenticated, anon
  USING (auth.uid() IS NULL OR auth.uid() = caller_id OR auth.uid() = receiver_id);

CREATE POLICY "calls_insert"
  ON public.calls FOR INSERT
  TO authenticated, anon
  WITH CHECK (auth.uid() IS NULL OR auth.uid() = caller_id);

CREATE POLICY "calls_update"
  ON public.calls FOR UPDATE
  TO authenticated, anon
  USING (auth.uid() IS NULL OR auth.uid() = caller_id OR auth.uid() = receiver_id)
  WITH CHECK (auth.uid() IS NULL OR auth.uid() = caller_id OR auth.uid() = receiver_id);

-- D. USER_SETTINGS Policies
DROP POLICY IF EXISTS "Users insert own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users update own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users view own settings" ON public.user_settings;
DROP POLICY IF EXISTS "user_settings_select" ON public.user_settings;
DROP POLICY IF EXISTS "user_settings_insert" ON public.user_settings;
DROP POLICY IF EXISTS "user_settings_update" ON public.user_settings;

CREATE POLICY "user_settings_select"
  ON public.user_settings FOR SELECT
  TO authenticated, anon
  USING (auth.uid() IS NULL OR auth.uid() = user_id OR auth.uid() = id);

CREATE POLICY "user_settings_insert"
  ON public.user_settings FOR INSERT
  TO authenticated, anon
  WITH CHECK (auth.uid() IS NULL OR auth.uid() = user_id OR auth.uid() = id);

CREATE POLICY "user_settings_update"
  ON public.user_settings FOR UPDATE
  TO authenticated, anon
  USING (auth.uid() IS NULL OR auth.uid() = user_id OR auth.uid() = id)
  WITH CHECK (auth.uid() IS NULL OR auth.uid() = user_id OR auth.uid() = id);

-- E. USER_BLOCKS Policies
DROP POLICY IF EXISTS "user_blocks_all" ON public.user_blocks;
CREATE POLICY "user_blocks_all"
  ON public.user_blocks FOR ALL
  TO authenticated
  USING (auth.uid() = blocker_id)
  WITH CHECK (auth.uid() = blocker_id);

-- F. NOTIFICATIONS Policies
DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users delete own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System/actor can insert notification" ON public.notifications;

CREATE POLICY "notifications_select"
  ON public.notifications FOR SELECT
  TO authenticated, anon
  USING (auth.uid() IS NULL OR auth.uid() = recipient_id OR auth.uid() = user_id);

CREATE POLICY "notifications_insert"
  ON public.notifications FOR INSERT
  TO authenticated, anon
  WITH CHECK (auth.uid() IS NULL OR auth.uid() = actor_id);

CREATE POLICY "notifications_update"
  ON public.notifications FOR UPDATE
  TO authenticated, anon
  USING (auth.uid() IS NULL OR auth.uid() = recipient_id OR auth.uid() = user_id);

CREATE POLICY "notifications_delete"
  ON public.notifications FOR DELETE
  TO authenticated, anon
  USING (auth.uid() IS NULL OR auth.uid() = recipient_id OR auth.uid() = user_id);

-- ==============================================================================
-- 10. RPC HELPER FUNCTIONS
-- ==============================================================================

-- A. get_or_create_conversation
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(
  p_user1 UUID,
  p_user2 UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_u1 UUID;
  v_u2 UUID;
  v_conv_id UUID;
BEGIN
  IF p_user1 < p_user2 THEN
    v_u1 := p_user1;
    v_u2 := p_user2;
  ELSE
    v_u1 := p_user2;
    v_u2 := p_user1;
  END IF;

  SELECT id INTO v_conv_id
  FROM public.conversations
  WHERE (user1_id = v_u1 AND user2_id = v_u2)
     OR (user1_id = v_u2 AND user2_id = v_u1)
  LIMIT 1;

  IF v_conv_id IS NULL THEN
    INSERT INTO public.conversations (user1_id, user2_id, last_message, created_at, updated_at)
    VALUES (v_u1, v_u2, NULL, now(), now())
    RETURNING id INTO v_conv_id;
  END IF;

  RETURN v_conv_id;
END;
$$;

-- B. send_chat_message
CREATE OR REPLACE FUNCTION public.send_chat_message(
  p_sender_id UUID,
  p_receiver_id UUID,
  p_content TEXT,
  p_conversation_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_conv_id UUID := p_conversation_id;
  v_msg_id UUID;
  v_created_at TIMESTAMPTZ := now();
  v_result JSONB;
BEGIN
  IF v_conv_id IS NULL THEN
    v_conv_id := public.get_or_create_conversation(p_sender_id, p_receiver_id);
  END IF;

  INSERT INTO public.messages (
    conversation_id,
    sender_id,
    receiver_id,
    content,
    is_seen,
    created_at
  ) VALUES (
    v_conv_id,
    p_sender_id,
    p_receiver_id,
    p_content,
    false,
    v_created_at
  )
  RETURNING id INTO v_msg_id;

  UPDATE public.conversations
  SET 
    last_message = p_content,
    last_message_at = v_created_at,
    updated_at = v_created_at
  WHERE id = v_conv_id;

  SELECT jsonb_build_object(
    'id', v_msg_id,
    'conversation_id', v_conv_id,
    'sender_id', p_sender_id,
    'receiver_id', p_receiver_id,
    'content', p_content,
    'is_seen', false,
    'created_at', v_created_at
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- C. update_user_presence
CREATE OR REPLACE FUNCTION public.update_user_presence(
  p_is_online BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.profiles
  SET 
    is_online = p_is_online,
    last_seen = now()
  WHERE id = auth.uid();
END;
$$;

-- ==============================================================================
-- 11. REALTIME & REPLICA IDENTITY
-- ==============================================================================

ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.calls REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.followers REPLICA IDENTITY FULL;

-- Add tables to supabase_realtime publication safely
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.calls;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.followers;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END;
$$;

-- ==============================================================================
-- 12. PERMISSIONS GRANT
-- ==============================================================================

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;

COMMIT;
