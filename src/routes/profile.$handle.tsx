import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Camera,
  Feather,
  LogOut,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Settings,
  UserX,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { FollowButton, PostCard } from "@/components/post-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BlockModal } from "@/components/block-modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { initialsOf, toWriter, type Writer } from "@/lib/inkline-data";
import { compressImageToDataUrl, getAvatarUrl } from "@/lib/avatar";
import { toast } from "sonner";
import { useInkline } from "@/lib/inkline-context";
import { useSettings } from "@/lib/user-settings";
import { cn } from "@/lib/utils";
import { fetchMutuals, MutualLine } from "@/components/profile-preview";
import { Skeleton } from "@/components/ui/skeleton";

const SITE = "https://textbloom-net.lovable.app";

export const Route = createFileRoute("/profile/$handle")({
  staticData: { sitemap: true },
  loader: async ({ params }) => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("handle, display_name, bio")
        .eq("handle", params.handle)
        .maybeSingle();
      return { meta: data };
    } catch {
      return { meta: null };
    }
  },
  head: ({ params, loaderData }) => {
    const m = loaderData?.meta;
    const url = `${SITE}/profile/${params.handle}`;
    const title = m ? `${m.display_name} (@${m.handle}) — Wryto` : "Writer profile — Wryto";
    const description =
      m?.bio?.slice(0, 155) ||
      (m
        ? `Read the latest writing from ${m.display_name} on Wryto.`
        : "Meet a writer and read their latest work on Wryto.");
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "profile" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: m
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "ProfilePage",
                url,
                mainEntity: {
                  "@type": "Person",
                  name: m.display_name,
                  alternateName: `@${m.handle}`,
                  ...(m.bio ? { description: m.bio } : {}),
                },
              }),
            },
          ]
        : [],
    };
  },
  errorComponent: ProfileErrorComponent,
  component: ProfilePage,
});

function ProfileErrorComponent() {
  return (
    <AppShell title="Profile">
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 my-auto min-h-[400px]">
        <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Profile Unavailable
        </h2>
        <p className="max-w-md font-reading text-sm text-muted-foreground leading-relaxed">
          We couldn't load this writer's profile. Please try refreshing or return to the feed.
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="rounded-full min-h-[44px]"
          >
            Refresh
          </Button>
          <Button asChild className="rounded-full min-h-[44px]">
            <Link to="/feed">Go to Feed</Link>
          </Button>
        </div>
      </div>
    </AppShell>
  );
}

function ProfilePage() {
  const { handle } = Route.useParams();
  const { posts, profile: me, user, signOut, refresh } = useInkline();
  const { t } = useSettings();
  const [tab, setTab] = useState<"pieces" | "about">("pieces");
  const [writer, setWriter] = useState<Writer | null>(null);
  const [counts, setCounts] = useState({ followers: 0, following: 0 });
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [mutual, setMutual] = useState<Awaited<ReturnType<typeof fetchMutuals>> | null>(null);
  const [followsYou, setFollowsYou] = useState(false);
  const [listState, setListState] = useState<"loading" | "error" | "ok">("loading");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ handle: "", display_name: "", bio: "", location: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [list, setList] = useState<null | "followers" | "following">(null);
  const [people, setPeople] = useState<
    { handle: string; display_name: string; avatar_url?: string | null }[]
  >([]);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const isMe = !!me && me.handle === handle;

  const load = useCallback(async () => {
    setLoadError(false);
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, handle, display_name, bio, location, avatar_url, profile_image, followers_count, following_count",
      )
      .eq("handle", handle)
      .maybeSingle();
    if (error) {
      setLoadError(true);
      setLoading(false);
      return;
    }
    if (!data) {
      setWriter(null);
      setLoading(false);
      return;
    }
    const found = toWriter(data);
    setWriter(found);
    setForm({
      handle: found.handle,
      display_name: found.name,
      bio: found.bio ?? "",
      location: found.location ?? "",
    });
    setCounts({ followers: data.followers_count, following: data.following_count });
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (uid && uid !== found.id) {
      const [m, f] = await Promise.all([
        fetchMutuals(found.id).catch(() => null),
        supabase
          .from("followers")
          .select("id", { head: true, count: "exact" })
          .eq("follower_id", found.id)
          .eq("following_id", uid),
      ]);
      setMutual(m);
      setFollowsYou((f.count ?? 0) > 0);
    } else {
      setMutual(null);
      setFollowsYou(false);
    }
    setAvatarUrl(getAvatarUrl(found.avatarUrl));
    setLoading(false);
  }, [handle, me]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    const onFollow = (event: Event) => {
      const {
        handle: target,
        delta,
        followerId,
      } = (event as CustomEvent<{ handle: string; delta: number; followerId: string }>).detail;
      setCounts((c) => ({
        followers: target === handle ? Math.max(0, c.followers + delta) : c.followers,
        following: writer?.id === followerId ? Math.max(0, c.following + delta) : c.following,
      }));
    };
    window.addEventListener("wryto-follow", onFollow);
    window.addEventListener("inkline-follow", onFollow);
    return () => {
      window.removeEventListener("wryto-follow", onFollow);
      window.removeEventListener("inkline-follow", onFollow);
    };
  }, [handle, writer?.id]);

  async function save() {
    if (!writer) return;
    const newHandle = form.handle.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(newHandle)) {
      setFormError("Username must be 3–20 characters: letters, numbers or underscores.");
      return;
    }
    if (!form.bio.trim()) {
      setFormError("Bio can't be empty.");
      return;
    }
    setFormError(null);
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        handle: newHandle,
        display_name: form.display_name.trim() || writer.name,
        bio: form.bio.trim(),
        location: form.location.trim() || null,
      })
      .eq("id", writer.id);
    setBusy(false);
    if (error) {
      setFormError(error.code === "23505" ? "That username is already taken." : error.message);
      return;
    }
    setEditing(false);
    await refresh();
    if (newHandle !== writer.handle)
      void navigate({ to: "/profile/$handle", params: { handle: newHandle } });
    else await load();
  }

  async function openList(kind: "followers" | "following") {
    if (!writer) return;
    setList(kind);
    setPeople([]);
    setListState("loading");
    const q =
      kind === "followers"
        ? supabase
            .from("followers")
            .select("p:profiles!followers_follower_id_fkey(handle, display_name, avatar_url)")
            .eq("following_id", writer.id)
        : supabase
            .from("followers")
            .select("p:profiles!followers_following_id_fkey(handle, display_name, avatar_url)")
            .eq("follower_id", writer.id);
    const { data, error } = await q.order("created_at", { ascending: false }).limit(200);
    if (error) {
      setListState("error");
      return;
    }
    setListState("ok");
    setPeople(
      (
        (data ?? []) as unknown as {
          p: { handle: string; display_name: string; avatar_url: string | null } | null;
        }[]
      ).flatMap((r) => (r.p ? [r.p] : [])),
    );
  }

  async function uploadAvatar(file: File) {
    if (!user || !writer || user.id !== writer.id) {
      toast.error("You can only change your own profile photo.");
      return;
    }
    setBusy(true);
    try {
      const ext =
        { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" }[
          file.type
        ] ||
        file.name.split(".").pop()?.toLowerCase() ||
        "jpg";
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be under 5 MB.");
        setBusy(false);
        return;
      }
      const path = `${user.id}/avatar.${ext}`;
      let finalAvatarUrl: string | null = null;

      // 1. Try Supabase Storage
      try {
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, file, { upsert: true, contentType: file.type });
        if (!uploadError) {
          const { data: pubData } = supabase.storage.from("avatars").getPublicUrl(path);
          if (pubData?.publicUrl) {
            finalAvatarUrl = `${pubData.publicUrl}?t=${Date.now()}`;
          }
        }
      } catch (err) {
        console.warn("Storage upload exception:", err);
      }

      // 2. Resilient fallback: compress to compact webp
      if (!finalAvatarUrl) {
        finalAvatarUrl = await compressImageToDataUrl(file);
      }

      // 3. Persist to profiles table (both avatar_url and profile_image)
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          avatar_url: finalAvatarUrl,
          profile_image: finalAvatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (updateError) {
        toast.error("Couldn't save profile photo in database.");
      } else {
        toast.success("Profile photo updated!");
        setAvatarUrl(finalAvatarUrl);
        await Promise.all([load(), refresh()]);
      }
    } catch {
      toast.error("An unexpected error occurred during photo upload.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <AppShell title="Profile">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start border-b border-border/60 pb-8">
            <Skeleton className="size-20 sm:size-24 rounded-full" />
            <div className="flex-1 space-y-3 pt-2 text-center sm:text-left">
              <Skeleton className="h-8 w-48 mx-auto sm:mx-0" />
              <Skeleton className="h-4 w-32 mx-auto sm:mx-0" />
              <Skeleton className="h-4 w-3/4 mx-auto sm:mx-0" />
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  if (loadError) {
    return (
      <AppShell title="Profile">
        <div className="mx-auto max-w-md px-6 py-20 text-center space-y-4">
          <p className="font-reading text-muted-foreground">Couldn't load this writer profile.</p>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full min-h-[44px]"
            onClick={() => {
              setLoading(true);
              void load();
            }}
          >
            Try again
          </Button>
        </div>
      </AppShell>
    );
  }

  if (!writer) {
    return (
      <AppShell title="Profile">
        <div className="mx-auto max-w-md px-6 py-20 text-center">
          <p className="font-reading text-muted-foreground">No writer found with that handle.</p>
          <Button asChild variant="outline" className="mt-4 rounded-full min-h-[44px]">
            <Link to="/discover">Discover Writers</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const writerPosts = posts.filter((post) => post.author.handle === writer.handle);
  const topics = Array.from(new Set(writerPosts.flatMap((p) => p.tags))).slice(0, 12);

  return (
    <AppShell title={writer.name}>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Author Header */}
        <header className="flex flex-col items-center gap-6 sm:flex-row sm:items-start text-center sm:text-left border-b border-border/60 pb-8">
          {/* Avatar with optional change photo trigger if viewing own profile */}
          <div className="relative group shrink-0">
            <Avatar className="size-20 sm:size-24 ring-2 ring-border/70 shadow-xs">
              {avatarUrl && (
                <AvatarImage src={avatarUrl} alt={writer.name} className="object-cover" />
              )}
              <AvatarFallback className="bg-primary/10 text-primary font-display text-2xl font-bold">
                {writer.initials}
              </AvatarFallback>
            </Avatar>
            {isMe && (
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={busy}
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100 cursor-pointer"
                title="Change profile photo"
                aria-label="Change profile photo"
              >
                <Camera className="size-5" />
              </button>
            )}
            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadAvatar(file);
              }}
            />
          </div>

          {/* Author Details & Bio */}
          <div className="min-w-0 flex-1">
            {editing ? (
              /* Inline Profile Editor */
              <div className="space-y-4 rounded-2xl border border-border/70 bg-card p-5 sm:p-6 text-left">
                <div className="border-b border-border/50 pb-2">
                  <h3 className="font-display text-lg font-bold text-foreground">Edit Profile</h3>
                  <p className="text-xs font-sans text-muted-foreground">
                    Update your public author persona and bio.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-sans font-medium text-muted-foreground uppercase tracking-wider block mb-1">
                      Handle / Username
                    </label>
                    <Input
                      value={form.handle}
                      onChange={(e) =>
                        setForm({ ...form, handle: e.target.value.toLowerCase().slice(0, 20) })
                      }
                      placeholder="username"
                      aria-label="Username"
                      className="h-10 text-sm font-sans"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-sans font-medium text-muted-foreground uppercase tracking-wider block mb-1">
                      Display Name
                    </label>
                    <Input
                      value={form.display_name}
                      onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                      placeholder="Display name"
                      aria-label="Display name"
                      className="h-10 text-sm font-sans"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-sans font-medium text-muted-foreground uppercase tracking-wider block mb-1">
                      Author Biography
                    </label>
                    <Textarea
                      value={form.bio}
                      onChange={(e) => setForm({ ...form, bio: e.target.value.slice(0, 280) })}
                      placeholder="Share a short note on your craft, themes, or life..."
                      aria-label="Bio"
                      className="min-h-[100px] text-sm font-reading leading-relaxed"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-sans font-medium text-muted-foreground uppercase tracking-wider block mb-1">
                      Location
                    </label>
                    <Input
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                      placeholder="City, Country"
                      aria-label="Location"
                      className="h-10 text-sm font-sans"
                    />
                  </div>

                  {formError && (
                    <p className="text-xs font-sans text-destructive py-1">{formError}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => fileInput.current?.click()}
                      className="rounded-full min-h-[44px] sm:min-h-0 text-xs font-sans"
                    >
                      Upload new photo
                    </Button>
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => void save()}
                      className="rounded-full min-h-[44px] sm:min-h-0 text-xs font-sans"
                    >
                      {busy ? "Saving…" : "Save changes"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() => setEditing(false)}
                      className="rounded-full min-h-[44px] sm:min-h-0 text-xs font-sans"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <h1 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-foreground">
                    {writer.name}
                  </h1>
                  <p className="text-sm font-sans text-muted-foreground flex items-center justify-center sm:justify-start gap-2">
                    <span>@{writer.handle}</span>
                    {followsYou && (
                      <span className="rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-xs font-sans text-muted-foreground font-normal">
                        Follows you
                      </span>
                    )}
                  </p>
                </div>

                {writer.bio && (
                  <p className="mt-3 font-reading text-base leading-relaxed max-w-2xl text-foreground/90">
                    {writer.bio}
                  </p>
                )}

                {/* Metadata & Follower Counts */}
                <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-x-5 gap-y-2 text-sm font-sans text-muted-foreground">
                  {writer.location && (
                    <span className="flex items-center gap-1.5 text-xs sm:text-sm">
                      <MapPin className="size-3.5 text-primary/70 shrink-0" />
                      <span>{writer.location}</span>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => void openList("followers")}
                    className="min-h-[44px] sm:min-h-0 flex items-center gap-1.5 text-xs sm:text-sm hover:text-foreground transition-colors cursor-pointer"
                  >
                    <strong className="font-semibold text-foreground">{counts.followers}</strong>{" "}
                    followers
                  </button>
                  <button
                    type="button"
                    onClick={() => void openList("following")}
                    className="min-h-[44px] sm:min-h-0 flex items-center gap-1.5 text-xs sm:text-sm hover:text-foreground transition-colors cursor-pointer"
                  >
                    <strong className="font-semibold text-foreground">{counts.following}</strong>{" "}
                    following
                  </button>
                </div>

                {mutual && (
                  <div className="mt-3">
                    <MutualLine {...mutual} />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="shrink-0 flex items-center gap-2 pt-1 sm:pt-0">
            {isMe ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(!editing)}
                  className="rounded-full min-h-[44px] sm:min-h-0 px-4 text-xs font-sans font-medium cursor-pointer"
                >
                  {editing ? t("cancel") : "Edit Profile"}
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="rounded-full min-h-[44px] sm:min-h-0 px-3.5 text-xs font-sans font-medium gap-1.5 cursor-pointer"
                >
                  <Link to="/settings">
                    <Settings className="size-3.5" />
                    <span>Settings</span>
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full min-h-[44px] sm:min-h-0 px-3 text-xs font-sans text-muted-foreground hover:text-destructive gap-1.5 cursor-pointer"
                  onClick={async () => {
                    await signOut();
                    await navigate({ to: "/auth", replace: true });
                  }}
                >
                  <LogOut className="size-3.5" />
                  <span>Sign out</span>
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <FollowButton handle={writer.handle} />
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="rounded-full min-h-[44px] sm:min-h-0 px-3.5 text-xs font-sans font-medium gap-1.5 border-border/80 cursor-pointer"
                >
                  <Link to="/messages" search={{ user: writer.id, handle: writer.handle }}>
                    <MessageCircle className="size-3.5" />
                    <span>Message</span>
                  </Link>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-9 rounded-full min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 border-border/80 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40 rounded-xl bg-card border-border/80 shadow-md">
                    <DropdownMenuItem
                      onClick={() => setBlockModalOpen(true)}
                      className="cursor-pointer gap-2 text-destructive focus:text-destructive text-xs font-sans"
                    >
                      <UserX className="size-4" />
                      <span>{t("block")}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </header>

        {/* Minimal Ink Underline Tab Navigation */}
        <nav aria-label="Profile navigation" className="border-b border-border/60">
          <div className="flex items-center gap-8">
            <button
              type="button"
              onClick={() => setTab("pieces")}
              className={cn(
                "relative pb-3 text-sm font-sans font-medium transition-colors min-h-[44px] flex items-center cursor-pointer",
                tab === "pieces"
                  ? "text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span>Published Pieces</span>
              <span className="ml-2 rounded-full bg-muted/60 px-2 py-0.5 text-xs font-sans text-muted-foreground font-normal">
                {writerPosts.length}
              </span>
              {tab === "pieces" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setTab("about")}
              className={cn(
                "relative pb-3 text-sm font-sans font-medium transition-colors min-h-[44px] flex items-center cursor-pointer",
                tab === "about"
                  ? "text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span>About</span>
              {tab === "about" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          </div>
        </nav>

        {/* Tab 1: Published Pieces */}
        {tab === "pieces" && (
          <section className="space-y-6">
            {writerPosts.length > 0 ? (
              <div className="divide-y divide-border/40">
                {writerPosts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            ) : (
              <div className="mx-auto max-w-md px-6 py-16 text-center">
                <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-6 ring-1 ring-primary/20">
                  <Feather className="size-6 stroke-[1.75]" />
                </div>
                <blockquote className="font-display italic text-lg sm:text-xl text-foreground/90 leading-relaxed">
                  “The scariest moment is always just before you start.”
                </blockquote>
                <p className="mt-2 text-xs font-sans tracking-widest uppercase text-primary font-medium">
                  — Stephen King
                </p>
                <p className="mt-4 font-reading text-sm text-muted-foreground leading-relaxed">
                  {isMe
                    ? "You haven't published any pieces yet. Share your first essay, poem, or story."
                    : "This author hasn't published any pieces yet."}
                </p>
                {isMe && (
                  <div className="mt-6 flex justify-center">
                    <Button
                      asChild
                      className="rounded-full px-6 py-2 text-xs font-sans font-medium min-h-[44px] flex items-center cursor-pointer"
                    >
                      <Link to="/create">Write a Piece</Link>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Tab 2: About the Author */}
        {tab === "about" && (
          <section className="space-y-8 rounded-2xl border border-border/70 bg-card p-6 sm:p-8">
            <div>
              <h2 className="text-xs font-sans font-semibold uppercase tracking-widest text-primary">
                Biography
              </h2>
              <p className="mt-3 font-reading text-base sm:text-lg leading-relaxed text-foreground/90">
                {writer.bio || "This writer has not added a detailed biography yet."}
              </p>
            </div>

            {topics.length > 0 && (
              <div className="border-t border-border/50 pt-6">
                <h2 className="text-xs font-sans font-semibold uppercase tracking-widest text-primary">
                  Themes & Topics
                </h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {topics.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-border/60 bg-muted/40 px-3.5 py-1 text-xs font-sans font-medium text-foreground/80"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-border/50 pt-6 space-y-3 text-sm font-sans text-muted-foreground">
              <h2 className="text-xs font-sans font-semibold uppercase tracking-widest text-primary">
                Dispatches Archive
              </h2>
              <p className="font-reading text-sm text-muted-foreground">
                Total published pieces:{" "}
                <strong className="font-semibold text-foreground">{writerPosts.length}</strong>
              </p>
              {writer.location && (
                <p className="font-reading text-sm text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-primary/70 shrink-0" />
                  <span>Based in {writer.location}</span>
                </p>
              )}
            </div>
          </section>
        )}

        {/* Block Confirmation Modal */}
        {writer && (
          <BlockModal
            targetId={writer.id}
            targetHandle={writer.handle}
            targetName={writer.name}
            open={blockModalOpen}
            onOpenChange={setBlockModalOpen}
          />
        )}

        {/* Followers / Following Dialog */}
        <Dialog open={!!list} onOpenChange={(o) => !o && setList(null)}>
          <DialogContent className="sm:max-w-md bg-card border-border/80 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-display text-xl font-bold">
                {list === "followers" ? "Followers" : "Following"}
              </DialogTitle>
            </DialogHeader>
            {listState === "loading" ? (
              <div className="space-y-3 py-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="size-10 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            ) : listState === "error" ? (
              <p className="py-6 text-center font-reading text-sm text-destructive">
                Couldn't load this list.
              </p>
            ) : people.length === 0 ? (
              <p className="py-6 text-center font-reading text-sm text-muted-foreground">
                No one here yet.
              </p>
            ) : (
              <ul className="max-h-80 space-y-1 overflow-y-auto divide-y divide-border/30">
                {people.map((p) => {
                  const avatarSrc = getAvatarUrl(p.avatar_url);
                  return (
                    <li key={p.handle} className="pt-1 first:pt-0">
                      <Link
                        to="/profile/$handle"
                        params={{ handle: p.handle }}
                        onClick={() => setList(null)}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/50 min-h-[44px]"
                      >
                        <Avatar className="size-10 shrink-0 ring-1 ring-border/50">
                          {avatarSrc && (
                            <AvatarImage
                              src={avatarSrc}
                              alt={p.display_name}
                              className="object-cover"
                            />
                          )}
                          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                            {initialsOf(p.display_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-display text-sm font-semibold text-foreground">
                            {p.display_name}
                          </p>
                          <p className="truncate text-xs font-sans text-muted-foreground">
                            @{p.handle}
                          </p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
