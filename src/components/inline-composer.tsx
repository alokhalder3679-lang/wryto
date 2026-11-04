import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Feather, Hash, Loader2, Maximize2, Sparkles, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useInkline } from "@/lib/inkline-context";
import { getAvatarUrl } from "@/lib/avatar";
import { initialsOf } from "@/lib/inkline-data";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const SUGGESTED_TAGS = ["thoughts", "essays", "poetry", "philosophy", "creative", "reflections"];

export function InlineComposer({ onPublished }: { onPublished?: () => void }) {
  const { user, profile, publishPost } = useInkline();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"thought" | "story" | "poetry">("thought");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState<string[]>(["thoughts"]);
  const [busy, setBusy] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.max(68, textareaRef.current.scrollHeight)}px`;
    }
  }, [body]);

  function toggleTag(tag: string) {
    if (tags.includes(tag)) {
      if (tags.length > 1) {
        setTags(tags.filter((t) => t !== tag));
      }
    } else {
      setTags([...tags, tag]);
    }
  }

  async function handlePublish() {
    if (!body.trim() || busy) return;
    if (!user) {
      void navigate({ to: "/auth" });
      return;
    }
    setBusy(true);
    try {
      const postId = await publishPost({
        title: mode === "story" && title.trim() ? title.trim() : undefined,
        body: body.trim(),
        tags,
      });

      if (postId) {
        toast.success("Post published to your feed!");
        setBody("");
        setTitle("");
        setIsFocused(false);
        onPublished?.();
      } else {
        toast.error("Couldn't publish your post. Please try again.");
      }
    } catch (err) {
      console.error("Publish error:", err);
      toast.error("An error occurred while publishing.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-b border-border/70 p-4 bg-card/60 backdrop-blur-xs transition-all">
      <div className="flex gap-3">
        {/* User Avatar */}
        <Avatar className="size-10 shrink-0 ring-1 ring-border mt-0.5">
          {getAvatarUrl(profile?.avatarUrl) && (
            <AvatarImage src={getAvatarUrl(profile?.avatarUrl)!} alt={profile?.name ?? "User"} />
          )}
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold font-sans">
            {profile?.name ? initialsOf(profile.name) : "U"}
          </AvatarFallback>
        </Avatar>

        {/* Composer Form Area */}
        <div className="flex-1 min-w-0">
          {/* Format Mode Selector */}
          <div className="flex items-center gap-1.5 mb-2">
            <button
              type="button"
              onClick={() => setMode("thought")}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-sans font-medium transition-all cursor-pointer",
                mode === "thought"
                  ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              💭 Thought
            </button>
            <button
              type="button"
              onClick={() => setMode("story")}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-sans font-medium transition-all cursor-pointer",
                mode === "story"
                  ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              📖 Story / Essay
            </button>
            <button
              type="button"
              onClick={() => setMode("poetry")}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-sans font-medium transition-all cursor-pointer",
                mode === "poetry"
                  ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              ✍️ Poetry
            </button>
          </div>

          {/* Optional Story Title Input */}
          {mode === "story" && (
            <input
              type="text"
              value={title}
              maxLength={120}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title of your piece (optional)"
              className="w-full mb-2 bg-transparent text-base font-bold font-sans text-foreground placeholder:text-muted-foreground/50 border-b border-border/50 pb-1.5 outline-none"
            />
          )}

          {/* Body Textarea */}
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, 3000))}
            onFocus={() => setIsFocused(true)}
            placeholder={
              mode === "poetry"
                ? "Write your verses here...\n(linebreaks preserved)"
                : mode === "story"
                  ? "Tell your story or develop an idea..."
                  : "What's on your mind? Share a thought..."
            }
            className={cn(
              "w-full bg-transparent text-sm sm:text-base font-sans text-foreground placeholder:text-muted-foreground/60 border-none outline-none resize-none min-h-[64px] leading-relaxed",
              mode === "poetry" && "font-serif italic leading-loose",
            )}
            rows={2}
          />

          {/* Expanded Tags & Actions */}
          {(isFocused || body.length > 0) && (
            <div className="pt-2 border-t border-border/40 mt-2 space-y-3 animate-fade-in">
              {/* Quick Tag Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-sans text-muted-foreground font-medium flex items-center gap-1">
                  <Hash className="size-3" /> Topics:
                </span>
                {SUGGESTED_TAGS.map((tag) => {
                  const active = tags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={cn(
                        "px-2 py-0.5 rounded-md text-[11px] font-sans transition-colors cursor-pointer",
                        active
                          ? "bg-primary/15 text-primary font-semibold ring-1 ring-primary/30"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      #{tag}
                    </button>
                  );
                })}
              </div>

              {/* Bottom Row Controls */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-sans text-muted-foreground">
                    {body.length} / 3,000
                  </span>
                  <Link
                    to="/create"
                    className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                    title="Open Full Screen Studio"
                  >
                    <Maximize2 className="size-3.5" />
                    <span className="hidden sm:inline">Studio</span>
                  </Link>
                </div>

                <Button
                  onClick={() => void handlePublish()}
                  disabled={!body.trim() || busy}
                  className="h-9 px-5 rounded-full bg-primary text-primary-foreground font-semibold text-xs shadow-xs hover:bg-primary/90 transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {busy ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin mr-1.5" />
                      Publishing…
                    </>
                  ) : (
                    "Post"
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
