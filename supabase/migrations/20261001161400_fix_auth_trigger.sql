-- ==============================================================================
-- Fix Auth Trigger & Profiles Schema for Safe User Sign-up
-- ==============================================================================

-- 1. Ensure updated_at exists on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 2. Make handle not null default to username if null
UPDATE public.profiles SET handle = username WHERE handle IS NULL;

-- 3. Rewrite handle_new_user() with robust exception handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  base_handle TEXT;
  final_handle TEXT;
  full_name TEXT;
  counter INT := 0;
BEGIN
  BEGIN
    -- Extract display name
    full_name := COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'display_name',
      split_part(NEW.email, '@', 1),
      'Writer'
    );

    -- Extract or generate username handle
    base_handle := LOWER(REGEXP_REPLACE(COALESCE(
      NEW.raw_user_meta_data->>'handle',
      NEW.raw_user_meta_data->>'username',
      split_part(NEW.email, '@', 1),
      'user'
    ), '[^a-z0-9_]', '', 'g'));

    IF base_handle = '' OR base_handle IS NULL THEN
      base_handle := 'user';
    END IF;

    final_handle := base_handle;
    -- Avoid collision
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_handle OR handle = final_handle) LOOP
      counter := counter + 1;
      final_handle := base_handle || counter::text;
    END LOOP;

    -- Insert profile
    INSERT INTO public.profiles (
      id,
      username,
      handle,
      display_name,
      bio,
      avatar_url,
      profile_image,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      final_handle,
      final_handle,
      full_name,
      COALESCE(NEW.raw_user_meta_data->>'bio', ''),
      COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
      COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
      now(),
      now()
    )
    ON CONFLICT (id) DO UPDATE SET
      username = COALESCE(public.profiles.username, EXCLUDED.username),
      handle = COALESCE(public.profiles.handle, EXCLUDED.handle),
      display_name = COALESCE(public.profiles.display_name, EXCLUDED.display_name),
      updated_at = now();

    -- Insert user settings
    INSERT INTO public.user_settings (id)
    VALUES (NEW.id)
    ON CONFLICT (id) DO NOTHING;

  EXCEPTION WHEN OTHERS THEN
    -- In case of ANY unforeseen error, log warning and fallback to minimal insert so auth signup NEVER fails
    RAISE WARNING 'handle_new_user error: % (SQLSTATE %)', SQLERRM, SQLSTATE;
    BEGIN
      INSERT INTO public.profiles (id, username, handle, display_name)
      VALUES (NEW.id, 'user_' || substr(NEW.id::text, 1, 8), 'user_' || substr(NEW.id::text, 1, 8), full_name)
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END;

  RETURN NEW;
END;
$$;

-- 4. Re-bind trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant proper permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
