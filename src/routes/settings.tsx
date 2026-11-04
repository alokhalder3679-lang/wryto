import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Bell,
  Check,
  Database,
  Info,
  Loader2,
  Lock,
  LogOut,
  Palette,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Trash2,
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
import type { TKey } from "@/lib/i18n";

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

const TABS = [
  { id: "profile", label: "Profile", icon: UserRound, key: "profileSettings" as TKey },
  { id: "account", label: "Account", icon: UserCog, key: "account" as TKey },
  { id: "preferences", label: "Appearance", icon: Palette, key: "preferences" as TKey },
  { id: "privacy", label: "Privacy & Safety", icon: Lock, key: "privacy" as TKey },
  { id: "notifications", label: "Notifications", icon: Bell, key: "notifSettings" as TKey },
  { id: "data", label: "Data & Storage", icon: Database, key: "data" as TKey },
  { id: "support", label: "About", icon: Info, key: "support" as TKey },
] as const;

type TabId = (typeof TABS)[number]["id"];

function SettingsCard({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description?: string;
  icon?: typeof Bell;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-5 transition-colors">
      <div className="flex items-start gap-3 border-b border-border/60 pb-4">
        {Icon && (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="size-4.5" />
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground tracking-tight">{title}</h2>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function SettingsRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-[44px] flex-col sm:flex-row sm:items-center justify-between gap-3 py-1">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {hint && <p className="text-xs text-muted-foreground mt-0.5 leading-normal">{hint}</p>}
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
  const [activeTab, setActiveTab] = useState<TabId>("profile");

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

  // Account state
  const [email, setEmail] = useState("");
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  // Profile state
  const [handle, setHandle] = useState("");
  const [bio, setBio] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setHandle(profile.handle);
      setBio(profile.bio ?? "");
    }
  }, [profile]);

  // Blocked users
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
        <div className="space-y-6 px-4 py-6 sm:px-8 max-w-2xl mx-auto">
          <div className="rounded-2xl border border-border/80 bg-card p-8 text-center shadow-xs">
            <UserRound className="size-12 mx-auto text-muted-foreground/60 mb-3" />
            <h2 className="text-lg font-semibold text-foreground">Sign in required</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              {t("signInToManage")}
            </p>
            <Button asChild className="mt-5 rounded-full px-6 min-h-[44px]">
              <Link to="/auth">{t("signIn")}</Link>
            </Button>
          </div>
          <SettingsCard
            title={t("preferences")}
            description="Customize your display theme, reading mode, and language"
            icon={Palette}
          >
            <Preferences settings={settings} set={set} t={t} />
          </SettingsCard>
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
      ? "Join me on Wryto — where thoughtful words find their quiet home."
      : "Wryto — a modern, quiet haven for writers and readers.";
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
        <Button variant="destructive" className="min-h-[44px] rounded-xl font-medium gap-2">
          <Trash2 className="size-4" />
          {t("deleteAccount")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="size-5" />
            Delete your account permanently?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove your profile, posts, comments, likes, and follows. This action
            cannot be undone. Type <strong>DELETE</strong> below to confirm.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="DELETE"
          className="min-h-[44px] rounded-xl font-mono"
        />
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-xl min-h-[44px]">Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={confirmText !== "DELETE" || busy === "delete"}
            onClick={(e) => {
              e.preventDefault();
              void removeAccount();
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl min-h-[44px]"
          >
            {busy === "delete" && <Loader2 className="animate-spin size-4 mr-2" />}
            Delete forever
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  const verified = Boolean(user.email_confirmed_at);

  return (
    <AppShell title={t("settings")}>
      <div className="space-y-6 px-4 py-6 sm:px-8 max-w-3xl mx-auto">
        {/* User Mini Bar */}
        <div className="flex items-center justify-between rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs">
          <div className="flex items-center gap-3.5">
            <Avatar className="size-12 ring-2 ring-border">
              {getAvatarUrl(profile?.avatarUrl) && (
                <AvatarImage
                  src={getAvatarUrl(profile?.avatarUrl)!}
                  alt={profile?.name ?? "Avatar"}
                  className="object-cover"
                />
              )}
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {profile?.name ? initialsOf(profile.name) : "WR"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-base font-semibold text-foreground leading-tight">
                {profile?.name || "Your Profile"}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">@{profile?.handle || "username"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                verified
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
              }`}
            >
              {verified ? <ShieldCheck className="size-3.5" /> : <ShieldAlert className="size-3.5" />}
              {verified ? "Verified" : "Unverified"}
            </span>
          </div>
        </div>

        {/* Segmented Tab Navigation */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl px-4 text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs scale-[1.02]"
                    : "border border-border/60 bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="size-4 shrink-0" />
                <span>{t(tab.key)}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Profile */}
        {activeTab === "profile" && (
          <SettingsCard
            title={t("profileSettings")}
            description="Manage your public writer persona, avatar, and biography"
            icon={UserRound}
          >
            <SettingsRow label={t("photo")} hint="Recommended square image up to 5 MB">
              <div className="flex items-center gap-3">
                <Avatar className="size-14 ring-2 ring-border shadow-xs">
                  {getAvatarUrl(profile?.avatarUrl) && (
                    <AvatarImage
                      src={getAvatarUrl(profile?.avatarUrl)!}
                      alt={profile?.name ?? "Avatar"}
                      className="object-cover"
                    />
                  )}
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                    {profile?.name ? initialsOf(profile.name) : "WR"}
                  </AvatarFallback>
                </Avatar>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-[44px] rounded-xl text-xs sm:text-sm font-medium"
                  onClick={() => fileRef.current?.click()}
                  disabled={busy === "photo"}
                >
                  {busy === "photo" && <Loader2 className="animate-spin mr-1.5 size-4" />}
                  {t("changePhoto")}
                </Button>
              </div>
            </SettingsRow>
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
            <div className="space-y-2 pt-2 border-t border-border/60">
              <Label htmlFor="handle" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("username")}
              </Label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-mono">
                  @
                </span>
                <Input
                  id="handle"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value.toLowerCase())}
                  maxLength={20}
                  className="min-h-[44px] pl-8 rounded-xl font-mono"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("bio")}
              </Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Tell the community about your craft and thoughts..."
                className="rounded-xl resize-none"
              />
              <p className="text-right text-xs text-muted-foreground font-mono">{bio.length}/500</p>
            </div>
            <div className="flex justify-end pt-2">
              <Button
                className="min-h-[44px] px-6 rounded-xl font-medium shadow-xs"
                onClick={() => void saveProfile()}
                disabled={busy === "profile"}
              >
                {busy === "profile" && <Loader2 className="animate-spin mr-2 size-4" />}
                {t("save")}
              </Button>
            </div>
          </SettingsCard>
        )}

        {/* Tab 2: Account */}
        {activeTab === "account" && (
          <div className="space-y-6">
            <SettingsCard
              title={t("account")}
              description="Update your login email, change password, and security preferences"
              icon={UserCog}
            >
              <div className="space-y-3">
                <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("changeEmail")}
                </Label>
                <p className="text-xs text-muted-foreground">
                  Current email: <span className="font-semibold text-foreground">{user.email}</span>
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="new@email.com"
                    maxLength={255}
                    className="min-h-[44px] rounded-xl flex-1"
                  />
                  <Button
                    className="min-h-[44px] rounded-xl font-medium"
                    onClick={() => void changeEmail()}
                    disabled={!email || busy === "email"}
                  >
                    {busy === "email" && <Loader2 className="animate-spin mr-1.5 size-4" />}
                    {t("save")}
                  </Button>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-border/60">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("changePassword")}
                </Label>
                <Input
                  type="password"
                  value={curPw}
                  onChange={(e) => setCurPw(e.target.value)}
                  placeholder={t("currentPassword")}
                  autoComplete="current-password"
                  className="min-h-[44px] rounded-xl"
                />
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    type="password"
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    placeholder={t("newPassword")}
                    autoComplete="new-password"
                    className="min-h-[44px] rounded-xl flex-1"
                  />
                  <Button
                    className="min-h-[44px] rounded-xl font-medium"
                    onClick={() => void changePassword()}
                    disabled={!curPw || !newPw || busy === "password"}
                  >
                    {busy === "password" && <Loader2 className="animate-spin mr-1.5 size-4" />}
                    {t("save")}
                  </Button>
                </div>
              </div>
            </SettingsCard>

            {/* Session & Danger Zone */}
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 sm:p-6 space-y-4">
              <h3 className="text-sm font-semibold text-destructive flex items-center gap-2">
                <ShieldAlert className="size-4.5" />
                Session & Danger Zone
              </h3>
              <p className="text-xs text-muted-foreground">
                Sign out of your active browser session or permanently erase your data from Wryto.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  variant="outline"
                  className="min-h-[44px] rounded-xl font-medium gap-2 border-border/80"
                  onClick={async () => {
                    await signOut();
                    await navigate({ to: "/auth", replace: true });
                  }}
                >
                  <LogOut className="size-4" />
                  {t("logout")}
                </Button>
                {DeleteButton}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Appearance & Display */}
        {activeTab === "preferences" && (
          <SettingsCard
            title={t("preferences")}
            description="Customize color theme, language, typography scale, and focus mode"
            icon={Palette}
          >
            <Preferences settings={settings} set={set} t={t} />
          </SettingsCard>
        )}

        {/* Tab 4: Privacy & Safety */}
        {activeTab === "privacy" && (
          <SettingsCard
            title={t("privacy")}
            description="Control account visibility, interaction permissions, and blocked writers"
            icon={Lock}
          >
            <SettingsRow label={verified ? t("verified") : t("notVerified")} hint="Verified status builds community trust">
              {verified ? (
                <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-medium">
                  <ShieldCheck className="size-4.5" />
                  <span>Verified</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-amber-500 font-medium">
                  <ShieldAlert className="size-4.5" />
                  <span>Unverified</span>
                </div>
              )}
            </SettingsRow>

            <SettingsRow label={t("privateAccount")} hint={t("privateHint")}>
              <Switch
                checked={settings.is_private}
                onCheckedChange={(v) => void set({ is_private: v })}
              />
            </SettingsRow>

            <SettingsRow label={t("whoFollow")} hint="Who is allowed to follow your profile">
              <Select
                value={settings.who_can_follow}
                onValueChange={(v) => void set({ who_can_follow: v as Settings["who_can_follow"] })}
              >
                <SelectTrigger className="min-h-[44px] w-36 rounded-xl">
                  <SelectValue>{t(settings.who_can_follow)}</SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="everyone">{t("everyone")}</SelectItem>
                  <SelectItem value="nobody">{t("nobody")}</SelectItem>
                </SelectContent>
              </Select>
            </SettingsRow>

            <SettingsRow label={t("whoComment")} hint="Control who can leave comments on your stories">
              <Select
                value={settings.who_can_comment}
                onValueChange={(v) => void set({ who_can_comment: v as Settings["who_can_comment"] })}
              >
                <SelectTrigger className="min-h-[44px] w-36 rounded-xl">
                  <SelectValue>{t(settings.who_can_comment)}</SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="everyone">{t("everyone")}</SelectItem>
                  <SelectItem value="followers">{t("followers")}</SelectItem>
                  <SelectItem value="nobody">{t("nobody")}</SelectItem>
                </SelectContent>
              </Select>
            </SettingsRow>

            {/* Blocked Users */}
            <div className="space-y-3 pt-4 border-t border-border/60">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("blocked")}
              </Label>
              <div className="flex gap-2">
                <Input
                  value={blockHandle}
                  onChange={(e) => setBlockHandle(e.target.value)}
                  placeholder={t("blockPlaceholder")}
                  maxLength={31}
                  className="min-h-[44px] rounded-xl flex-1 font-mono"
                />
                <Button
                  variant="outline"
                  className="min-h-[44px] rounded-xl font-medium"
                  onClick={() => void block()}
                  disabled={!blockHandle.trim() || busy === "block"}
                >
                  {busy === "block" && <Loader2 className="animate-spin mr-1.5 size-4" />}
                  {t("block")}
                </Button>
              </div>

              {blocks.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-1">No blocked accounts.</p>
              ) : (
                <div className="space-y-2 pt-1">
                  {blocks.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/40 px-3.5 py-2.5"
                    >
                      <span className="text-sm">
                        {b.name}{" "}
                        <span className="text-muted-foreground font-mono text-xs">@{b.handle}</span>
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="min-h-[36px] text-xs font-medium hover:text-destructive"
                        onClick={() => void unblock(b.id)}
                        disabled={busy === `unblock-${b.id}`}
                      >
                        {t("unblock")}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </SettingsCard>
        )}

        {/* Tab 5: Notifications */}
        {activeTab === "notifications" && (
          <SettingsCard
            title={t("notifSettings")}
            description="Manage email and in-app activity notifications"
            icon={Bell}
          >
            <SettingsRow label={t("allNotif")} hint="Master switch for all community alerts">
              <Switch
                checked={settings.notify_all}
                onCheckedChange={(v) => void set({ notify_all: v })}
              />
            </SettingsRow>
            <SettingsRow label={t("likeNotif")} hint="When someone likes your writing">
              <Switch
                disabled={!settings.notify_all}
                checked={settings.notify_likes}
                onCheckedChange={(v) => void set({ notify_likes: v })}
              />
            </SettingsRow>
            <SettingsRow label={t("commentNotif")} hint="When someone replies to your story">
              <Switch
                disabled={!settings.notify_all}
                checked={settings.notify_comments}
                onCheckedChange={(v) => void set({ notify_comments: v })}
              />
            </SettingsRow>
            <SettingsRow label={t("followNotif")} hint="When a reader begins following your work">
              <Switch
                disabled={!settings.notify_all}
                checked={settings.notify_follows}
                onCheckedChange={(v) => void set({ notify_follows: v })}
              />
            </SettingsRow>
          </SettingsCard>
        )}

        {/* Tab 6: Data & Storage */}
        {activeTab === "data" && (
          <SettingsCard
            title={t("data")}
            description="Download an archive of your published work or manage local browser cache"
            icon={Database}
          >
            <SettingsRow
              label={t("exportData")}
              hint="Download a complete JSON export of your profile, stories, comments, likes, and follows"
            >
              <Button
                variant="outline"
                className="min-h-[44px] rounded-xl font-medium gap-2"
                onClick={() => void exportData()}
                disabled={busy === "export"}
              >
                {busy === "export" ? (
                  <Loader2 className="animate-spin size-4" />
                ) : (
                  <Database className="size-4" />
                )}
                {t("exportData")}
              </Button>
            </SettingsRow>

            <SettingsRow
              label={t("clearCache")}
              hint="Clear cached feeds and temporary assets from this device"
            >
              <Button
                variant="outline"
                className="min-h-[44px] rounded-xl font-medium"
                onClick={() => void clearCache()}
              >
                {t("clearCache")}
              </Button>
            </SettingsRow>
          </SettingsCard>
        )}

        {/* Tab 7: About & Share */}
        {activeTab === "support" && (
          <div className="space-y-6">
            <SettingsCard
              title={t("share")}
              description="Invite fellow writers and readers to join the Wryto community"
              icon={Share2}
            >
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  className="min-h-[44px] rounded-xl font-medium gap-2"
                  onClick={() => void shareApp(false)}
                >
                  <Share2 className="size-4" />
                  {t("shareApp")}
                </Button>
                <Button
                  className="min-h-[44px] rounded-xl font-medium"
                  onClick={() => void shareApp(true)}
                >
                  {t("invite")}
                </Button>
              </div>
            </SettingsCard>

            <SettingsCard
              title={t("support")}
              description="About this installation of Wryto"
              icon={Info}
            >
              <p className="text-sm text-foreground/80 leading-relaxed">
                Wryto is an intentional publishing haven for writers and readers. Thoughtful words,
                distraction-free typography, and human connection.
              </p>
              <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground font-mono">
                <span>Wryto Web Platform</span>
                <span>•</span>
                <span>Version 2.0 Modern Social</span>
              </div>
            </SettingsCard>
          </div>
        )}
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
  t: (k: TKey) => string;
}) {
  return (
    <>
      <SettingsRow label={t("language")} hint="Select your preferred application language">
        <Select
          value={settings.language}
          onValueChange={(v) => void set({ language: v as Settings["language"] })}
        >
          <SelectTrigger className="min-h-[44px] w-36 rounded-xl">
            <SelectValue>
              {{ en: "English", bn: "বাংলা", hi: "हिन्दी" }[settings.language]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="bn">বাংলা</SelectItem>
            <SelectItem value="hi">हिन्दी</SelectItem>
          </SelectContent>
        </Select>
      </SettingsRow>

      <SettingsRow label={t("theme")} hint="Switch between Light, Dark, or System mode">
        <Select
          value={settings.theme}
          onValueChange={(v) => void set({ theme: v as Settings["theme"] })}
        >
          <SelectTrigger className="min-h-[44px] w-36 rounded-xl">
            <SelectValue>{t(settings.theme)}</SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="light">{t("light")}</SelectItem>
            <SelectItem value="dark">{t("dark")}</SelectItem>
            <SelectItem value="system">{t("system")}</SelectItem>
          </SelectContent>
        </Select>
      </SettingsRow>

      <SettingsRow label={t("fontSize")} hint="Adjust the typography scale for comfortable reading">
        <div className="flex rounded-xl bg-muted/60 p-1 border border-border/60">
          {(["small", "medium", "large"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => void set({ font_size: s })}
              className={`min-h-[36px] rounded-lg px-3.5 text-xs font-medium transition-all cursor-pointer ${
                settings.font_size === s
                  ? "bg-card text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t(s)}
            </button>
          ))}
        </div>
      </SettingsRow>

      <SettingsRow label={t("readingMode")} hint={t("readingModeHint")}>
        <Switch
          checked={settings.reading_mode}
          onCheckedChange={(v) => void set({ reading_mode: v })}
        />
      </SettingsRow>
    </>
  );
}
