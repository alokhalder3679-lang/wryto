-- ==============================================================================
-- USER PRESENCE AND MESSAGE TIMESTAMPTZ FIX
-- ==============================================================================

BEGIN;

-- 1. Create USER_PRESENCE Table
CREATE TABLE IF NOT EXISTS public.user_presence (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_online BOOLEAN NOT NULL DEFAULT false,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure all columns have correct types
ALTER TABLE public.user_presence 
  ALTER COLUMN last_seen TYPE TIMESTAMPTZ USING last_seen AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE public.user_presence 
  ALTER COLUMN last_seen SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

-- Populate user_presence for existing profiles
INSERT INTO public.user_presence (user_id, is_online, last_seen, updated_at)
SELECT id, COALESCE(is_online, false), COALESCE(last_seen, now()), now()
FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- 2. Enable RLS on user_presence
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

-- 3. Fix MESSAGES created_at to TIMESTAMPTZ with DEFAULT now()
ALTER TABLE public.messages 
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING (
    CASE 
      WHEN created_at IS NULL THEN now()
      ELSE created_at AT TIME ZONE 'UTC'
    END
  );

ALTER TABLE public.messages ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.messages ALTER COLUMN created_at SET NOT NULL;

-- 4. Fix CONVERSATIONS timestamps
ALTER TABLE public.conversations 
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC',
  ALTER COLUMN last_message_at TYPE TIMESTAMPTZ USING (
    CASE 
      WHEN last_message_at IS NULL THEN now()
      ELSE last_message_at AT TIME ZONE 'UTC'
    END
  );

ALTER TABLE public.conversations ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.conversations ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE public.conversations ALTER COLUMN last_message_at SET DEFAULT now();

-- 5. Trigger to strictly enforce created_at server time on messages
CREATE OR REPLACE FUNCTION public.set_message_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.created_at IS NULL THEN
    NEW.created_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_message_timestamp ON public.messages;
CREATE TRIGGER trg_set_message_timestamp
  BEFORE INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.set_message_timestamp();

-- 6. RPC Function: set_user_presence
CREATE OR REPLACE FUNCTION public.set_user_presence(
  p_user_id UUID,
  p_is_online BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
BEGIN
  INSERT INTO public.user_presence (user_id, is_online, last_seen, updated_at)
  VALUES (
    p_user_id,
    p_is_online,
    v_now,
    v_now
  )
  ON CONFLICT (user_id) DO UPDATE
  SET 
    is_online = EXCLUDED.is_online,
    last_seen = CASE WHEN EXCLUDED.is_online = false THEN v_now ELSE public.user_presence.last_seen END,
    updated_at = v_now;

  -- Also synchronize with profiles table
  UPDATE public.profiles
  SET 
    is_online = p_is_online,
    last_seen = CASE WHEN p_is_online = false THEN v_now ELSE public.profiles.last_seen END
  WHERE id = p_user_id;
END;
$$;

-- 7. Update send_chat_message RPC to strictly use server-generated TIMESTAMPTZ
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
  v_created_at TIMESTAMPTZ;
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
    now()
  )
  RETURNING id, created_at INTO v_msg_id, v_created_at;

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
    'created_at', to_char(v_created_at, 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- 8. Add user_presence to realtime publication with FULL replica identity
ALTER TABLE public.user_presence REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END;
$$;

-- 9. Grants
GRANT ALL ON TABLE public.user_presence TO authenticated, anon, service_role;
GRANT ALL ON FUNCTION public.set_user_presence(UUID, BOOLEAN) TO authenticated, anon, service_role;

COMMIT;
