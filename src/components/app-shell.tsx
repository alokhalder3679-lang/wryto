import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  Compass,
  Home,
  LogOut,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl } from "@/lib/avatar";
import { initialsOf } from "@/lib/inkline-data";
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
  const desktopClasses = (active: boolean) =>
    cn(
      "group flex h-11 items-center gap-3.5 rounded-r-lg border-l-2 px-3 text-sm font-sans font-medium transition-all duration-200",
      active
        ? "border-primary bg-primary/8 text-foreground font-semibold"
        : "border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground",
    );

  const mobileClasses = (active: boolean) =>
    cn(
      "flex flex-col items-center justify-center gap-1 min-h-[44px] min-w-[44px] h-full py-1 text-[10px] font-sans font-medium transition-colors",
      active
        ? "text-primary font-semibold"
        : "text-muted-foreground/80 hover:text-foreground",
    );

  const classes = (active: boolean) => (mobile ? mobileClasses(active) : desktopClasses(active));

  const icon = (Icon: typeof Home, label: string, active: boolean, badge = 0) => (
    <>
      <span className="relative flex items-center justify-center">
        <Icon
          className={cn("size-5", mobile && "size-4.5")}
          strokeWidth={active ? 2.2 : 1.7}
        />
        {badge > 0 &&
          (mobile ? (
            <span className="absolute -top-1 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground leading-none shadow-xs">
              {badge > 9 ? "9+" : badge}
            </span>
          ) : (
            <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-primary ring-2 ring-card" />
          ))}
      </span>
      <span className={cn("truncate", mobile ? "max-w-[48px] leading-tight" : "flex-1")}>
        {label}
      </span>
      {!mobile && badge > 0 && (
        <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/12 px-1.5 text-[11px] font-bold text-primary">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
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
      <Link to="/messages" className={classes(pathname === "/messages")}>
        {icon(MessageCircle, t("messages"), pathname === "/messages")}
      </Link>
      <Link to="/notifications" className={classes(pathname === "/notifications")}>
        {icon(Bell, t("notifications"), pathname === "/notifications", unread)}
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
      <Link to="/settings" className={classes(pathname === "/settings")}>
        {icon(SettingsIcon, t("settings"), pathname === "/settings")}
      </Link>
    </>
  );
}

export function AppShell({
  children,
  title,
  action,
  hideBottomNav = false,
}: {
  children: ReactNode;
  title?: string;
  action?: ReactNode;
  hideBottomNav?: boolean;
}) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { profile, user, unreadCount, signOut } = useInkline();
  const { update, t } = useSettings();
  const navigate = useNavigate();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setDark(isDark);

    const onTheme = (e: Event) => {
      const detail = Boolean((e as CustomEvent<boolean>).detail);
      setDark(detail);
    };
    window.addEventListener("inkline-theme", onTheme);
    return () => window.removeEventListener("inkline-theme", onTheme);
  }, []);

  function toggleTheme() {
    const nextDark = !dark;
    setDark(nextDark);
    document.documentElement.classList.toggle("dark", nextDark);
    try {
      localStorage.setItem("inkline-theme", nextDark ? "dark" : "light");
    } catch {
      // ignore
    }
    void update({ theme: nextDark ? "dark" : "light" });
  }

  async function handleSignOut() {
    await signOut();
    await navigate({ to: "/auth", replace: true });
  }

  const handle = profile?.handle ?? null;

  const UserMenu = () => {
    if (!user) {
      return (
        <Button
          asChild
          variant="outline"
          size="sm"
          className="h-9 min-h-[44px] sm:min-h-0 min-w-[44px] sm:min-w-0 rounded-full border-border/80 px-3 text-xs font-sans font-semibold"
        >
          <Link to="/auth">{t("signIn")}</Link>
        </Button>
      );
    }
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="relative size-11 sm:size-9 min-h-[44px] sm:min-h-0 min-w-[44px] sm:min-w-0 flex items-center justify-center rounded-full ring-2 ring-primary/20 transition-transform active:scale-95 focus:outline-none"
            aria-label="Account menu"
          >
            <Avatar className="size-8">
              {getAvatarUrl(profile?.avatarUrl) && (
                <AvatarImage
                  src={getAvatarUrl(profile?.avatarUrl)!}
                  alt={profile?.name ?? "User"}
                  className="object-cover"
                />
              )}
              <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground font-sans">
                {profile?.name ? initialsOf(profile.name) : "U"}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 rounded-xl border border-border/80 bg-popover/95 p-1.5 shadow-xl backdrop-blur-xl">
          <div className="border-b border-border/60 px-3 py-2.5 mb-1">
            <p className="font-display text-sm font-bold truncate text-foreground">
              {profile?.name ?? "Writer"}
            </p>
            <p className="text-xs font-sans text-muted-foreground truncate">@{handle ?? "writer"}</p>
          </div>
          {handle && (
            <DropdownMenuItem asChild>
              <Link
                to="/profile/$handle"
                params={{ handle }}
                className="gap-2.5 cursor-pointer rounded-lg px-2.5 py-2 text-xs font-medium font-sans"
              >
                <UserRound className="size-4 text-primary" />
                <span>{t("profile")}</span>
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link
              to="/settings"
              className="gap-2.5 cursor-pointer rounded-lg px-2.5 py-2 text-xs font-medium font-sans"
            >
              <SettingsIcon className="size-4 text-primary" />
              <span>{t("settings")}</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="my-1 bg-border/60" />
          <DropdownMenuItem
            onClick={() => void handleSignOut()}
            className="gap-2.5 text-destructive cursor-pointer rounded-lg px-2.5 py-2 text-xs font-medium font-sans focus:text-destructive focus:bg-destructive/10"
          >
            <LogOut className="size-4" />
            <span>{t("signOut")}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <div
      className="min-h-screen bg-background text-foreground transition-colors duration-200"
      data-shell={pathname === "/settings" ? "keep" : "read"}
    >
      {/* Desktop Sidebar Navigation */}
      <aside className="fixed inset-y-4 left-4 z-30 hidden w-72 flex-col rounded-2xl border border-border/60 bg-card/80 px-5 py-6 backdrop-blur-xl shadow-xs lg:flex">
        {/* Brand Masthead */}
        <Link
          to="/feed"
          className="group flex items-center gap-3 py-1 transition-opacity hover:opacity-90"
          aria-label="Wryto Masthead"
        >
          <WrytoLogo variant="editorial" size="md" />
        </Link>

        {/* Writer Identity Profile Card */}
        <div className="mt-6 flex flex-col items-center text-center">
          <Avatar className="size-16 ring-2 ring-border/80 border-2 border-background shadow-xs">
            {getAvatarUrl(profile?.avatarUrl) && (
              <AvatarImage
                src={getAvatarUrl(profile?.avatarUrl)!}
                alt={profile?.name ?? "User"}
                className="object-cover"
              />
            )}
            <AvatarFallback className="bg-accent text-lg font-bold text-accent-foreground font-display">
              {profile ? initialsOf(profile.name) : <UserRound className="size-6 text-muted-foreground" />}
            </AvatarFallback>
          </Avatar>
          <p className="mt-3 w-full truncate font-display text-base font-bold text-foreground tracking-tight">
            {profile?.name ?? t("guestReader")}
          </p>
          <p className="w-full truncate text-xs font-sans text-muted-foreground">
            {handle ? `@${handle}` : t("signInToWrite")}
          </p>
        </div>

        {/* Delicate hairline divider */}
        <div className="my-5 h-px bg-border/60" />

        {/* Navigation items */}
        <nav className="space-y-1">
          <NavigationLinks pathname={pathname} handle={handle} unread={unreadCount} t={t} />
        </nav>

        {/* Compose story CTA */}
        <Button
          asChild
          className="mt-5 h-11 w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/95 shadow-xs font-sans font-medium gap-2"
        >
          <Link to={user ? "/create" : "/auth"}>
            <PenLine className="size-4" />
            <span>{t("write")}</span>
          </Link>
        </Button>

        {/* Sidebar Footer Controls */}
        <div className="mt-auto space-y-3 border-t border-border/60 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-sans font-medium text-muted-foreground">{t("language")}</span>
            <LanguageToggle variant="pill" />
          </div>
          <div className="flex items-center justify-between pt-1">
            {user ? (
              <Button
                variant="ghost"
                size="sm"
                className="px-2 text-xs font-sans text-muted-foreground hover:text-foreground"
                onClick={() => void handleSignOut()}
              >
                {t("signOut")}
              </Button>
            ) : (
              <Button asChild variant="outline" size="sm" className="h-8 text-xs font-sans border-border/80">
                <Link to="/auth">{t("signIn")}</Link>
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
              onClick={toggleTheme}
              aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
              title={dark ? "Light parchment theme" : "Midnight obsidian theme"}
            >
              {dark ? <Sun className="size-4 text-amber-500" /> : <Moon className="size-4" />}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div
        data-shell-main
        className="mx-auto min-h-screen max-w-3xl pb-24 lg:ml-80 lg:pb-10 xl:ml-[max(20rem,calc(50%-18rem))]"
      >
        {/* Desktop top masthead when no page title (e.g. Feed) */}
        {!title && (
          <header className="sticky top-0 z-20 hidden h-16 items-center justify-between border-b border-border/60 bg-background/85 px-6 backdrop-blur-md lg:flex">
            <div className="flex items-center gap-3">
              <GlobalSearch className="w-80 lg:w-96 [&_input]:!h-9 [&_input]:!rounded-lg [&_input]:!border-border/60 [&_input]:!bg-muted/30 [&_input]:!text-xs [&_input]:!shadow-none [&_input]:placeholder:!text-muted-foreground/70 [&_input]:hover:!border-border [&_input]:focus:!border-primary/50 [&_input]:focus:!bg-background [&_input]:focus:!ring-1 [&_input]:focus:!ring-primary/20" />
            </div>
            <div className="flex items-center gap-2.5">
              <NotificationsPopover className="size-9 rounded-lg" />
              <LanguageToggle variant="compact" />
            </div>
          </header>
        )}

        {/* Mobile top masthead when no page title */}
        {!title && (
          <header className="sticky top-0 z-20 flex flex-col gap-2.5 border-b border-border/60 bg-background/90 px-4 py-2.5 backdrop-blur-md lg:hidden">
            <div className="flex items-center justify-between">
              <Link
                to="/feed"
                className="flex items-center min-h-[44px] min-w-[44px] py-1 transition-opacity hover:opacity-90"
                aria-label="Wryto Home"
              >
                <WrytoLogo variant="editorial" size="sm" />
              </Link>
              <div className="flex items-center gap-1.5">
                <NotificationsPopover className="size-11 min-h-[44px] min-w-[44px] rounded-lg" />
                <LanguageToggle variant="compact" className="hidden sm:inline-flex min-h-[44px] items-center" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11 min-h-[44px] min-w-[44px] rounded-lg text-muted-foreground hover:text-foreground"
                  onClick={toggleTheme}
                  aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
                >
                  {dark ? <Sun className="size-4.5 text-amber-500" /> : <Moon className="size-4.5" />}
                </Button>
                <UserMenu />
              </div>
            </div>
            <GlobalSearch
              mobile
              className="w-full [&_input]:!h-9 [&_input]:!rounded-lg [&_input]:!border-border/60 [&_input]:!bg-muted/30 [&_input]:!text-xs [&_input]:!shadow-none [&_input]:placeholder:!text-muted-foreground/70 [&_input]:hover:!border-border [&_input]:focus:!border-primary/50 [&_input]:focus:!bg-background [&_input]:focus:!ring-1 [&_input]:focus:!ring-primary/20"
            />
          </header>
        )}

        {/* Header when title is provided */}
        {title && (
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border/60 bg-background/85 px-4 backdrop-blur-md sm:px-6">
            <div className="flex items-center gap-2.5 min-w-0">
              <Link
                to="/feed"
                className="flex shrink-0 items-center min-h-[44px] min-w-[44px] lg:hidden mr-1"
                aria-label="Home feed"
              >
                <WrytoLogo variant="icon" size="xs" />
              </Link>
              <h1 className="truncate font-display text-lg sm:text-xl font-bold tracking-tight text-foreground">
                {title}
              </h1>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="hidden md:block w-48 lg:w-64">
                <GlobalSearch
                  mobile
                  className="w-full [&_input]:!h-9 [&_input]:!rounded-lg [&_input]:!border-border/60 [&_input]:!bg-muted/30 [&_input]:!text-xs [&_input]:!shadow-none [&_input]:placeholder:!text-muted-foreground/70 [&_input]:hover:!border-border [&_input]:focus:!border-primary/50 [&_input]:focus:!bg-background [&_input]:focus:!ring-1 [&_input]:focus:!ring-primary/20"
                />
              </div>
              <NotificationsPopover className="size-11 sm:size-9 min-h-[44px] sm:min-h-0 min-w-[44px] sm:min-w-0 rounded-lg" />
              <LanguageToggle variant="compact" className="hidden sm:inline-flex" />
              {action}
              <div className="lg:hidden">
                <UserMenu />
              </div>
            </div>
          </header>
        )}

        {children}
      </div>

      {/* Mobile Bottom Navigation Bar */}
      {!hideBottomNav && (
        <nav className="fixed inset-x-0 bottom-0 z-30 grid h-16 grid-cols-6 border-t border-border/60 bg-background/95 px-1 backdrop-blur-xl lg:hidden shadow-[0_-4px_16px_rgba(0,0,0,0.03)] dark:shadow-[0_-4px_16px_rgba(0,0,0,0.25)]">
          <NavigationLinks pathname={pathname} handle={handle} unread={unreadCount} mobile t={t} />
        </nav>
      )}

      {/* Floating Composing Action Button */}
      {!pathname.startsWith("/create") && !hideBottomNav && (
        <Button
          asChild
          size="icon"
          className="fixed bottom-20 right-4 z-20 size-12 rounded-full bg-primary text-primary-foreground shadow-md transition-all active:scale-95 hover:bg-primary/90 lg:bottom-8 lg:right-8"
        >
          <Link to={user ? "/create" : "/auth"} aria-label={t("write")}>
            <PenLine className="size-5" />
          </Link>
        </Button>
      )}
    </div>
  );
}
