import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Bold, Italic, List, Quote, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { TopicChip } from "@/components/post-card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useInkline } from "@/lib/inkline-context";

export const Route = createFileRoute("/create")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Write — Wryto" },
      { name: "description", content: "Compose and publish a new piece on Wryto." },
      { property: "og:title", content: "Write — Wryto" },
      { property: "og:description", content: "Compose and publish a new piece on Wryto." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CreatePage,
});

function CreatePage() {
  const navigate = useNavigate();
  const { publishPost, user, loading } = useInkline();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState<string[]>(["essay"]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/auth", replace: true });
  }, [loading, user, navigate]);

  async function publish() {
    if (!body.trim() || busy) return;
    setBusy(true);
    setError(null);
    const id = await publishPost({
      ...(title.trim() ? { title: title.trim() } : {}),
      body: body.trim(),
      tags,
    });
    setBusy(false);
    if (!id) {
      setError("We couldn't publish that piece. Please try again.");
      return;
    }
    await navigate({ to: "/post/$id", params: { id } });
  }

  return (
    <AppShell
      title="New piece"
      action={
        <Button size="sm" disabled={!body.trim() || busy} onClick={() => void publish()}>
          {busy ? "Publishing…" : "Publish"}
        </Button>
      }
    >
      <div className="px-5 py-6 sm:px-8">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-transparent font-display text-3xl font-semibold outline-none placeholder:text-muted-foreground sm:text-4xl"
          placeholder="Title (optional)"
          aria-label="Post title"
        />
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, 5000))}
          className="mt-5 min-h-72 resize-none border-0 p-0 font-reading text-lg leading-8 shadow-none focus-visible:ring-0"
          placeholder="Tell your story…"
          aria-label="Post body"
        />
        <div className="flex items-center gap-1 border-y border-border py-3">
          <Button variant="ghost" size="icon" title="Bold">
            <Bold />
          </Button>
          <Button variant="ghost" size="icon" title="Italic">
            <Italic />
          </Button>
          <Button variant="ghost" size="icon" title="Quote">
            <Quote />
          </Button>
          <Button variant="ghost" size="icon" title="List">
            <List />
          </Button>
          <span className="ml-auto text-xs text-muted-foreground">{body.length} / 5000</span>
        </div>
        <div className="mt-6">
          <p className="mb-3 text-xs font-semibold uppercase text-muted-foreground">Topics</p>
          <div className="flex flex-wrap gap-2">
            {["essay", "poetry", "story", "reflection"].map((tag) =>
              tags.includes(tag) ? (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground"
                >
                  #{tag}
                  <button onClick={() => setTags(tags.filter((item) => item !== tag))}>
                    <X className="size-3" />
                  </button>
                </span>
              ) : (
                <TopicChip key={tag} onClick={() => setTags([...tags, tag])}>{`#${tag}`}</TopicChip>
              ),
            )}
          </div>
        </div>
        {error && <p className="mt-6 text-sm text-destructive">{error}</p>}
        <p className="mt-10 text-sm text-muted-foreground">Text only — no images or video.</p>
      </div>
    </AppShell>
  );
}
