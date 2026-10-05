-- =============================================================================
-- FIX FOR: Could not find the 'receiver_id' column of 'messages' in the schema cache
-- Run this in Supabase SQL Editor.
-- =============================================================================

-- 1. Ensure public.messages has the receiver_id column (and backwards-compatibility if recipient_id existed)
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

  -- Add receiver_id column if still missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'receiver_id'
  ) THEN
    ALTER TABLE public.messages ADD COLUMN receiver_id uuid;
  END IF;

  -- Add sender_id column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'sender_id'
  ) THEN
    ALTER TABLE public.messages ADD COLUMN sender_id uuid;
  END IF;

  -- Add conversation_id column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'conversation_id'
  ) THEN
    ALTER TABLE public.messages ADD COLUMN conversation_id uuid;
  END IF;

  -- Add content column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'content'
  ) THEN
    ALTER TABLE public.messages ADD COLUMN content text;
  END IF;

  -- Add is_seen column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'is_seen'
  ) THEN
    ALTER TABLE public.messages ADD COLUMN is_seen boolean DEFAULT false;
  END IF;

  -- Add created_at column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.messages ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
END $$;

-- 2. Foreign Key constraints to public.profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'messages_receiver_id_fkey' AND table_name = 'messages'
  ) THEN
    ALTER TABLE public.messages 
      ADD CONSTRAINT messages_receiver_id_fkey 
      FOREIGN KEY (receiver_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
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
    WHERE constraint_name = 'messages_conversation_id_fkey' AND table_name = 'messages'
  ) THEN
    ALTER TABLE public.messages 
      ADD CONSTRAINT messages_conversation_id_fkey 
      FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 3. Indexes for fast message lookups
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON public.messages(conversation_id, created_at ASC);

-- 4. Enable RLS and set proper policies
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

-- 5. Realtime replication setup
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;

ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- 6. CRITICAL: Flush & Reload PostgREST Schema Cache
NOTIFY pgrst, 'reload schema';
