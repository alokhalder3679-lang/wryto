import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  Compass,
  Home,
  MessageCircle,
  Moon,
  PenLine,
  Settings as SettingsIcon,
  Sun,
  UserRound,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { WrytoLogo } from "@/components/wryto-logo";
import { GlobalSearch } from "@/components/global-search";
import { NotificationsPopover } from "@/components/notifications-popover";
import { LanguageToggle } from "@/components/language-toggle";
import { useInkline } from "@/lib/inkline-context";
import { useSettings } from "@/lib/user-settings";
import type { TKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function NavigationLinks({
  pathname,
  handle,
  unread,
  mobile = false,
  t,
}: {
  pathname: string;
  handle: string | null;
  unread: number;
  mobile?: boolean;
  t: (k: TKey) => string;
}) {
  const classes = (active: boolean) =>
    cn(
      mobile
        ? "flex flex-col items-center justify-center gap-1 text-[11px] font-medium"
        : "flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
      active
        ? mobile
          ? "text-primary"
          : "bg-accent text-accent-foreground"
        : mobile
          ? "text-muted-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
    );
  const icon = (Icon: typeof Home, label: string, active: boolean, badge = 0) => (
    <>
      <span className="relative">
        <Icon className="size-5" strokeWidth={active ? 2.2 : 1.8} />
        {badge > 0 && <span className="absolute -right-1 -top-1 size-2 rounded-full bg-primary" />}
      </span>
      <span className="truncate">{label}</span>
    </>
  );
  return (
    <>
      <Link to="/feed" className={classes(pathname === "/feed")}>
        {icon(Home, t("home"), pathname === "/feed")}
      </Link>
      <Link to="/discover" search={{ q: "" }} className={classes(pathname === "/discover")}>
        {icon(Compass, t("discover"), pathname === "/discover")}
      </Link>
      <Link to="/notifications" className={classes(pathname === "/notifications")}>
        {icon(Bell, t("notifications"), pathname === "/notifications", unread)}
      </Link>
      <Link to="/messages" className={classes(pathname === "/messages")}>
        {icon(MessageCircle, t("messages"), pathname === "/messages")}
      </Link>
      {handle ? (
        <Link
          to="/profile/$handle"
          params={{ handle }}
          className={classes(pathname.startsWith("/profile"))}
        >
          {icon(UserRound, t("profile"), pathname.startsWith("/profile"))}
        </Link>
      ) : (
        <Link to="/auth" className={classes(pathname === "/auth")}>
          {icon(UserRound, t("signIn"), pathname === "/auth")}
        </Link>
      )}
      {!mobile && (
        <Link to="/settings" className={classes(pathname === "/settings")}>
          {icon(SettingsIcon, t("settings"), pathname === "/settings")}
        </Link>
      )}
    </>
  );
}

export function AppShell({
  children,
  title,
  action,
}: {
  children: ReactNode;
  title?: string;
  action?: ReactNode;
}) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { profile, user, unreadCount, signOut } = useInkline();
  const { settings, update, t } = useSettings();
  const navigate = useNavigate();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    const onTheme = (e: Event) => setDark(Boolean((e as CustomEvent<boolean>).detail));
    window.addEventListener("inkline-theme", onTheme);
    return () => window.removeEventListener("inkline-theme", onTheme);
  }, []);

  function toggleTheme() {
    void update({ theme: dark ? "light" : "dark" });
  }
  void settings;

  async function handleSignOut() {
    await signOut();
    await navigate({ to: "/auth", replace: true });
  }

  const handle = profile?.handle ?? null;

  return (
    <div className="min-h-screen" data-shell={pathname === "/settings" ? "keep" : "read"}>
      <aside className="glass fixed inset-y-4 left-4 z-30 hidden w-72 flex-col rounded-3xl px-6 py-7 lg:flex">
        <Link to="/feed" className="flex items-center py-1 transition-opacity hover:opacity-90">
          <WrytoLogo variant="full" size="md" className="h-10" />
        </Link>
        <div className="mt-7 flex flex-col items-center text-center">
          <div className="grid size-20 place-items-center rounded-full bg-accent text-xl font-bold text-accent-foreground shadow-[var(--glass-shadow)] ring-4 ring-[var(--glass-border)]">
            {profile ? (
              profile.name
                .split(/\s+/)
                .map((p) => p[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()
            ) : (
              <UserRound className="size-8" />
            )}
          </div>
          <p className="mt-4 w-full truncate text-xl font-bold">
            {profile?.name ?? "Guest reader"}
          </p>
          <p className="w-full truncate text-sm text-muted-foreground">
            {handle ? `@${handle}` : "Sign in to write"}
          </p>
        </div>
        <div className="my-6 h-px bg-border" />
        <nav className="space-y-1">
          <NavigationLinks pathname={pathname} handle={handle} unread={unreadCount} t={t} />
        </nav>
        <Button asChild className="mt-6 h-11 w-full rounded-xl">
          <Link to={user ? "/create" : "/auth"}>
            <PenLine /> {t("write")}
          </Link>
        </Button>
        <div className="mt-auto space-y-3 border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">{t("language")}</span>
            <LanguageToggle variant="pill" />
          </div>
          <div className="flex items-center justify-between pt-1">
            {user ? (
              <Button
                variant="ghost"
                size="sm"
                className="px-2 text-muted-foreground hover:text-foreground"
                onClick={() => void handleSignOut()}
              >
                {t("signOut")}
              </Button>
            ) : (
              <Button asChild variant="outline" size="sm">
                <Link to="/auth">{t("signIn")}</Link>
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label="Toggle color theme"
            >
              {dark ? <Sun /> : <Moon />}
            </Button>
          </div>
        </div>
      </aside>

      <div className="mx-auto min-h-screen max-w-3xl pb-24 lg:ml-80 lg:pb-10 xl:ml-[max(20rem,calc(50%-18rem))]">
        {/* Desktop top header when no page title (e.g. Feed) */}
        {!title && (
          <header className="glass sticky top-4 z-20 mx-6 mb-4 hidden h-14 items-center justify-between rounded-2xl border px-5 lg:flex">
            <GlobalSearch className="w-80" />
            <div className="flex items-center gap-3">
              <NotificationsPopover />
              <LanguageToggle variant="compact" />
            </div>
          </header>
        )}

        {/* Mobile top header when no page title */}
        {!title && (
          <header className="glass sticky top-0 z-20 flex flex-col gap-2.5 border-b border-border/60 px-4 py-3 lg:hidden">
            <div className="flex items-center justify-between">
              <Link to="/feed" className="flex items-center transition-opacity hover:opacity-90">
                <WrytoLogo variant="full" size="sm" className="h-7" />
              </Link>
              <div className="flex items-center gap-1.5">
                <NotificationsPopover />
                <LanguageToggle variant="compact" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={toggleTheme}
                  aria-label="Toggle theme"
                >
                  {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
                </Button>
              </div>
            </div>
            <GlobalSearch mobile />
          </header>
        )}

        {/* Header when title is provided */}
        {title && (
          <header className="glass sticky top-0 z-20 flex h-16 items-center justify-between rounded-b-2xl border-t-0 px-4 sm:px-6 lg:top-4 lg:mx-6 lg:mt-4 lg:rounded-2xl lg:border-t">
            <div className="flex items-center gap-2.5 min-w-0">
              <Link to="/feed" className="flex shrink-0 items-center lg:hidden mr-1">
                <WrytoLogo variant="icon" size="sm" className="size-6" />
              </Link>
              <h1 className="truncate text-lg font-bold tracking-tight">{title}</h1>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="hidden md:block w-48 lg:w-56">
                <GlobalSearch mobile />
              </div>
              <NotificationsPopover />
              <LanguageToggle variant="compact" className="hidden sm:inline-flex" />
              {action}
            </div>
          </header>
        )}
        {children}
      </div>

      <nav className="glass fixed inset-x-3 bottom-3 z-30 grid h-16 grid-cols-5 rounded-2xl px-2 lg:hidden">
        <NavigationLinks pathname={pathname} handle={handle} unread={unreadCount} mobile t={t} />
      </nav>

      {!pathname.startsWith("/create") && (
        <Button
          asChild
          size="icon"
          className="fixed bottom-22 right-5 z-20 size-13 rounded-full shadow-lg lg:bottom-8 lg:right-8"
        >
          <Link to={user ? "/create" : "/auth"} aria-label="Create post">
            <PenLine className="size-5" />
          </Link>
        </Button>
      )}
    </div>
  );
}
