import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Bold,
  Check,
  Eye,
  Heading,
  Italic,
  List,
  Loader2,
  PenLine,
  Quote,
  RotateCcw,
  X,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getAvatarUrl } from "@/lib/avatar";
import { initialsOf } from "@/lib/inkline-data";
import { useInkline } from "@/lib/inkline-context";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/create")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Write — Wryto" },
      { name: "description", content: "Compose and publish a thoughtful manuscript on Wryto." },
      { property: "og:title", content: "Write — Wryto" },
      { property: "og:description", content: "Compose and publish a thoughtful manuscript on Wryto." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: CreateErrorComponent,
  component: CreatePage,
});

function CreateErrorComponent() {
  return (
    <AppShell title="Write">
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
        <h2 className="text-xl font-bold font-display">Unable to load the editor</h2>
        <p className="max-w-md text-sm text-muted-foreground font-sans">
          There was an issue opening the writing studio. Please refresh to try again.
        </p>
        <Button onClick={() => window.location.reload()}>Reload Studio</Button>
      </div>
    </AppShell>
  );
}

const AVAILABLE_TAGS = [
  "essay",
  "poetry",
  "story",
  "philosophy",
  "culture",
  "craft",
  "memoir",
] as const;

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
    lastIdx = regex.lastIndex;
  }
  if (lastIdx < text.length) {
    parts.push(text.slice(lastIdx));
  }
  return parts.length > 0 ? parts : text;
}

function renderStoryContent(body: string) {
  const normalized = body.replace(/\r\n/g, "\n");
  const rawBlocks = normalized
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  const blocks = rawBlocks.length > 0 ? rawBlocks : [body.trim()];
  let firstParagraphRendered = false;

  return (
    <div className="space-y-6 sm:space-y-7">
      {blocks.map((block, idx) => {
        // Blockquote
        if (block.startsWith(">")) {
          const quoteLines = block
            .split("\n")
            .map((line) => line.replace(/^>\s?/, ""))
            .join("\n");
          return (
            <blockquote
              key={idx}
              className="border-l-2 border-primary pl-6 sm:pl-8 my-8 sm:my-10 italic font-display text-xl sm:text-2xl text-foreground/85 leading-relaxed whitespace-pre-line"
            >
              {renderInline(quoteLines)}
            </blockquote>
          );
        }

        // Heading 3
        if (block.startsWith("### ")) {
          return (
            <h3
              key={idx}
              className="font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground pt-4 pb-1"
            >
              {renderInline(block.slice(4))}
            </h3>
          );
        }

        // Heading 2
        if (block.startsWith("## ")) {
          return (
            <h2
              key={idx}
              className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground pt-6 pb-2"
            >
              {renderInline(block.slice(3))}
            </h2>
          );
        }

        // Heading 1
        if (block.startsWith("# ")) {
          return (
            <h2
              key={idx}
              className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground pt-6 pb-2"
            >
              {renderInline(block.slice(2))}
            </h2>
          );
        }

        // Unordered List
        if (block.split("\n").every((line) => line.startsWith("- ") || line.startsWith("* "))) {
          const items = block.split("\n").map((line) => line.replace(/^[-*]\s+/, ""));
          return (
            <ul
              key={idx}
              className="list-disc list-inside space-y-2.5 my-4 pl-2 font-reading text-lg sm:text-xl leading-[1.85] text-foreground/90"
            >
              {items.map((item, itemIdx) => (
                <li key={itemIdx}>{renderInline(item)}</li>
              ))}
            </ul>
          );
        }

        // Regular Paragraph with drop-cap on the first prose paragraph
        const isFirst = !firstParagraphRendered;
        firstParagraphRendered = true;

        if (isFirst) {
          return (
            <p
              key={idx}
              className="font-reading text-lg sm:text-xl leading-[1.85] text-foreground/90 whitespace-pre-line first-letter:float-left first-letter:text-5xl first-letter:font-display first-letter:mr-3 first-letter:text-primary first-letter:leading-none first-letter:pt-1 selection:bg-primary/20"
            >
              {renderInline(block)}
            </p>
          );
        }

        return (
          <p
            key={idx}
            className="font-reading text-lg sm:text-xl leading-[1.85] text-foreground/90 whitespace-pre-line selection:bg-primary/20"
          >
            {renderInline(block)}
          </p>
        );
      })}
    </div>
  );
}

function CreatePage() {
  const navigate = useNavigate();
  const { publishPost, user, profile, loading } = useInkline();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState<string[]>(["essay"]);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Autosave state
  const draftKey = `wryto_draft_${user?.id || "guest"}`;
  const [draftRestored, setDraftRestored] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Textarea DOM refs
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      void navigate({ to: "/auth", replace: true });
    }
  }, [loading, user, navigate]);

  // Restore draft on initial load or user switch
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed) {
          if (typeof parsed.title === "string") setTitle(parsed.title);
          if (typeof parsed.body === "string") setBody(parsed.body);
          if (Array.isArray(parsed.tags) && parsed.tags.length > 0) {
            setTags(parsed.tags);
          }
          if (parsed.savedAt) {
            setLastSaved(new Date(parsed.savedAt));
          }
          setSaveStatus("saved");
        }
      }
    } catch (err) {
      console.warn("Unable to restore draft from localStorage:", err);
    } finally {
      setDraftRestored(true);
    }
  }, [draftKey]);

  // Debounced autosave
  useEffect(() => {
    if (!draftRestored || typeof window === "undefined") return;

    const hasContent = Boolean(title.trim() || body.trim());
    if (!hasContent) {
      setSaveStatus("idle");
      return;
    }

    setSaveStatus("saving");
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(
          draftKey,
          JSON.stringify({
            title,
            body,
            tags,
            savedAt: Date.now(),
          }),
        );
        setSaveStatus("saved");
        setLastSaved(new Date());
      } catch (err) {
        console.warn("Failed to autosave draft:", err);
      }
    }, 750);

    return () => clearTimeout(timer);
  }, [title, body, tags, draftRestored, draftKey]);

  // Auto-resize title
  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.height = "auto";
      titleRef.current.style.height = `${titleRef.current.scrollHeight}px`;
    }
  }, [title]);

  // Auto-resize body textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.max(420, textareaRef.current.scrollHeight)}px`;
    }
  }, [body, mode]);

  // Markdown formatting handler
  const applyFormatting = (format: "header" | "bold" | "italic" | "quote" | "list") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart ?? body.length;
    const end = textarea.selectionEnd ?? body.length;
    const selected = body.slice(start, end);
    const before = body.slice(0, start);
    const after = body.slice(end);

    let replacement = "";
    let selectionOffsetStart = 0;
    let selectionOffsetEnd = 0;

    switch (format) {
      case "header": {
        const needsNewline = start > 0 && !before.endsWith("\n\n");
        const prefix = needsNewline ? (before.endsWith("\n") ? "\n# " : "\n\n# ") : "# ";
        const content = selected || "Heading";
        replacement = `${prefix}${content}\n\n`;
        selectionOffsetStart = prefix.length;
        selectionOffsetEnd = prefix.length + content.length;
        break;
      }
      case "bold": {
        const content = selected || "bold text";
        replacement = `**${content}**`;
        selectionOffsetStart = 2;
        selectionOffsetEnd = 2 + content.length;
        break;
      }
      case "italic": {
        const content = selected || "italic text";
        replacement = `*${content}*`;
        selectionOffsetStart = 1;
        selectionOffsetEnd = 1 + content.length;
        break;
      }
      case "quote": {
        const needsNewline = start > 0 && !before.endsWith("\n\n");
        const prefix = needsNewline ? (before.endsWith("\n") ? "\n> " : "\n\n> ") : "> ";
        const content = selected || "A thoughtful reflection or citation...";
        replacement = `${prefix}${content}\n\n`;
        selectionOffsetStart = prefix.length;
        selectionOffsetEnd = prefix.length + content.length;
        break;
      }
      case "list": {
        const needsNewline = start > 0 && !before.endsWith("\n\n");
        const prefix = needsNewline ? (before.endsWith("\n") ? "\n- " : "\n\n- ") : "- ";
        const content = selected || "List item";
        replacement = `${prefix}${content}\n`;
        selectionOffsetStart = prefix.length;
        selectionOffsetEnd = prefix.length + content.length;
        break;
      }
    }

    const nextBody = before + replacement + after;
    if (nextBody.length > 5000) {
      toast.error("Manuscript cannot exceed 5,000 characters.");
      return;
    }

    setBody(nextBody);

    requestAnimationFrame(() => {
      textarea.focus();
      if (selected.length > 0) {
        const cursorAfter = start + replacement.length;
        textarea.setSelectionRange(cursorAfter, cursorAfter);
      } else {
        textarea.setSelectionRange(start + selectionOffsetStart, start + selectionOffsetEnd);
      }
    });
  };

  // Word count and read time
  const wordCount = body.trim() ? body.trim().split(/\s+/).filter(Boolean).length : 0;
  const readMinutes = Math.max(1, Math.ceil(wordCount / 200));
  const wordCountLabel = `${wordCount} ${wordCount === 1 ? "word" : "words"} · ~${readMinutes} min read`;

  // Tag toggler
  const toggleTag = (tag: string) => {
    if (tags.includes(tag)) {
      if (tags.length === 1) {
        toast.info("At least one topic tag is recommended.");
        return;
      }
      setTags(tags.filter((t) => t !== tag));
    } else {
      setTags([...tags, tag]);
    }
  };

  // Clear draft
  const clearDraft = () => {
    if (!title.trim() && !body.trim()) return;
    if (!window.confirm("Discard this draft? All unsaved title and content will be cleared.")) {
      return;
    }
    setTitle("");
    setBody("");
    setTags(["essay"]);
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // ignore
    }
    setSaveStatus("idle");
    setLastSaved(null);
    toast.info("Draft discarded");
  };

  // Publish manuscript
  const publish = async () => {
    if (!body.trim() || busy) return;
    setBusy(true);
    setError(null);

    const id = await publishPost({
      ...(title.trim() ? { title: title.trim() } : {}),
      body: body.trim(),
      tags: tags.length > 0 ? tags : ["essay"],
    });

    setBusy(false);
    if (!id) {
      setError("We couldn't publish your story. Please try again.");
      return;
    }

    // Clear draft from localStorage once successfully published
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // ignore
    }

    toast.success("Manuscript published successfully");
    await navigate({ to: "/post/$id", params: { id } });
  };

  // Author details for preview attribution
  const authorName =
    profile?.name || user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Writer";
  const authorHandle = profile?.handle || user?.user_metadata?.handle || "writer";
  const authorInitials = profile?.initials || initialsOf(authorName);
  const kicker = tags.length > 0 ? tags[0].replace(/^#/, "").toUpperCase() : "ESSAY";

  return (
    <AppShell
      title="Manuscript Studio"
      action={
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            disabled={!body.trim() || busy}
            onClick={() => void publish()}
            className="h-9 min-h-[44px] sm:min-h-0 rounded-full bg-primary px-4 sm:px-5 text-xs sm:text-sm font-sans font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {busy ? (
              <>
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                <span>Publishing…</span>
              </>
            ) : (
              <>
                <PenLine className="mr-1.5 size-3.5" />
                <span>Publish Story</span>
              </>
            )}
          </Button>
        </div>
      }
    >
      {/* Studio Helper Bar */}
      <div className="sticky top-16 z-10 border-b border-border/50 bg-background/90 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 sm:px-8 py-2 flex items-center justify-between gap-3 flex-wrap">
          {/* Left: Mode toggle (Edit / Preview) & Formatting buttons */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Mode switch tabs */}
            <div className="inline-flex items-center rounded-lg bg-muted/60 p-0.5 border border-border/50">
              <button
                type="button"
                onClick={() => setMode("edit")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-sans font-medium transition-all min-h-[36px] sm:min-h-0 cursor-pointer",
                  mode === "edit"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground",
                )}
                aria-label="Edit mode"
              >
                <PenLine className="size-3.5" />
                <span>Edit</span>
              </button>
              <button
                type="button"
                onClick={() => setMode("preview")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-sans font-medium transition-all min-h-[36px] sm:min-h-0 cursor-pointer",
                  mode === "preview"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground",
                )}
                aria-label="Preview mode"
              >
                <Eye className="size-3.5" />
                <span>Preview</span>
              </button>
            </div>

            {/* Formatting Toolbar (active in Edit mode) */}
            {mode === "edit" && (
              <div className="flex items-center gap-0.5 border-l border-border/60 pl-2 sm:pl-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  title="Header (#)"
                  aria-label="Heading formatting"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyFormatting("header")}
                  className="size-8 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 cursor-pointer"
                >
                  <Heading className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  title="Bold (**text**)"
                  aria-label="Bold formatting"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyFormatting("bold")}
                  className="size-8 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 cursor-pointer"
                >
                  <Bold className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  title="Italic (*text*)"
                  aria-label="Italic formatting"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyFormatting("italic")}
                  className="size-8 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 cursor-pointer"
                >
                  <Italic className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  title="Quote (>)"
                  aria-label="Quote formatting"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyFormatting("quote")}
                  className="size-8 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 cursor-pointer"
                >
                  <Quote className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  title="List (-)"
                  aria-label="List formatting"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyFormatting("list")}
                  className="size-8 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 cursor-pointer"
                >
                  <List className="size-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Right: Autosave status, Clear draft, Word count & read time */}
          <div className="flex items-center gap-3 text-xs font-sans text-muted-foreground ml-auto">
            {/* Draft status indicator */}
            <div
              className="flex items-center gap-1.5"
              title={lastSaved ? `Draft last saved at ${lastSaved.toLocaleTimeString()}` : "Autosave enabled"}
            >
              {saveStatus === "saving" && (
                <span className="inline-flex items-center gap-1 text-primary">
                  <Loader2 className="size-3 animate-spin" />
                  <span className="hidden sm:inline">Saving…</span>
                </span>
              )}
              {saveStatus === "saved" && (
                <span className="inline-flex items-center gap-1 text-primary">
                  <Check className="size-3.5 text-primary stroke-[2.5]" />
                  <span className="hidden sm:inline">Draft saved</span>
                </span>
              )}
            </div>

            {/* Clear draft option */}
            {(title.trim() || body.trim()) && (
              <button
                type="button"
                onClick={clearDraft}
                className="inline-flex items-center gap-1 text-muted-foreground hover:text-destructive transition-colors py-1 px-1.5 rounded min-h-[36px] sm:min-h-0 cursor-pointer"
                title="Discard draft"
                aria-label="Clear manuscript draft"
              >
                <RotateCcw className="size-3" />
                <span className="hidden md:inline">Reset</span>
              </button>
            )}

            {/* Word count & reading time pill */}
            <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-muted/50 px-2.5 py-1 text-[11px] font-medium text-muted-foreground border border-border/40">
              <span>{wordCountLabel}</span>
              <span className="text-border">·</span>
              <span className={cn(body.length > 4800 && "text-amber-500 font-semibold")}>
                {body.length} / 5,000
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Centered Typewriter Manuscript Canvas */}
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
        {mode === "edit" ? (
          <div className="space-y-6">
            {/* Title Input */}
            <textarea
              ref={titleRef}
              rows={1}
              value={title}
              maxLength={150}
              onChange={(e) => setTitle(e.target.value.replace(/[\r\n]/g, " ").slice(0, 150))}
              placeholder="Title (optional)"
              aria-label="Story title"
              className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-foreground placeholder:text-muted-foreground/40 border-none outline-none bg-transparent w-full leading-tight resize-none focus-visible:ring-0 p-0 shadow-none overflow-hidden"
            />

            {/* Body Textarea */}
            <Textarea
              ref={textareaRef}
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, 5000))}
              placeholder="Tell your story… Write in natural paragraphs or use markdown formatting."
              aria-label="Story manuscript body"
              className="font-reading text-lg sm:text-xl leading-[1.85] text-foreground placeholder:text-muted-foreground/40 border-none outline-none bg-transparent min-h-[420px] resize-none w-full focus-visible:ring-0 p-0 shadow-none selection:bg-primary/20"
            />

            {/* Mobile Word Count summary */}
            <div className="sm:hidden flex items-center justify-between py-2 text-xs font-sans text-muted-foreground border-t border-border/40">
              <span>{wordCountLabel}</span>
              <span className={cn(body.length > 4800 && "text-amber-500 font-semibold")}>
                {body.length} / 5,000
              </span>
            </div>

            {/* Topic Tags Selector */}
            <div className="pt-6 border-t border-border/50">
              <p className="mb-3 text-xs font-sans font-semibold uppercase tracking-wider text-muted-foreground">
                Topic Category
              </p>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_TAGS.map((tag) => {
                  const isSelected = tags.includes(tag);
                  return isSelected ? (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 rounded-full border border-primary bg-primary px-3.5 py-1.5 text-xs font-sans font-semibold text-primary-foreground shadow-xs transition-all"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className="rounded-full p-0.5 hover:bg-primary-foreground/20 transition-colors cursor-pointer min-h-[24px] min-w-[24px] flex items-center justify-center"
                        aria-label={`Remove #${tag} tag`}
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ) : (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className="rounded-full border border-border/60 bg-muted/30 px-3.5 py-1.5 text-xs font-sans font-medium text-muted-foreground hover:border-border hover:bg-muted/70 hover:text-foreground transition-all cursor-pointer min-h-[36px] sm:min-h-0 flex items-center justify-center"
                    >
                      #{tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {error && <p className="mt-4 text-sm font-sans text-destructive">{error}</p>}

            <p className="pt-4 text-xs font-sans text-muted-foreground/70">
              Distraction-free manuscript editor. Markdown formatting is supported (# header, **bold**, *italic*, &gt; quote, - list).
            </p>
          </div>
        ) : (
          /* Preview Mode Matching /post/$id */
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Category Kicker */}
            <div className="mb-3">
              <span className="text-xs font-sans tracking-widest text-primary uppercase font-semibold inline-block">
                {kicker}
              </span>
            </div>

            {/* Story Headline */}
            {title.trim() ? (
              <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-foreground leading-[1.18] mb-6 sm:mb-8">
                {title.trim()}
              </h1>
            ) : (
              <h1 className="font-display text-2xl sm:text-3xl font-semibold italic text-muted-foreground/60 mb-6">
                Untitled Manuscript
              </h1>
            )}

            {/* Byline Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 border-y border-border/60">
              <div className="flex items-center gap-3.5 min-w-0">
                <Avatar className="size-11 sm:size-12 rounded-full border border-border/80 shadow-xs">
                  {profile?.avatarUrl && (
                    <AvatarImage
                      src={getAvatarUrl(profile.avatarUrl) || undefined}
                      alt={authorName}
                      className="object-cover"
                    />
                  )}
                  <AvatarFallback className="bg-accent text-sm font-semibold text-accent-foreground font-sans">
                    {authorInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground text-sm sm:text-base font-sans">
                      {authorName}
                    </span>
                    <span className="text-xs font-sans text-muted-foreground">
                      @{authorHandle}
                    </span>
                  </div>
                  {profile?.bio && (
                    <p className="text-xs font-sans text-muted-foreground line-clamp-1 mt-0.5 max-w-md">
                      {profile.bio}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-xs font-sans text-muted-foreground mt-1">
                    <span>Today · Manuscript Draft</span>
                    <span className="text-muted-foreground/60 select-none">·</span>
                    <span>{readMinutes} min read</span>
                  </div>
                </div>
              </div>

              <div className="inline-flex items-center gap-1.5 text-xs font-sans font-medium text-primary bg-primary/10 px-3 py-1.5 rounded-full self-start sm:self-center">
                <Eye className="size-3.5" />
                <span>Reading Preview</span>
              </div>
            </div>

            {/* Body Content with drop-cap and reading typography */}
            {body.trim() ? (
              <div className="pt-2">
                {renderStoryContent(body)}
              </div>
            ) : (
              <div className="py-16 text-center text-muted-foreground/60 font-reading text-lg italic">
                Your story body is currently empty. Switch back to Edit to begin writing.
              </div>
            )}

            {/* Tags footer */}
            {tags.length > 0 && (
              <div className="pt-8 border-t border-border/60 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs font-sans font-medium text-muted-foreground bg-muted/40 px-3 py-1 rounded-full border border-border/50"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
