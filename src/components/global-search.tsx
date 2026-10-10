import { useState, useEffect, useRef, useTransition } from "react";
import { Search, Loader2, User, BookOpen, X, ArrowRight } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/lib/user-settings";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initialsOf } from "@/lib/inkline-data";
import { getAvatarUrl } from "@/lib/avatar";
import { cn } from "@/lib/utils";

interface WriterResult {
  id: string;
  handle: string;
  display_name: string;
  bio: string | null;
  avatar_url?: string | null;
}

interface PostResult {
  id: string;
  title: string | null;
  body: string;
  tags: string[];
  author?: {
    display_name: string;
    handle: string;
  } | null;
}

export function GlobalSearch({
  className,
  mobile = false,
}: {
  className?: string;
  mobile?: boolean;
}) {
  const { t } = useSettings();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [writers, setWriters] = useState<WriterResult[]>([]);
  const [posts, setPosts] = useState<PostResult[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, startTransition] = useTransition();

  // Debounced search (300ms)
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setWriters([]);
      setPosts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const handler = setTimeout(async () => {
      try {
        const [writersRes, postsRes] = await Promise.all([
          supabase
            .from("profiles")
            .select("id, handle, display_name, bio, avatar_url")
            .or(`handle.ilike.%${trimmed}%,display_name.ilike.%${trimmed}%,bio.ilike.%${trimmed}%`)
            .limit(4),
          supabase
            .from("posts")
            .select(
              "id, title, body, tags, author:profiles!posts_author_id_fkey(display_name, handle)",
            )
            .or(`title.ilike.%${trimmed}%,body.ilike.%${trimmed}%`)
            .limit(4),
        ]);

        startTransition(() => {
          setWriters((writersRes.data ?? []) as WriterResult[]);
          setPosts((postsRes.data ?? []) as unknown as PostResult[]);
          setLoading(false);
        });
      } catch (err) {
        console.error("Search error:", err);
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [query]);

  // Click outside listener to dismiss dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectWriter = (handle: string) => {
    setOpen(false);
    setQuery("");
    void navigate({ to: "/profile/$handle", params: { handle } });
  };

  const handleSelectPost = (id: string) => {
    setOpen(false);
    setQuery("");
    void navigate({ to: "/post/$id", params: { id } });
  };

  const handleViewAll = () => {
    if (!query.trim()) return;
    setOpen(false);
    void navigate({ to: "/discover", search: { q: query.trim() } });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    } else if (e.key === "Enter") {
      handleViewAll();
    }
  };

  const hasResults = writers.length > 0 || posts.length > 0;

  return (
    <div ref={containerRef} className={cn("relative w-full max-w-md", className)}>
      <div className="relative flex items-center">
        <Search className="pointer-events-none absolute left-3.5 size-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (query.trim()) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={t("searchPlaceholder")}
          className={cn(
            "h-10 w-full rounded-full border border-border/80 bg-background/70 pl-10 pr-9 text-sm text-foreground shadow-sm backdrop-blur-md transition-all placeholder:text-muted-foreground/80 focus:border-primary/60 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20",
            mobile && "h-9 text-xs",
          )}
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setOpen(false);
            }}
            className="absolute right-3 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        ) : (
          <span className="pointer-events-none absolute right-3 hidden text-[10px] font-medium text-muted-foreground/60 sm:inline-block">
            ⌘K
          </span>
        )}
      </div>

      {/* Dropdown Results */}
      {open && query.trim() && (
        <div className="glass animate-in fade-in-50 zoom-in-95 absolute inset-x-0 top-full z-50 mt-2 max-h-[480px] overflow-hidden rounded-2xl border border-border/90 shadow-2xl backdrop-blur-xl">
          {loading && !hasResults ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin text-primary" />
              <span>Searching...</span>
            </div>
          ) : !hasResults ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <p>
                {t("noSearchResults")}{" "}
                <span className="font-semibold text-foreground">"{query}"</span>
              </p>
              <button
                type="button"
                onClick={handleViewAll}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                {t("viewAllResults")} <ArrowRight className="size-3" />
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border/60 overflow-y-auto">
              {/* Writers Section */}
              {writers.length > 0 && (
                <div className="p-2">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    <User className="size-3 text-primary" /> {t("searchWriters")}
                  </div>
                  {writers.map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => handleSelectWriter(w.handle)}
                      className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-accent/70"
                    >
                      <Avatar className="size-9 shrink-0">
                        {getAvatarUrl(w.avatar_url) && (
                          <AvatarImage
                            src={getAvatarUrl(w.avatar_url)!}
                            alt={w.display_name}
                            className="object-cover"
                          />
                        )}
                        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                          {initialsOf(w.display_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {w.display_name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">@{w.handle}</p>
                        {w.bio && (
                          <p className="mt-0.5 truncate text-[11px] text-muted-foreground/80">
                            {w.bio}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Pieces / Posts Section */}
              {posts.length > 0 && (
                <div className="p-2">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    <BookOpen className="size-3 text-primary" /> {t("searchPosts")}
                  </div>
                  {posts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectPost(p.id)}
                      className="flex w-full flex-col gap-1 rounded-xl p-2.5 text-left transition-colors hover:bg-accent/70"
                    >
                      {p.title && (
                        <p className="truncate text-sm font-semibold text-foreground">{p.title}</p>
                      )}
                      <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {p.body}
                      </p>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground/80">
                        <span>by {p.author?.display_name ?? "Writer"}</span>
                        {p.tags?.length > 0 && (
                          <span className="font-medium text-primary">#{p.tags[0]}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Footer View All */}
              <div className="bg-muted/30 p-2">
                <button
                  type="button"
                  onClick={handleViewAll}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-accent"
                >
                  <span>
                    {t("viewAllResults")} for "{query}"
                  </span>
                  <ArrowRight className="size-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
