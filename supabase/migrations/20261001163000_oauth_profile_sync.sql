-- Update handle_new_user to handle Google and Apple OAuth user metadata
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
  provider_avatar TEXT;
  counter INT := 0;
BEGIN
  BEGIN
    -- Extract display name (Google provides 'name'/'full_name', Apple provides 'full_name' or custom object)
    full_name := COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'display_name',
      split_part(NEW.email, '@', 1),
      'Writer'
    );

    -- Extract avatar (Google provides 'picture' or 'avatar_url')
    provider_avatar := COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture',
      NEW.raw_user_meta_data->>'avatar',
      ''
    );

    -- Extract or generate username handle
    base_handle := LOWER(REGEXP_REPLACE(COALESCE(
      NEW.raw_user_meta_data->>'handle',
      NEW.raw_user_meta_data->>'username',
      NEW.raw_user_meta_data->>'preferred_username',
      split_part(NEW.email, '@', 1),
      'user'
    ), '[^a-z0-9_]', '', 'g'));

    IF base_handle = '' OR base_handle IS NULL THEN
      base_handle := 'user';
    END IF;

    final_handle := base_handle;
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE (username = final_handle OR handle = final_handle) AND id <> NEW.id) LOOP
      counter := counter + 1;
      final_handle := base_handle || counter::text;
    END LOOP;

    -- Insert or update profile
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
      provider_avatar,
      provider_avatar,
      now(),
      now()
    )
    ON CONFLICT (id) DO UPDATE SET
      username = COALESCE(public.profiles.username, EXCLUDED.username),
      handle = COALESCE(public.profiles.handle, EXCLUDED.handle),
      display_name = COALESCE(NULLIF(public.profiles.display_name, ''), EXCLUDED.display_name),
      avatar_url = COALESCE(NULLIF(public.profiles.avatar_url, ''), EXCLUDED.avatar_url),
      profile_image = COALESCE(NULLIF(public.profiles.profile_image, ''), EXCLUDED.profile_image),
      updated_at = now();

    -- Insert user settings
    INSERT INTO public.user_settings (id)
    VALUES (NEW.id)
    ON CONFLICT (id) DO NOTHING;

  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user error: % (SQLSTATE %)', SQLERRM, SQLSTATE;
    BEGIN
      INSERT INTO public.profiles (id, username, handle, display_name, avatar_url, profile_image)
      VALUES (
        NEW.id,
        'user_' || substr(NEW.id::text, 1, 8),
        'user_' || substr(NEW.id::text, 1, 8),
        COALESCE(full_name, 'Writer'),
        provider_avatar,
        provider_avatar
      )
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END;

  RETURN NEW;
END;
$$;
