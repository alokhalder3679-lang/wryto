import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Calendar,
  Camera,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Pencil,
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
import { Skeleton } from "@/components/ui/skeleton";

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
    const url = `https://wryto-nine.vercel.app/profile/${params.handle}`;
    const writerName = (m?.display_name || m?.handle || "Writer").trim();
    const title = m ? `${writerName} (@${m.handle}) — Wryto` : "Writer Profile — Wryto";
    const description =
      m?.bio?.slice(0, 155) || "Read the latest thoughts and stories from this creator on Wryto.";
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
    };
  },
  errorComponent: ProfileErrorComponent,
  component: ProfilePage,
});

function ProfileErrorComponent({ error }: { error?: unknown }) {
  useEffect(() => {
    if (error) {
      console.error("[Wryto Profile Route Error]:", error);
    }
  }, [error]);

  return (
    <AppShell title="Profile">
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
        <h2 className="text-xl font-bold font-sans">Profile Unavailable</h2>
        <p className="max-w-md text-sm text-muted-foreground font-sans">
          We couldn't load this profile. Please try refreshing or return to the feed.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => window.location.reload()} className="rounded-xl min-h-[44px]">
            Refresh
          </Button>
          <Button asChild className="rounded-xl min-h-[44px]">
            <Link to="/feed">Go to Home</Link>
          </Button>
        </div>
      </div>
    </AppShell>
  );
}

function ProfilePage() {
  const { handle } = Route.useParams();
  const { posts, profile: me, user, refresh } = useInkline();
  const { t } = useSettings();
  const [tab, setTab] = useState<"posts" | "about">("posts");
  const [writer, setWriter] = useState<Writer | null>(null);
  const [counts, setCounts] = useState({ followers: 0, following: 0 });
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [followsYou, setFollowsYou] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ handle: "", display_name: "", bio: "", location: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [list, setList] = useState<null | "followers" | "following">(null);
  const [people, setPeople] = useState<
    { handle: string; display_name: string; avatar_url?: string | null }[]
  >([]);
  const [listState, setListState] = useState<"loading" | "error" | "ok">("loading");
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

    if (error || !data) {
      setWriter(null);
      setLoadError(true);
      setLoading(false);
      return;
    }

    const w = toWriter(data);
    setWriter(w);
    setAvatarUrl(w.avatarUrl);
    setCounts({
      followers: data.followers_count ?? 0,
      following: data.following_count ?? 0,
    });
    setForm({
      handle: w.handle,
      display_name: w.name,
      bio: w.bio ?? "",
      location: w.location ?? "",
    });

    if (user && w.id !== user.id) {
      const { data: followRel } = await supabase
        .from("followers")
        .select("follower_id")
        .eq("follower_id", w.id)
        .eq("following_id", user.id)
        .maybeSingle();
      setFollowsYou(!!followRel);
    } else {
      setFollowsYou(false);
    }

    setLoading(false);
  }, [handle, user]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    const onFollow = (event: Event) => {
      const { handle: target, delta } = (
        event as CustomEvent<{ handle: string; delta: number; followerId: string }>
      ).detail;
      setCounts((c) => ({
        ...c,
        followers: target === handle ? Math.max(0, c.followers + delta) : c.followers,
      }));
    };
    window.addEventListener("wryto-follow", onFollow);
    return () => window.removeEventListener("wryto-follow", onFollow);
  }, [handle]);

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
    toast.success("Profile updated!");
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

      if (!finalAvatarUrl) {
        finalAvatarUrl = await compressImageToDataUrl(file);
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          avatar_url: finalAvatarUrl,
          profile_image: finalAvatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (updateError) {
        toast.error("Couldn't save profile photo.");
      } else {
        toast.success("Profile photo updated!");
        setAvatarUrl(finalAvatarUrl);
        await Promise.all([load(), refresh()]);
      }
    } catch {
      toast.error("An error occurred during photo upload.");
    } finally {
      setBusy(false);
    }
  }

  const authorPosts = posts.filter((p) => p.author.handle === handle);

  if (loading) {
    return (
      <AppShell title="Profile">
        <div className="p-6 space-y-4">
          <Skeleton className="h-36 w-full rounded-2xl" />
          <div className="flex gap-4 items-end -mt-10 px-4">
            <Skeleton className="size-24 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  if (loadError || !writer) {
    return (
      <AppShell title="Profile">
        <div className="py-20 text-center px-6 space-y-3">
          <h2 className="text-xl font-bold font-sans">Writer Not Found</h2>
          <p className="text-sm text-muted-foreground font-sans">
            This account doesn't exist or may have changed their username.
          </p>
          <Button asChild className="rounded-xl text-xs font-semibold mt-3 min-h-[44px]" size="sm">
            <Link to="/feed">Return to Feed</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={writer.name}>
      {/* ── Profile Cover Banner (Subtle Liquid Glow) ──────────────── */}
      <div className="h-32 sm:h-44 w-full bg-gradient-to-r from-primary/15 via-primary/8 to-accent/20 relative border-b border-border/60">
        <div className="absolute inset-0 bg-radial-gradient from-transparent to-black/5" />
      </div>

      {/* ── Profile Details Section ───────────────────────────── */}
      <div className="px-4 sm:px-6 pb-4 border-b border-border/60 space-y-4">
        {/* Avatar & Action Row */}
        <div className="flex items-end justify-between -mt-12 sm:-mt-16">
          <div className="relative group">
            <Avatar className="size-24 sm:size-28 rounded-full ring-4 ring-background border-2 border-border/60 shadow-md">
              {getAvatarUrl(avatarUrl) && (
                <AvatarImage src={getAvatarUrl(avatarUrl)!} alt={writer.name} className="object-cover" />
              )}
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                {initialsOf(writer.name)}
              </AvatarFallback>
            </Avatar>

            {isMe && (
              <label
                className="absolute inset-0 size-full rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-white"
                title="Change profile photo"
              >
                <Camera className="size-6" />
                <input
                  type="file"
                  ref={fileInput}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadAvatar(f);
                  }}
                />
              </label>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {isMe ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(true)}
                  className="rounded-xl px-4 font-semibold text-xs min-h-[36px] border-border/80 spring-press"
                >
                  <Pencil className="size-3.5 mr-1.5" />
                  Edit Profile
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  size="icon"
                  className="size-9 rounded-xl text-muted-foreground hover:text-foreground spring-press"
                >
                  <Link to="/settings">
                    <Settings className="size-4" />
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <FollowButton handle={writer.handle} />
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-xs font-semibold min-h-[36px] px-3.5 border-border/80 spring-press"
                >
                  <Link
                    to="/messages"
                    search={{ user: writer.id, handle: writer.handle }}
                    className="flex items-center gap-1.5"
                  >
                    <MessageCircle className="size-3.5" />
                    <span>Message</span>
                  </Link>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-9 rounded-xl text-muted-foreground spring-press">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44 rounded-2xl liquid-glass p-1">
                    <DropdownMenuItem
                      onClick={() => setBlockModalOpen(true)}
                      className="cursor-pointer gap-2 text-xs rounded-xl px-2.5 py-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                    >
                      <UserX className="size-3.5" />
                      <span>Block @{writer.handle}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </div>

        {/* Identity & Bio */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-foreground">{writer.name}</h1>
            {followsYou && (
              <span className="px-2 py-0.5 rounded-lg bg-muted text-[10px] font-semibold text-muted-foreground">
                Follows you
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground font-mono">@{writer.handle}</p>

          {writer.bio && (
            <p className="text-sm text-foreground/90 leading-relaxed pt-1 max-w-xl">
              {writer.bio}
            </p>
          )}

          {writer.location && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
              <MapPin className="size-3.5 text-muted-foreground" />
              <span>{writer.location}</span>
            </div>
          )}
        </div>

        {/* Social Stats Counters (Apple Tabular Figures) */}
        <div className="flex items-center gap-5 pt-1 text-xs tabular-numbers">
          <div>
            <span className="font-bold text-foreground mr-1">{authorPosts.length}</span>
            <span className="text-muted-foreground">Posts</span>
          </div>
          <button
            type="button"
            onClick={() => void openList("following")}
            className="hover:underline cursor-pointer spring-press"
          >
            <span className="font-bold text-foreground mr-1">{counts.following}</span>
            <span className="text-muted-foreground">Following</span>
          </button>
          <button
            type="button"
            onClick={() => void openList("followers")}
            className="hover:underline cursor-pointer spring-press"
          >
            <span className="font-bold text-foreground mr-1">{counts.followers}</span>
            <span className="text-muted-foreground">Followers</span>
          </button>
        </div>
      </div>

      {/* ── Apple Liquid Glass Segmented Tab Bar ─────────────── */}
      <div className="sticky top-0 z-20 liquid-glass border-b border-border/60 p-2">
        <div className="flex p-1 rounded-2xl bg-muted/60 border border-border/50 max-w-md mx-auto">
          <button
            type="button"
            onClick={() => setTab("posts")}
            className={cn(
              "flex-1 py-1.5 text-center text-xs sm:text-sm rounded-xl transition-all spring-press cursor-pointer",
              tab === "posts"
                ? "bg-card text-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span>Posts ({authorPosts.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setTab("about")}
            className={cn(
              "flex-1 py-1.5 text-center text-xs sm:text-sm rounded-xl transition-all spring-press cursor-pointer",
              tab === "about"
                ? "bg-card text-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span>About</span>
          </button>
        </div>
      </div>

      {/* ── Tab Content Stream ────────────────────────────────── */}
      {tab === "posts" ? (
        authorPosts.length === 0 ? (
          <div className="py-16 text-center px-6 space-y-2">
            <p className="text-sm text-muted-foreground">
              @{writer.handle} hasn't published any posts yet.
            </p>
            {isMe && (
              <Button asChild size="sm" className="rounded-xl text-xs font-semibold mt-2 min-h-[40px]">
                <Link to="/create">Write Your First Post</Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {authorPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )
      ) : (
        /* About Tab */
        <div className="p-6 space-y-6">
          <div className="rounded-3xl border border-border/80 p-5 bg-card/85 backdrop-blur-md space-y-3 shadow-xs">
            <h3 className="text-sm font-bold text-foreground">Biography</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {writer.bio || "No biography provided yet."}
            </p>
          </div>

          <div className="rounded-3xl border border-border/80 p-5 bg-card/85 backdrop-blur-md space-y-2 shadow-xs">
            <h3 className="text-sm font-bold text-foreground">Details</h3>
            <div className="text-xs text-muted-foreground space-y-1.5 font-mono">
              <p>Username: @{writer.handle}</p>
              {writer.location && <p>Location: {writer.location}</p>}
              <p>Author ID: {writer.id}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Profile Modal ────────────────────────────────── */}
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="sm:max-w-md rounded-3xl liquid-glass">
          <DialogHeader>
            <DialogTitle className="font-bold text-lg">Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block uppercase tracking-wider">
                Display Name
              </label>
              <Input
                value={form.display_name}
                maxLength={50}
                onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                className="rounded-xl min-h-[44px]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block uppercase tracking-wider">
                Username
              </label>
              <Input
                value={form.handle}
                maxLength={20}
                onChange={(e) => setForm({ ...form, handle: e.target.value })}
                className="rounded-xl min-h-[44px] font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block uppercase tracking-wider">
                Bio
              </label>
              <Textarea
                value={form.bio}
                maxLength={240}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                className="rounded-xl min-h-[90px] resize-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block uppercase tracking-wider">
                Location
              </label>
              <Input
                value={form.location}
                maxLength={40}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="rounded-xl min-h-[44px]"
              />
            </div>
            {formError && <p className="text-xs text-destructive">{formError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(false)}
                className="rounded-xl min-h-[40px] spring-press"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => void save()}
                disabled={busy}
                className="rounded-xl font-semibold px-5 min-h-[40px] spring-press shadow-xs"
              >
                {busy ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Followers / Following Modal ───────────────────────── */}
      <Dialog open={list !== null} onOpenChange={(open) => !open && setList(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl liquid-glass">
          <DialogHeader>
            <DialogTitle className="font-bold capitalize text-base">
              {list} ({people.length})
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto divide-y divide-border/50 py-1">
            {listState === "loading" ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="size-10 rounded-full" />
                    <Skeleton className="h-4 w-32 rounded-md" />
                  </div>
                ))}
              </div>
            ) : people.length === 0 ? (
              <p className="p-6 text-center text-xs text-muted-foreground">
                No users found.
              </p>
            ) : (
              people.map((person) => (
                <div key={person.handle} className="flex items-center justify-between p-3 rounded-2xl hover:bg-muted/40 transition-colors">
                  <Link
                    to="/profile/$handle"
                    params={{ handle: person.handle }}
                    onClick={() => setList(null)}
                    className="flex items-center gap-2.5 min-w-0 flex-1 hover:underline"
                  >
                    <Avatar className="size-9 ring-1 ring-border shadow-2xs">
                      {getAvatarUrl(person.avatar_url) && (
                        <AvatarImage src={getAvatarUrl(person.avatar_url)!} alt={person.display_name} />
                      )}
                      <AvatarFallback className="text-xs font-bold">
                        {initialsOf(person.display_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-foreground truncate">{person.display_name}</p>
                      <p className="text-[11px] text-muted-foreground truncate font-mono">@{person.handle}</p>
                    </div>
                  </Link>
                  <FollowButton handle={person.handle} />
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <BlockModal
        open={blockModalOpen}
        onOpenChange={setBlockModalOpen}
        targetUser={{
          id: writer.id,
          handle: writer.handle,
          name: writer.name,
        }}
      />
    </AppShell>
  );
}
