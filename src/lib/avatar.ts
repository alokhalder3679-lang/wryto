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

/**
 * Safely compresses and resizes a user-selected image file into an optimized
 * WebP / JPEG data URL (< 30 KB) so it can be reliably persisted and displayed
 * across all browsers even when Storage bucket infrastructure is unavailable.
 */
export async function compressImageToDataUrl(
  file: File,
  maxDimension = 256,
  quality = 0.85,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      if (!src) return reject(new Error("Failed to read image file"));

      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(src);

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        try {
          const webp = canvas.toDataURL("image/webp", quality);
          if (webp && webp.startsWith("data:image/webp")) {
            return resolve(webp);
          }
        } catch {
          // ignore
        }
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => resolve(src);
      img.src = src;
    };
    reader.onerror = () => reject(new Error("FileReader error"));
    reader.readAsDataURL(file);
  });
}
