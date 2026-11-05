import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bold,
  Check,
  Eye,
  Hash,
  Heading,
  Italic,
  List,
  Loader2,
  PenLine,
  Quote,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { AmbientSoundToggle } from "@/components/ambient-sound-toggle";
import { getAvatarUrl } from "@/lib/avatar";
import { initialsOf } from "@/lib/inkline-data";
import { useInkline } from "@/lib/inkline-context";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/create")({
  staticData: { sitemap: false },
  validateSearch: (
    search: Record<string, unknown>,
  ): { tag?: string; format?: "thought" | "story" | "poetry"; prompt?: string } => ({
    tag: typeof search["tag"] === "string" ? search["tag"] : undefined,
    format:
      search["format"] === "thought" || search["format"] === "story" || search["format"] === "poetry"
        ? search["format"]
        : undefined,
    prompt: typeof search["prompt"] === "string" ? search["prompt"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Create Post — Wryto" },
      { name: "description", content: "Compose and publish a thought, story, or poem on Wryto." },
      { property: "og:title", content: "Create Post — Wryto" },
      { property: "og:description", content: "Compose and publish a thought, story, or poem on Wryto." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: CreateErrorComponent,
  component: CreatePage,
});

function CreateErrorComponent() {
  return (
    <AppShell title="Create">
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
        <h2 className="text-xl font-bold font-sans">Unable to load the editor</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          There was an issue opening the composer. Please refresh to try again.
        </p>
        <Button onClick={() => window.location.reload()} className="rounded-full">Reload</Button>
      </div>
    </AppShell>
  );
}

const AVAILABLE_TAGS = [
  "thoughts",
  "essays",
  "poetry",
  "philosophy",
  "culture",
  "craft",
  "creative",
  "reflections",
  "technology",
] as const;

function estimateReadTime(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*.*?\*\*|\*.*?\*|__.*?__|_.*?_)/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(text.slice(lastIdx, match.index));
    }
    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={match.index} className="font-bold text-foreground">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("__") && token.endsWith("__")) {
      parts.push(
        <strong key={match.index} className="font-bold text-foreground">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      parts.push(
        <em key={match.index} className="italic text-foreground/95">
          {token.slice(1, -1)}
        </em>,
      );
    } else if (token.startsWith("_") && token.endsWith("_")) {
      parts.push(
        <em key={match.index} className="italic text-foreground/95">
          {token.slice(1, -1)}
        </em>,
      );
    }
    lastIdx = match.index + token.length;
  }
  if (lastIdx < text.length) {
    parts.push(text.slice(lastIdx));
  }
  return parts.length ? parts : text;
}

function CreatePage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [promptDismissed, setPromptDismissed] = useState(false);
  const { publishPost, user, profile, loading: authLoading } = useInkline();
  const [postMode, setPostMode] = useState<"thought" | "story" | "poetry">("thought");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState<string[]>(["thoughts"]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");
  const [autosaveStatus, setAutosaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

  const draftKey = user ? `wryto_draft_${user.id}` : "wryto_draft_guest";

  // Seed prompt from URL if provided
  useEffect(() => {
    if (search.tag) {
      setTags((prev) => (prev.includes(search.tag!) ? prev : [search.tag!, ...prev]));
    }
    if (search.format) {
      setPostMode(search.format);
    }
  }, [search.tag, search.format]);

  // Restore draft on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.body) setBody(parsed.body);
        if (parsed.title) setTitle(parsed.title);
        if (Array.isArray(parsed.tags) && parsed.tags.length > 0) setTags(parsed.tags);
        if (parsed.mode) setPostMode(parsed.mode);
        setAutosaveStatus("saved");
      }
    } catch {
      // ignore
    }
  }, [draftKey]);

  // Debounced autosave
  useEffect(() => {
    if (!body && !title) return;
    setAutosaveStatus("saving");
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(
          draftKey,
          JSON.stringify({ title, body, tags, mode: postMode, updatedAt: Date.now() }),
        );
        setAutosaveStatus("saved");
      } catch {
        setAutosaveStatus("idle");
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [title, body, tags, postMode, draftKey]);

  useEffect(() => {
    if (!authLoading && !user) void navigate({ to: "/auth", replace: true });
  }, [authLoading, user, navigate]);

  function insertFormatting(prefix: string, suffix = "") {
    const textarea = bodyTextareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = body.slice(start, end);
    const replacement = `${prefix}${selected || "text"}${suffix}`;
    const nextBody = body.slice(0, start) + replacement + body.slice(end);
    setBody(nextBody);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selected || "text").length);
    });
  }

  function handleReset() {
    if (!window.confirm("Clear this draft and start over?")) return;
    setTitle("");
    setBody("");
    setTags(["thoughts"]);
    setAutosaveStatus("idle");
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // ignore
    }
    toast.success("Draft cleared");
  }

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
    setBusy(true);
    setError(null);
    try {
      const id = await publishPost({
        title: postMode === "story" && title.trim() ? title.trim() : undefined,
        body: body.trim(),
        tags,
      });

      if (!id) {
        setError("We couldn't publish your post. Please check your connection and try again.");
        setBusy(false);
        return;
      }

      try {
        localStorage.removeItem(draftKey);
      } catch {
        // ignore
      }

      toast.success("Post published successfully!");
      await navigate({ to: "/post/$id", params: { id } });
    } catch (err) {
      console.error("Publish error:", err);
      setError("An unexpected error occurred. Please try again.");
      setBusy(false);
    }
  }

  const words = wordCount(body);
  const readTime = estimateReadTime(body);

  return (
    <AppShell>
      {/* ── Studio Sticky Header ─────────────────────────────── */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border/70 bg-background/90 px-4 sm:px-6 h-14 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Link
            to="/feed"
            className="p-1.5 -ml-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            aria-label="Back to feed"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <span className="font-sans text-base font-bold text-foreground">Create Post</span>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2">
          {autosaveStatus === "saved" && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-sans text-muted-foreground">
              <Check className="size-3 text-emerald-500" /> Draft saved
            </span>
          )}
          {autosaveStatus === "saving" && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-sans text-muted-foreground">
              <Loader2 className="size-3 animate-spin text-primary" /> Saving…
            </span>
          )}

          <AmbientSoundToggle />

          {/* Toggle Edit vs Preview */}
          <div className="inline-flex rounded-full border border-border/70 p-0.5 bg-muted/40">
            <button
              type="button"
              onClick={() => setViewMode("edit")}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-sans font-semibold transition-all cursor-pointer",
                viewMode === "edit"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setViewMode("preview")}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-sans font-semibold transition-all cursor-pointer",
                viewMode === "preview"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Preview
            </button>
          </div>

          <Button
            onClick={() => void handlePublish()}
            disabled={!body.trim() || busy}
            className="rounded-full px-5 h-9 font-semibold text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {busy ? (
              <>
                <Loader2 className="size-3.5 animate-spin mr-1.5" />
                Publishing…
              </>
            ) : (
              "Publish"
            )}
          </Button>
        </div>
      </div>

      {/* ── Main Composer Container ──────────────────────────── */}
      <div className="p-4 sm:p-6 space-y-5">
        {search.prompt && !promptDismissed && (
          <div className="relative overflow-hidden rounded-2xl border border-primary/30 liquid-glass p-3.5 sm:p-4 text-xs animate-fade-rise">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-semibold text-primary uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Sparkles className="size-3.5" /> Prompt Inspiration
              </span>
              <button
                type="button"
                onClick={() => setPromptDismissed(true)}
                className="text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                aria-label="Dismiss prompt note"
              >
                <X className="size-3.5" />
              </button>
            </div>
            <p className="font-serif italic text-sm text-foreground my-1 pl-2.5 border-l-2 border-primary/50">
              "{search.prompt}"
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Reflect freely on this prompt. Your post will automatically be tagged #{search.tag || "reflections"}.
            </p>
          </div>
        )}

        {/* Post Format Selector */}
        <div className="flex items-center gap-2 border-b border-border/50 pb-3">
          <span className="text-xs font-sans font-medium text-muted-foreground mr-1">Format:</span>
          <button
            type="button"
            onClick={() => setPostMode("thought")}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-sans font-medium transition-all cursor-pointer",
              postMode === "thought"
                ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            💭 Thought
          </button>
          <button
            type="button"
            onClick={() => setPostMode("story")}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-sans font-medium transition-all cursor-pointer",
              postMode === "story"
                ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            📖 Story / Essay
          </button>
          <button
            type="button"
            onClick={() => setPostMode("poetry")}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-sans font-medium transition-all cursor-pointer",
              postMode === "poetry"
                ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            ✍️ Poetry
          </button>
        </div>

        {viewMode === "edit" ? (
          <div className="space-y-4">
            {/* Story Title Input (Visible when in Story Mode) */}
            {postMode === "story" && (
              <div>
                <input
                  type="text"
                  value={title}
                  maxLength={150}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Title of your story or essay"
                  className="w-full bg-transparent text-xl sm:text-2xl font-bold font-sans text-foreground placeholder:text-muted-foreground/50 border-b border-border/60 pb-2 outline-none"
                />
              </div>
            )}

            {/* Markdown Toolbar Helper */}
            <div className="flex items-center gap-1 p-1.5 rounded-xl bg-muted/40 border border-border/60 text-muted-foreground overflow-x-auto">
              <button
                type="button"
                onClick={() => insertFormatting("**", "**")}
                className="p-2 rounded-lg hover:bg-background hover:text-foreground transition-colors cursor-pointer"
                title="Bold"
              >
                <Bold className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting("*", "*")}
                className="p-2 rounded-lg hover:bg-background hover:text-foreground transition-colors cursor-pointer"
                title="Italic"
              >
                <Italic className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting("> ")}
                className="p-2 rounded-lg hover:bg-background hover:text-foreground transition-colors cursor-pointer"
                title="Quote"
              >
                <Quote className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting("### ")}
                className="p-2 rounded-lg hover:bg-background hover:text-foreground transition-colors cursor-pointer"
                title="Heading"
              >
                <Heading className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting("- ")}
                className="p-2 rounded-lg hover:bg-background hover:text-foreground transition-colors cursor-pointer"
                title="List item"
              >
                <List className="size-4" />
              </button>
              <div className="ml-auto flex items-center gap-3 pr-2 text-xs font-sans text-muted-foreground shrink-0">
                <span>{words} words</span>
                <span>·</span>
                <span>{readTime}</span>
                <span>·</span>
                <span>{body.length} / 5,000</span>
              </div>
            </div>

            {/* Body Textarea */}
            <textarea
              ref={bodyTextareaRef}
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, 5000))}
              placeholder={
                postMode === "poetry"
                  ? "Compose your poem here...\nStanzas and linebreaks are naturally preserved."
                  : postMode === "story"
                    ? "Start writing your essay or story..."
                    : "Share what's on your mind..."
              }
              className={cn(
                "w-full bg-transparent min-h-[360px] text-base leading-relaxed font-sans text-foreground placeholder:text-muted-foreground/50 border-none outline-none resize-none p-1",
                postMode === "poetry" && "font-serif italic text-lg leading-loose",
              )}
            />

            {/* Topic Tags Selector */}
            <div className="pt-3 border-t border-border/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-sans font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Hash className="size-3.5 text-primary" /> Topic Tags
                </span>
                <span className="text-xs text-muted-foreground">Select topics for discovery</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_TAGS.map((tag) => {
                  const active = tags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-sans font-medium transition-all cursor-pointer",
                        active
                          ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/50",
                      )}
                    >
                      #{tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <p className="text-sm font-sans font-medium text-destructive">{error}</p>
            )}

            {/* Draft Reset Button */}
            <div className="flex justify-end pt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="text-xs font-sans text-muted-foreground hover:text-destructive gap-1.5"
              >
                <RotateCcw className="size-3.5" />
                Clear draft
              </Button>
            </div>
          </div>
        ) : (
          /* ── Live Preview Mode ────────────────────────────── */
          <div className="rounded-2xl border border-border/70 p-5 bg-card/50 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <Avatar className="size-10 ring-1 ring-border">
                {getAvatarUrl(profile?.avatarUrl) && (
                  <AvatarImage src={getAvatarUrl(profile?.avatarUrl)!} alt={profile?.name ?? "User"} />
                )}
                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                  {profile?.name ? initialsOf(profile.name) : "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-bold font-sans text-foreground">{profile?.name ?? "You"}</p>
                <p className="text-xs text-muted-foreground font-sans">@{profile?.handle ?? "you"} · Just now · {readTime}</p>
              </div>
            </div>

            {title.trim() && (
              <h2 className="text-xl font-bold font-sans text-foreground">{title}</h2>
            )}

            <div
              className={cn(
                "text-sm sm:text-base leading-relaxed text-foreground whitespace-pre-line",
                postMode === "poetry" && "font-serif italic leading-loose",
              )}
            >
              {renderInline(body || "Your post content preview will appear here.")}
            </div>

            <div className="flex flex-wrap gap-1.5 pt-2">
              {tags.map((t) => (
                <span key={t} className="text-xs font-sans font-medium text-primary">
                  #{t}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
