import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, MessageCircle, MoreHorizontal, UserX } from "lucide-react";
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
import { toWriter, type Writer } from "@/lib/inkline-data";
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
  component: ProfilePage,
});

function ProfilePage() {
  const { handle } = Route.useParams();
  const { posts, profile: me, refresh } = useInkline();
  const { t } = useSettings();
  const [tab, setTab] = useState("Pieces");
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
  const [people, setPeople] = useState<{ handle: string; display_name: string }[]>([]);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const isMe = !!me && me.handle === handle;

  const load = useCallback(async () => {
    setLoadError(false);
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, handle, display_name, bio, location, avatar_url, followers_count, following_count",
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
    if (found.avatarUrl) {
      const signed = await supabase.storage.from("avatars").createSignedUrl(found.avatarUrl, 3600);
      setAvatarUrl(signed.data?.signedUrl ?? null);
    } else setAvatarUrl(null);
    setLoading(false);
  }, [handle]);

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
            .select("p:profiles!followers_follower_id_fkey(handle, display_name)")
            .eq("following_id", writer.id)
        : supabase
            .from("followers")
            .select("p:profiles!followers_following_id_fkey(handle, display_name)")
            .eq("follower_id", writer.id);
    const { data, error } = await q.order("created_at", { ascending: false }).limit(200);
    if (error) {
      setListState("error");
      return;
    }
    setListState("ok");
    setPeople(
      ((data ?? []) as unknown as { p: { handle: string; display_name: string } | null }[]).flatMap(
        (r) => (r.p ? [r.p] : []),
      ),
    );
  }

  async function uploadAvatar(file: File) {
    if (!writer) return;
    setBusy(true);
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${writer.id}/avatar.${extension}`;
    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (!error) {
      await supabase.from("profiles").update({ avatar_url: path }).eq("id", writer.id);
      await Promise.all([load(), refresh()]);
    }
    setBusy(false);
  }

  if (loading)
    return (
      <AppShell title="Profile">
        <div className="glass mx-4 mt-5 flex gap-5 rounded-2xl p-7 sm:mx-6">
          <Skeleton className="size-24 rounded-full" />
          <div className="flex-1 space-y-3 pt-2">
            <Skeleton className="h-7 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-2/5" />
          </div>
        </div>
      </AppShell>
    );
  if (loadError)
    return (
      <AppShell title="Profile">
        <div className="px-6 py-20 text-center">
          <p className="text-muted-foreground">Couldn't load this profile.</p>
          <Button
            className="mt-4"
            variant="outline"
            size="sm"
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
  if (!writer)
    return (
      <AppShell title="Profile">
        <p className="px-6 py-20 text-center text-muted-foreground">
          No writer found with that handle.
        </p>
      </AppShell>
    );

  const writerPosts = posts.filter((post) => post.author.handle === writer.handle);

  const topics = Array.from(new Set(writerPosts.flatMap((p) => p.tags))).slice(0, 12);
  const section = "glass animate-rise mx-4 mt-5 rounded-2xl p-6 sm:mx-6 sm:p-7";
  const h2 = "text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground";

  return (
    <AppShell title={writer.name}>
      <section className={cn(section, "text-center sm:text-left")}>
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
          <Avatar className="size-24 shrink-0 shadow-[var(--glass-shadow)] ring-4 ring-[var(--glass-border)]">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={writer.name} />}
            <AvatarFallback className="bg-accent text-2xl font-bold text-accent-foreground">
              {writer.initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            {editing ? (
              <div className="space-y-3 text-left">
                <Input
                  value={form.handle}
                  onChange={(e) =>
                    setForm({ ...form, handle: e.target.value.toLowerCase().slice(0, 20) })
                  }
                  placeholder="username"
                  aria-label="Username"
                />
                <Input
                  value={form.display_name}
                  onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                  placeholder="Display name"
                  aria-label="Display name"
                />
                <Textarea
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value.slice(0, 280) })}
                  placeholder="A short bio"
                  aria-label="Bio"
                />
                <Input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="Location"
                  aria-label="Location"
                />
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
                {formError && <p className="text-sm text-destructive">{formError}</p>}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => fileInput.current?.click()}
                  >
                    Upload photo
                  </Button>
                  <Button size="sm" disabled={busy} onClick={() => void save()}>
                    {busy ? "Saving…" : "Save profile"}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-3xl font-extrabold tracking-tight">{writer.name}</p>
                <p className="mt-1 text-sm font-medium text-muted-foreground">
                  Writer · @{writer.handle}
                  {followsYou && (
                    <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs">Follows you</span>
                  )}
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground sm:justify-start">
                  {writer.location && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="size-4" /> {writer.location}
                    </span>
                  )}
                  <button
                    type="button"
                    className="hover:text-foreground"
                    onClick={() => void openList("followers")}
                  >
                    <strong className="text-foreground">{counts.followers}</strong> followers
                  </button>
                  <button
                    type="button"
                    className="hover:text-foreground"
                    onClick={() => void openList("following")}
                  >
                    <strong className="text-foreground">{counts.following}</strong> following
                  </button>
                </div>
                {mutual && (
                  <div className="mt-2">
                    <MutualLine {...mutual} />
                  </div>
                )}
              </>
            )}
          </div>
          <div className="shrink-0 flex items-center gap-2">
            {isMe ? (
              <Button variant="outline" size="sm" onClick={() => setEditing(!editing)}>
                {editing ? t("cancel") : "Edit profile"}
              </Button>
            ) : (
              <>
                <FollowButton handle={writer.handle} />
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 rounded-xl px-3 text-xs font-semibold"
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
                      className="size-9 rounded-xl text-muted-foreground hover:text-foreground"
                    >
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="glass w-40 rounded-xl">
                    <DropdownMenuItem
                      onClick={() => setBlockModalOpen(true)}
                      className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                    >
                      <UserX className="size-4" />
                      <span>{t("block")}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </div>

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
      </section>

      {!editing && (
        <section className={section}>
          <h2 className={h2}>About</h2>
          <p className="mt-3 font-reading text-lg leading-8">
            {writer.bio || "This writer hasn't added a bio yet."}
          </p>
          {topics.length > 0 && (
            <>
              <h2 className={cn(h2, "mt-6")}>Writes about</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {topics.map((t) => (
                  <span key={t} className="glass rounded-full px-3 py-1 text-xs font-medium">
                    #{t}
                  </span>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      <section className={section}>
        <div className="flex items-center justify-between gap-4">
          <h2 className={h2}>Writing timeline</h2>
          <div className="flex gap-1 rounded-full bg-muted p-1">
            {["Pieces", "Responses"].map((item) => (
              <button
                key={item}
                onClick={() => setTab(item)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                  tab === item
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground",
                )}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        {tab === "Pieces" && writerPosts.length > 0 ? (
          <ol className="relative mt-5 ml-2 border-l border-border">
            {writerPosts.map((post) => (
              <li key={post.id} className="relative pl-3">
                <span className="absolute -left-[5px] top-10 size-2.5 rounded-full bg-primary ring-4 ring-background" />
                <div className="-mx-2 sm:-mx-4 [&_article]:mx-2 sm:[&_article]:mx-4">
                  <PostCard post={post} />
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="py-12 text-center text-muted-foreground">
            {tab === "Pieces" ? "No published pieces yet." : "No responses yet."}
          </p>
        )}
      </section>
      <Dialog open={!!list} onOpenChange={(o) => !o && setList(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{list === "followers" ? "Followers" : "Following"}</DialogTitle>
          </DialogHeader>
          {listState === "loading" ? (
            <div className="space-y-2 py-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : listState === "error" ? (
            <p className="py-6 text-center text-sm text-destructive">Couldn't load this list.</p>
          ) : people.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No one here yet.</p>
          ) : (
            <ul className="max-h-80 space-y-1 overflow-y-auto">
              {people.map((p) => (
                <li key={p.handle}>
                  <Link
                    to="/profile/$handle"
                    params={{ handle: p.handle }}
                    onClick={() => setList(null)}
                    className="block rounded-lg px-3 py-2 hover:bg-muted"
                  >
                    <span className="font-semibold">{p.display_name}</span>{" "}
                    <span className="text-sm text-muted-foreground">@{p.handle}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
