-- Synchronize column names for posts, comments, and notifications
-- Posts: ensure body and tags exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='posts' AND column_name='body') THEN
    ALTER TABLE public.posts ADD COLUMN body TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='posts' AND column_name='tags') THEN
    ALTER TABLE public.posts ADD COLUMN tags TEXT[] DEFAULT '{}';
  END IF;
END $$;

-- Comments: ensure body exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='comments' AND column_name='body') THEN
    ALTER TABLE public.comments ADD COLUMN body TEXT;
  END IF;
END $$;

-- Notifications: ensure recipient_id, kind, and is_read exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notifications' AND column_name='recipient_id') THEN
    ALTER TABLE public.notifications ADD COLUMN recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notifications' AND column_name='kind') THEN
    ALTER TABLE public.notifications ADD COLUMN kind TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notifications' AND column_name='is_read') THEN
    ALTER TABLE public.notifications ADD COLUMN is_read BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- Triggers to keep dual column names in sync
CREATE OR REPLACE FUNCTION public.sync_post_body_content()
RETURNS trigger AS $$
BEGIN
  IF NEW.body IS NULL AND NEW.content IS NOT NULL THEN
    NEW.body := NEW.content;
  ELSIF NEW.content IS NULL AND NEW.body IS NOT NULL THEN
    NEW.content := NEW.body;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_post_body_content ON public.posts;
CREATE TRIGGER trg_sync_post_body_content
  BEFORE INSERT OR UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.sync_post_body_content();

CREATE OR REPLACE FUNCTION public.sync_comment_body_content()
RETURNS trigger AS $$
BEGIN
  IF NEW.body IS NULL AND NEW.content IS NOT NULL THEN
    NEW.body := NEW.content;
  ELSIF NEW.content IS NULL AND NEW.body IS NOT NULL THEN
    NEW.content := NEW.body;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_comment_body_content ON public.comments;
CREATE TRIGGER trg_sync_comment_body_content
  BEFORE INSERT OR UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.sync_comment_body_content();

CREATE OR REPLACE FUNCTION public.sync_notification_columns()
RETURNS trigger AS $$
BEGIN
  IF NEW.recipient_id IS NULL AND NEW.user_id IS NOT NULL THEN
    NEW.recipient_id := NEW.user_id;
  ELSIF NEW.user_id IS NULL AND NEW.recipient_id IS NOT NULL THEN
    NEW.user_id := NEW.recipient_id;
  END IF;
  
  IF NEW.kind IS NULL AND NEW.type IS NOT NULL THEN
    NEW.kind := NEW.type;
  ELSIF NEW.type IS NULL AND NEW.kind IS NOT NULL THEN
    NEW.type := NEW.kind;
  END IF;

  IF NEW.is_read IS DISTINCT FROM NEW.read THEN
    NEW.read := COALESCE(NEW.is_read, NEW.read, false);
    NEW.is_read := NEW.read;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_notification_columns ON public.notifications;
CREATE TRIGGER trg_sync_notification_columns
  BEFORE INSERT OR UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.sync_notification_columns();

-- Update existing notification triggers to populate both
CREATE OR REPLACE FUNCTION public.handle_new_like()
RETURNS trigger AS $$
DECLARE
  p_author_id UUID;
BEGIN
  SELECT author_id INTO p_author_id FROM public.posts WHERE id = NEW.post_id;
  IF p_author_id IS NOT NULL AND p_author_id <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, recipient_id, actor_id, type, kind, post_id, created_at)
    VALUES (p_author_id, p_author_id, NEW.user_id, 'like', 'like', NEW.post_id, now());
  END IF;

  UPDATE public.posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.handle_new_comment()
RETURNS trigger AS $$
DECLARE
  p_author_id UUID;
BEGIN
  SELECT author_id INTO p_author_id FROM public.posts WHERE id = NEW.post_id;
  IF p_author_id IS NOT NULL AND p_author_id <> NEW.author_id THEN
    INSERT INTO public.notifications (user_id, recipient_id, actor_id, type, kind, post_id, comment_id, created_at)
    VALUES (p_author_id, p_author_id, NEW.author_id, 'comment', 'comment', NEW.post_id, NEW.id, now());
  END IF;

  UPDATE public.posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.handle_new_follower()
RETURNS trigger AS $$
BEGIN
  IF NEW.follower_id <> NEW.following_id THEN
    INSERT INTO public.notifications (user_id, recipient_id, actor_id, type, kind, created_at)
    VALUES (NEW.following_id, NEW.following_id, NEW.follower_id, 'follow', 'follow', now());

    UPDATE public.profiles SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
    UPDATE public.profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
