import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Bell,
  Database,
  Info,
  Loader2,
  Lock,
  Palette,
  Share2,
  ShieldCheck,
  ShieldAlert,
  UserCog,
  UserRound,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { compressImageToDataUrl, getAvatarUrl } from "@/lib/avatar";
import { initialsOf } from "@/lib/inkline-data";
import { supabase } from "@/integrations/supabase/client";
import { useInkline } from "@/lib/inkline-context";
import { useSettings, type Settings } from "@/lib/user-settings";
import { EMAIL_RE, passwordProblems } from "@/lib/password-rules";

export const Route = createFileRoute("/settings")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Settings — Wryto" },
      {
        name: "description",
        content: "Manage your Wryto account, profile, language, privacy and notifications.",
      },
      { property: "og:title", content: "Settings — Wryto" },
      {
        property: "og:description",
        content: "Manage your Wryto account, profile, language, privacy and notifications.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  errorComponent: SettingsErrorComponent,
  component: SettingsPage,
});

function SettingsErrorComponent() {
  return (
    <AppShell title="Settings">
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
        <h2 className="text-xl font-bold">Unable to load settings</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          There was an issue opening your settings. Please try reloading the page.
        </p>
        <Button onClick={() => window.location.reload()}>Reload Settings</Button>
      </div>
    </AppShell>
  );
}

const SECTIONS = [
  { id: "account", icon: UserCog, key: "account" },
  { id: "profile", icon: UserRound, key: "profileSettings" },
  { id: "preferences", icon: Palette, key: "preferences" },
  { id: "privacy", icon: Lock, key: "privacy" },
  { id: "notifications", icon: Bell, key: "notifSettings" },
  { id: "share", icon: Share2, key: "share" },
  { id: "data", icon: Database, key: "data" },
  { id: "support", icon: Info, key: "support" },
] as const;

function Section({
  id,
  icon: Icon,
  title,
  children,
}: {
  id: string;
  icon: typeof Bell;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="glass animate-rise scroll-mt-24 rounded-2xl p-5 sm:p-6">
      <h2 className="mb-4 flex items-center gap-2 text-base font-bold">
        <Icon className="size-4 text-primary" />
        {title}
      </h2>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-11 flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 py-1">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SettingsPage() {
  const { user, profile, signOut, refresh } = useInkline();
  const { settings, update, t } = useSettings();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const deleteAccount = async () => {
    if (user) {
      try {
        await Promise.allSettled([
          supabase.from("posts").delete().eq("author_id", user.id),
          supabase.from("comments").delete().eq("author_id", user.id),
          supabase.from("likes").delete().eq("user_id", user.id),
          supabase
            .from("followers")
            .delete()
            .or(`follower_id.eq.${user.id},following_id.eq.${user.id}`),
          supabase
            .from("user_blocks")
            .delete()
            .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`),
          supabase.from("user_settings").delete().eq("user_id", user.id),
        ]);
      } catch (e) {
        console.warn("deleteAccount database cleanup error:", e);
      }
      localStorage.removeItem("inkline-settings");
      localStorage.removeItem("inkline-theme");
    }
  };

  const set = async (patch: Partial<Settings>) => {
    const ok = await update(patch);
    if (ok) toast.success(t("saved"));
    else toast.error("Couldn't save. Please try again.");
  };

  // Account
  const [email, setEmail] = useState("");
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  // Profile
  const [handle, setHandle] = useState("");
  const [bio, setBio] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (profile) {
      setHandle(profile.handle);
      setBio(profile.bio ?? "");
    }
  }, [profile]);

  // Blocks
  const [blocks, setBlocks] = useState<{ id: string; handle: string; name: string }[]>([]);
  const [blockHandle, setBlockHandle] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const loadBlocks = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_blocks")
      .select("blocked_id, blocked:profiles!user_blocks_blocked_id_fkey(handle, display_name)")
      .eq("blocker_id", user.id);
    setBlocks(
      (
        (data ?? []) as unknown as {
          blocked_id: string;
          blocked: { handle: string; display_name: string } | null;
        }[]
      ).map((r) => ({
        id: r.blocked_id,
        handle: r.blocked?.handle ?? "",
        name: r.blocked?.display_name ?? "",
      })),
    );
  }, [user]);

  useEffect(() => {
    void loadBlocks();
  }, [loadBlocks]);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };

  if (!user) {
    return (
      <AppShell title={t("settings")}>
        <div className="space-y-4 px-5 py-6 sm:px-8">
          <div className="glass rounded-2xl p-6 text-center">
            <p className="text-sm text-muted-foreground">{t("signInToManage")}</p>
            <Button asChild className="mt-4">
              <Link to="/auth">{t("signIn")}</Link>
            </Button>
          </div>
          <Section id="preferences" icon={Palette} title={t("preferences")}>
            <Preferences settings={settings} set={set} t={t} />
          </Section>
        </div>
      </AppShell>
    );
  }

  const changeEmail = () =>
    run("email", async () => {
      const next = email.trim().toLowerCase();
      if (!EMAIL_RE.test(next)) {
        toast.error("Enter a valid email address.");
        return;
      }
      if (next === user.email) {
        toast.error("That's already your email.");
        return;
      }
      const { error } = await supabase.auth.updateUser(
        { email: next },
        { emailRedirectTo: `${window.location.origin}/settings` },
      );
      if (error) toast.error(error.message);
      else {
        toast.success("Check both inboxes to confirm the change.");
        setEmail("");
      }
    });

  const changePassword = () =>
    run("password", async () => {
      const problems = passwordProblems(newPw);
      if (problems.length) {
        toast.error(`Password needs ${problems.join(", ")}.`);
        return;
      }
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: curPw,
      });
      if (authError) {
        toast.error("Current password is incorrect.");
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) toast.error(error.message);
      else {
        toast.success("Password updated.");
        setCurPw("");
        setNewPw("");
      }
    });

  const saveProfile = () =>
    run("profile", async () => {
      const h = handle.trim().toLowerCase();
      if (!/^[a-z0-9_]{3,20}$/.test(h)) {
        toast.error("Username must be 3–20 characters: letters, numbers or _.");
        return;
      }
      if (bio.length > 500) {
        toast.error("Bio must be 500 characters or fewer.");
        return;
      }
      if (h !== profile?.handle) {
        const { data } = await supabase.from("profiles").select("id").eq("handle", h).maybeSingle();
        if (data) {
          toast.error("That username is taken.");
          return;
        }
      }
      const { error } = await supabase
        .from("profiles")
        .update({ handle: h, bio: bio.trim() || null })
        .eq("id", user.id);
      if (error)
        toast.error(error.code === "23505" ? "That username is taken." : "Couldn't save profile.");
      else {
        toast.success(t("saved"));
        await refresh();
      }
    });

  const uploadPhoto = (file: File) =>
    run("photo", async () => {
      const ext =
        { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" }[
          file.type
        ] || file.name.split(".").pop()?.toLowerCase();
      if (!ext) {
        toast.error("Use a JPG, PNG, WebP, or GIF image.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be under 5 MB.");
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
        toast.error("Couldn't save profile photo.");
        return;
      }
      toast.success("Photo updated successfully.");
      await refresh();
    });

  const block = () =>
    run("block", async () => {
      const h = blockHandle.trim().replace(/^@/, "").toLowerCase();
      const { data } = await supabase.from("profiles").select("id").eq("handle", h).maybeSingle();
      if (!data) {
        toast.error("Couldn't find that writer.");
        return;
      }
      if (data.id === user.id) {
        toast.error("You can't block yourself.");
        return;
      }
      const { error } = await supabase
        .from("user_blocks")
        .insert({ blocker_id: user.id, blocked_id: data.id });
      if (error && error.code !== "23505") {
        toast.error("Couldn't block.");
        return;
      }
      await supabase
        .from("followers")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", data.id);
      setBlockHandle("");
      toast.success(`Blocked @${h}`);
      await loadBlocks();
    });
  const unblock = (id: string) =>
    run(`unblock-${id}`, async () => {
      await supabase.from("user_blocks").delete().eq("blocker_id", user.id).eq("blocked_id", id);
      toast.success("Unblocked");
      await loadBlocks();
    });

  const shareApp = async (invite: boolean) => {
    const url = window.location.origin;
    const text = invite
      ? "Join me on Wryto — a quiet place for writers and readers."
      : "Wryto — a quiet place for writers and readers.";
    if (navigator.share) {
      try {
        await navigator.share({ title: "Wryto", text, url });
      } catch {
        /* cancelled */
      }
      return;
    }
    await navigator.clipboard.writeText(`${text} ${url}`);
    toast.success("Link copied to clipboard");
  };

  const clearCache = async () => {
    queryClient.clear();
    Object.keys(localStorage)
      .filter(
        (k) =>
          (k.startsWith("wryto-") || k.startsWith("inkline-")) &&
          !k.includes("remember") &&
          !k.includes("settings"),
      )
      .forEach((k) => localStorage.removeItem(k));
    if ("caches" in window) for (const k of await caches.keys()) await caches.delete(k);
    await refresh();
    toast.success("Cache cleared");
  };

  const exportData = () =>
    run("export", async () => {
      const [p, posts, comments, likes, following, followersList, s] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("posts").select("*").eq("author_id", user.id),
        supabase.from("comments").select("*").eq("author_id", user.id),
        supabase.from("likes").select("post_id, created_at").eq("user_id", user.id),
        supabase.from("followers").select("following_id, created_at").eq("follower_id", user.id),
        supabase.from("followers").select("follower_id, created_at").eq("following_id", user.id),
        supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle(),
      ]);
      const blob = new Blob(
        [
          JSON.stringify(
            {
              exported_at: new Date().toISOString(),
              email: user.email,
              profile: p.data,
              settings: s.data,
              posts: posts.data,
              comments: comments.data,
              likes: likes.data,
              following: following.data,
              followers: followersList.data,
            },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      );
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `wryto-${profile?.handle ?? "data"}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    });

  const removeAccount = () =>
    run("delete", async () => {
      try {
        await deleteAccount();
        await signOut();
        toast.success("Your account has been deleted.");
        await navigate({ to: "/auth", replace: true });
      } catch {
        toast.error("Couldn't delete your account. Please try again.");
      }
    });

  const DeleteButton = (
    <AlertDialog onOpenChange={() => setConfirmText("")}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="h-11">
          {t("deleteAccount")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ShieldAlert className="size-5 text-destructive" />
            Delete your account?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes your profile, posts, comments, likes and follows. It can't be
            undone. Type <b>DELETE</b> to confirm.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="DELETE"
        />
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={confirmText !== "DELETE" || busy === "delete"}
            onClick={(e) => {
              e.preventDefault();
              void removeAccount();
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {busy === "delete" && <Loader2 className="animate-spin" />}Delete forever
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  const verified = Boolean(user.email_confirmed_at);

  return (
    <AppShell title={t("settings")}>
      <div className="space-y-4 px-5 py-6 sm:px-8">
        <nav className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="glass flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <s.icon className="size-4" />
              {t(s.key)}
            </a>
          ))}
        </nav>

        <Section id="account" icon={UserCog} title={t("account")}>
          <div className="space-y-2">
            <Label htmlFor="email">{t("changeEmail")}</Label>
            <p className="text-xs text-muted-foreground">{user.email}</p>
            <div className="flex gap-2">
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="new@email.com"
                maxLength={255}
                className="h-11"
              />
              <Button
                className="h-11"
                onClick={() => void changeEmail()}
                disabled={!email || busy === "email"}
              >
                {busy === "email" && <Loader2 className="animate-spin" />}
                {t("save")}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("changePassword")}</Label>
            <Input
              type="password"
              value={curPw}
              onChange={(e) => setCurPw(e.target.value)}
              placeholder={t("currentPassword")}
              autoComplete="current-password"
              className="h-11"
            />
            <div className="flex gap-2">
              <Input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder={t("newPassword")}
                autoComplete="new-password"
                className="h-11"
              />
              <Button
                className="h-11"
                onClick={() => void changePassword()}
                disabled={!curPw || !newPw || busy === "password"}
              >
                {busy === "password" && <Loader2 className="animate-spin" />}
                {t("save")}
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            <Button
              variant="outline"
              className="h-11"
              onClick={async () => {
                await signOut();
                await navigate({ to: "/auth", replace: true });
              }}
            >
              {t("logout")}
            </Button>
            {DeleteButton}
          </div>
        </Section>

        <Section id="profile" icon={UserRound} title={t("profileSettings")}>
          <Row label={t("photo")}>
            <div className="flex items-center gap-4">
              <Avatar className="size-14 ring-2 ring-border shadow-sm">
                {getAvatarUrl(profile?.avatarUrl) && (
                  <AvatarImage
                    src={getAvatarUrl(profile?.avatarUrl)!}
                    alt={profile?.name ?? "Avatar"}
                    className="object-cover"
                  />
                )}
                <AvatarFallback className="bg-accent text-base font-bold text-accent-foreground">
                  {profile?.name ? initialsOf(profile.name) : "WR"}
                </AvatarFallback>
              </Avatar>
              <Button
                variant="outline"
                className="h-10 text-xs sm:text-sm font-medium"
                onClick={() => fileRef.current?.click()}
                disabled={busy === "photo"}
              >
                {busy === "photo" && <Loader2 className="animate-spin mr-1.5 size-4" />}
                {t("changePhoto")}
              </Button>
            </div>
          </Row>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadPhoto(f);
              e.target.value = "";
            }}
          />
          <div className="space-y-2">
            <Label htmlFor="handle">{t("username")}</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                @
              </span>
              <Input
                id="handle"
                value={handle}
                onChange={(e) => setHandle(e.target.value.toLowerCase())}
                maxLength={20}
                className="h-11 pl-7"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">{t("bio")}</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={500}
              rows={3}
            />
            <p className="text-right text-xs text-muted-foreground">{bio.length}/500</p>
          </div>
          <Button
            className="h-11 w-full sm:w-auto"
            onClick={() => void saveProfile()}
            disabled={busy === "profile"}
          >
            {busy === "profile" && <Loader2 className="animate-spin" />}
            {t("save")}
          </Button>
        </Section>

        <Section id="preferences" icon={Palette} title={t("preferences")}>
          <Preferences settings={settings} set={set} t={t} />
        </Section>

        <Section id="privacy" icon={Lock} title={t("privacy")}>
          <Row label={verified ? t("verified") : t("notVerified")}>
            {verified ? (
              <ShieldCheck className="size-5 text-primary" />
            ) : (
              <ShieldAlert className="size-5 text-destructive" />
            )}
          </Row>
          <Row label={t("privateAccount")} hint={t("privateHint")}>
            <Switch
              checked={settings.is_private}
              onCheckedChange={(v) => void set({ is_private: v })}
            />
          </Row>
          <Row label={t("whoFollow")}>
            <Select
              value={settings.who_can_follow}
              onValueChange={(v) => void set({ who_can_follow: v as Settings["who_can_follow"] })}
            >
              <SelectTrigger className="h-11 w-36">
                <SelectValue>{t(settings.who_can_follow)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="everyone">{t("everyone")}</SelectItem>
                <SelectItem value="nobody">{t("nobody")}</SelectItem>
              </SelectContent>
            </Select>
          </Row>
          <Row label={t("whoComment")}>
            <Select
              value={settings.who_can_comment}
              onValueChange={(v) => void set({ who_can_comment: v as Settings["who_can_comment"] })}
            >
              <SelectTrigger className="h-11 w-36">
                <SelectValue>{t(settings.who_can_comment)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="everyone">{t("everyone")}</SelectItem>
                <SelectItem value="followers">{t("followers")}</SelectItem>
                <SelectItem value="nobody">{t("nobody")}</SelectItem>
              </SelectContent>
            </Select>
          </Row>
          <div className="space-y-2 border-t border-border pt-4">
            <Label>{t("blocked")}</Label>
            <div className="flex gap-2">
              <Input
                value={blockHandle}
                onChange={(e) => setBlockHandle(e.target.value)}
                placeholder={t("blockPlaceholder")}
                maxLength={31}
                className="h-11"
              />
              <Button
                variant="outline"
                className="h-11"
                onClick={() => void block()}
                disabled={!blockHandle.trim() || busy === "block"}
              >
                {t("block")}
              </Button>
            </div>
            {blocks.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2"
              >
                <span className="text-sm">
                  {b.name} <span className="text-muted-foreground">@{b.handle}</span>
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void unblock(b.id)}
                  disabled={busy === `unblock-${b.id}`}
                >
                  {t("unblock")}
                </Button>
              </div>
            ))}
          </div>
        </Section>

        <Section id="notifications" icon={Bell} title={t("notifSettings")}>
          <Row label={t("allNotif")}>
            <Switch
              checked={settings.notify_all}
              onCheckedChange={(v) => void set({ notify_all: v })}
            />
          </Row>
          <Row label={t("likeNotif")}>
            <Switch
              disabled={!settings.notify_all}
              checked={settings.notify_likes}
              onCheckedChange={(v) => void set({ notify_likes: v })}
            />
          </Row>
          <Row label={t("commentNotif")}>
            <Switch
              disabled={!settings.notify_all}
              checked={settings.notify_comments}
              onCheckedChange={(v) => void set({ notify_comments: v })}
            />
          </Row>
          <Row label={t("followNotif")}>
            <Switch
              disabled={!settings.notify_all}
              checked={settings.notify_follows}
              onCheckedChange={(v) => void set({ notify_follows: v })}
            />
          </Row>
        </Section>

        <Section id="share" icon={Share2} title={t("share")}>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="h-11" onClick={() => void shareApp(false)}>
              {t("shareApp")}
            </Button>
            <Button className="h-11" onClick={() => void shareApp(true)}>
              {t("invite")}
            </Button>
          </div>
        </Section>

        <Section id="data" icon={Database} title={t("data")}>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="h-11" onClick={() => void clearCache()}>
              {t("clearCache")}
            </Button>
            <Button
              variant="outline"
              className="h-11"
              onClick={() => void exportData()}
              disabled={busy === "export"}
            >
              {busy === "export" && <Loader2 className="animate-spin" />}
              {t("exportData")}
            </Button>
            {DeleteButton}
          </div>
        </Section>

        <Section id="support" icon={Info} title={t("support")}>
          <p className="text-sm text-muted-foreground">
            Wryto — a quiet place for writers and readers. Text only, no noise.
          </p>
          <p className="text-xs text-muted-foreground">Version 1.0</p>
        </Section>
      </div>
    </AppShell>
  );
}

function Preferences({
  settings,
  set,
  t,
}: {
  settings: Settings;
  set: (p: Partial<Settings>) => Promise<void>;
  t: (k: import("@/lib/i18n").TKey) => string;
}) {
  return (
    <>
      <Row label={t("language")}>
        <Select
          value={settings.language}
          onValueChange={(v) => void set({ language: v as Settings["language"] })}
        >
          <SelectTrigger className="h-11 w-36">
            <SelectValue>
              {{ en: "English", bn: "বাংলা", hi: "हिन्दी" }[settings.language]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="bn">বাংলা</SelectItem>
            <SelectItem value="hi">हिन्दी</SelectItem>
          </SelectContent>
        </Select>
      </Row>
      <Row label={t("theme")}>
        <Select
          value={settings.theme}
          onValueChange={(v) => void set({ theme: v as Settings["theme"] })}
        >
          <SelectTrigger className="h-11 w-36">
            <SelectValue>{t(settings.theme)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="light">{t("light")}</SelectItem>
            <SelectItem value="dark">{t("dark")}</SelectItem>
            <SelectItem value="system">{t("system")}</SelectItem>
          </SelectContent>
        </Select>
      </Row>
      <Row label={t("fontSize")}>
        <div className="flex rounded-xl bg-muted p-1">
          {(["small", "medium", "large"] as const).map((s) => (
            <button
              key={s}
              onClick={() => void set({ font_size: s })}
              className={`h-9 rounded-lg px-3 text-sm font-medium transition-colors ${settings.font_size === s ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              {t(s)}
            </button>
          ))}
        </div>
      </Row>
      <Row label={t("readingMode")} hint={t("readingModeHint")}>
        <Switch
          checked={settings.reading_mode}
          onCheckedChange={(v) => void set({ reading_mode: v })}
        />
      </Row>
    </>
  );
}
