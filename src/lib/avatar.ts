import { supabase } from "@/integrations/supabase/client";

/**
 * Resolves any avatar representation (full HTTPS/Google URL, data URI, or Supabase Storage path)
 * into a valid, public URL for <AvatarImage /> rendering across all screens.
 */
export function getAvatarUrl(avatar: string | null | undefined): string | null {
  if (!avatar) return null;
  const trimmed = avatar.trim();
  if (!trimmed) return null;

  // Already a full web URL (e.g. Google OAuth, external image, or absolute Supabase URL)
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }

  // Supabase Storage object path (e.g. "userId/avatar.png" or "avatars/userId/avatar.png")
  try {
    const cleanPath = trimmed.replace(/^avatars\//, "");
    const { data } = supabase.storage.from("avatars").getPublicUrl(cleanPath);
    return data?.publicUrl ?? null;
  } catch {
    return null;
  }
}
