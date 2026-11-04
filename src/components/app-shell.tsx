import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  Compass,
  Home,
  LogOut,
  MessageCircle,
  Moon,
  MoreHorizontal,
  Plus,
  Search,
  Settings as SettingsIcon,
  Sun,
  UserRound,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { WrytoLogo } from "@/components/wryto-logo";
import { NotificationsPopover } from "@/components/notifications-popover";
import { LanguageToggle } from "@/components/language-toggle";
import { RightRail } from "@/components/right-rail";
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
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: ReactNode;
  title?: string;
  action?: ReactNode;
  hideBottomNav?: boolean;
  hideRightRail?: boolean;
}

export function AppShell({
  children,
  title,
  action,
  hideBottomNav = false,
  hideRightRail = false,
}: AppShellProps) {
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

  const navItems = [
    {
      to: "/feed",
      label: "Home",
      icon: Home,
      active: pathname === "/" || pathname === "/feed",
      badge: 0,
    },
    {
      to: "/discover",
      label: "Explore",
      icon: Compass,
      active: pathname === "/discover" || pathname === "/explore",
      badge: 0,
    },
    {
      to: "/notifications",
      label: "Notifications",
      icon: Bell,
      active: pathname === "/notifications",
      badge: unreadCount,
    },
    {
      to: "/messages",
      label: "Messages",
      icon: MessageCircle,
      active: pathname === "/messages",
      badge: 0,
    },
    {
      to: handle ? `/profile/${handle}` : "/auth",
      label: "Profile",
      icon: UserRound,
      active: pathname.startsWith("/profile"),
      badge: 0,
    },
    {
      to: "/settings",
      label: "Settings",
      icon: SettingsIcon,
      active: pathname === "/settings",
      badge: 0,
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex justify-center">
      <div className="w-full max-w-7xl flex">
        {/* ── Desktop Left Navigation Rail ────────────────────── */}
        <aside className="hidden lg:flex w-64 xl:w-72 shrink-0 flex-col justify-between border-r border-border/70 p-4 sticky top-0 h-screen select-none">
          <div className="space-y-4">
            {/* Brand Logo */}
            <div className="px-3 py-2 flex items-center justify-between">
              <Link
                to="/feed"
                className="flex items-center gap-2.5 transition-opacity hover:opacity-90 cursor-pointer"
                aria-label="Wryto Home"
              >
                <WrytoLogo variant="full" size="sm" />
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="size-9 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
                title={dark ? "Switch to light theme" : "Switch to dark theme"}
              >
                {dark ? <Sun className="size-4 text-amber-500" /> : <Moon className="size-4" />}
              </Button>
            </div>

            {/* Navigation Links */}
            <nav className="space-y-1 mt-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    className={cn(
                      "flex items-center gap-4 px-4 py-3 rounded-full text-base font-sans font-medium transition-colors duration-150 group cursor-pointer",
                      item.active
                        ? "bg-accent/80 text-foreground font-semibold"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                  >
                    <div className="relative">
                      <Icon
                        className={cn("size-6 transition-transform group-hover:scale-105", item.active && "text-primary")}
                        strokeWidth={item.active ? 2.3 : 1.8}
                      />
                      {item.badge > 0 && (
                        <span className="absolute -top-1 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground leading-none">
                          {item.badge > 99 ? "99+" : item.badge}
                        </span>
                      )}
                    </div>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Primary Post / Compose Button */}
            <Button
              asChild
              className="w-full h-12 rounded-full bg-primary text-primary-foreground font-semibold text-base shadow-md hover:bg-primary/90 transition-transform active:scale-98 flex items-center justify-center gap-2 cursor-pointer mt-4"
            >
              <Link to={user ? "/create" : "/auth"}>
                <Plus className="size-5" />
                <span>Create Post</span>
              </Link>
            </Button>
          </div>

          {/* Bottom User Account Menu */}
          <div className="pt-3 border-t border-border/70">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="w-full flex items-center justify-between p-2 rounded-full hover:bg-muted/70 transition-colors text-left cursor-pointer focus:outline-none"
                    aria-label="User account options"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="size-10 shrink-0 ring-1 ring-border">
                        {getAvatarUrl(profile?.avatarUrl) && (
                          <AvatarImage
                            src={getAvatarUrl(profile?.avatarUrl)!}
                            alt={profile?.name ?? "User"}
                            className="object-cover"
                          />
                        )}
                        <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold font-sans">
                          {profile?.name ? initialsOf(profile.name) : "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="font-sans text-sm font-semibold text-foreground truncate">
                          {profile?.name ?? "Writer"}
                        </p>
                        <p className="font-sans text-xs text-muted-foreground truncate">
                          @{handle ?? "user"}
                        </p>
                      </div>
                    </div>
                    <MoreHorizontal className="size-5 text-muted-foreground shrink-0 mr-1" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 rounded-2xl border border-border/80 bg-popover/95 p-1.5 shadow-xl backdrop-blur-xl"
                >
                  <div className="px-3 py-2 border-b border-border/50">
                    <p className="text-xs font-semibold text-foreground truncate">{profile?.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">@{handle}</p>
                  </div>
                  {handle && (
                    <DropdownMenuItem asChild>
                      <Link
                        to="/profile/$handle"
                        params={{ handle }}
                        className="gap-2.5 cursor-pointer rounded-xl px-3 py-2 text-xs font-medium"
                      >
                        <UserRound className="size-4 text-primary" />
                        <span>View Profile</span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link
                      to="/settings"
                      className="gap-2.5 cursor-pointer rounded-xl px-3 py-2 text-xs font-medium"
                    >
                      <SettingsIcon className="size-4 text-primary" />
                      <span>Settings & Privacy</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-1 bg-border/50" />
                  <DropdownMenuItem
                    onClick={() => void handleSignOut()}
                    className="gap-2.5 text-destructive cursor-pointer rounded-xl px-3 py-2 text-xs font-medium focus:text-destructive focus:bg-destructive/10"
                  >
                    <LogOut className="size-4" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="p-2 space-y-2">
                <Button asChild className="w-full rounded-full font-semibold" size="sm">
                  <Link to="/auth">Sign In / Join</Link>
                </Button>
              </div>
            )}
          </div>
        </aside>

        {/* ── Center Content Column ───────────────────────────── */}
        <main className="flex-1 min-w-0 max-w-2xl border-x border-border/70 min-h-screen bg-background pb-20 lg:pb-10">
          {/* Mobile Top Header */}
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border/70 bg-background/90 px-4 h-14 backdrop-blur-md lg:hidden">
            <Link to="/feed" className="flex items-center min-h-[44px] min-w-[44px]">
              <WrytoLogo variant="full" size="xs" />
            </Link>
            <div className="flex items-center gap-1.5">
              <NotificationsPopover className="size-10 min-h-[44px] min-w-[44px] rounded-full" />
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="size-10 min-h-[44px] min-w-[44px] rounded-full text-muted-foreground hover:text-foreground"
                aria-label="Toggle theme"
              >
                {dark ? <Sun className="size-4.5 text-amber-500" /> : <Moon className="size-4.5" />}
              </Button>
              {user ? (
                <Link
                  to={handle ? `/profile/${handle}` : "/feed"}
                  className="size-10 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full"
                >
                  <Avatar className="size-8 ring-1 ring-border">
                    {getAvatarUrl(profile?.avatarUrl) && (
                      <AvatarImage src={getAvatarUrl(profile?.avatarUrl)!} alt={profile?.name} />
                    )}
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold font-sans">
                      {profile?.name ? initialsOf(profile.name) : "U"}
                    </AvatarFallback>
                  </Avatar>
                </Link>
              ) : (
                <Button asChild size="sm" variant="outline" className="rounded-full text-xs h-8">
                  <Link to="/auth">Sign In</Link>
                </Button>
              )}
            </div>
          </header>

          {/* Desktop Subhead when title is provided */}
          {title && (
            <div className="sticky top-0 z-20 hidden lg:flex h-14 items-center justify-between border-b border-border/70 bg-background/90 px-6 backdrop-blur-md">
              <h1 className="font-sans text-lg font-bold tracking-tight text-foreground truncate">
                {title}
              </h1>
              {action}
            </div>
          )}

          {/* Page Contents */}
          {children}
        </main>

        {/* ── Desktop Right Contextual Rail ────────────────────── */}
        {!hideRightRail && <RightRail />}
      </div>

      {/* ── Mobile 5-Tab Bottom Navigation Bar ─────────────────── */}
      {!hideBottomNav && (
        <nav className="fixed inset-x-0 bottom-0 z-40 h-16 border-t border-border/70 bg-background/95 backdrop-blur-xl flex items-center justify-around px-2 lg:hidden shadow-lg">
          {/* 1. Home */}
          <Link
            to="/feed"
            className={cn(
              "flex flex-col items-center justify-center min-h-[44px] min-w-[44px] p-1 transition-colors",
              pathname === "/" || pathname === "/feed"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
            aria-label="Home"
          >
            <Home className="size-6" strokeWidth={pathname === "/feed" ? 2.4 : 1.8} />
          </Link>

          {/* 2. Explore / Search */}
          <Link
            to="/discover"
            search={{ q: "" }}
            className={cn(
              "flex flex-col items-center justify-center min-h-[44px] min-w-[44px] p-1 transition-colors",
              pathname === "/discover" || pathname === "/explore"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
            aria-label="Explore"
          >
            <Search className="size-6" strokeWidth={pathname === "/discover" ? 2.4 : 1.8} />
          </Link>

          {/* 3. Center Highlighted Compose Button */}
          <Link
            to={user ? "/create" : "/auth"}
            className="flex items-center justify-center size-12 min-h-[48px] min-w-[48px] rounded-full bg-primary text-primary-foreground shadow-md transition-transform active:scale-95 hover:bg-primary/90"
            aria-label="Create Post"
          >
            <Plus className="size-6 stroke-[2.5]" />
          </Link>

          {/* 4. Messages */}
          <Link
            to="/messages"
            className={cn(
              "flex flex-col items-center justify-center min-h-[44px] min-w-[44px] p-1 transition-colors relative",
              pathname === "/messages"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
            aria-label="Messages"
          >
            <MessageCircle className="size-6" strokeWidth={pathname === "/messages" ? 2.4 : 1.8} />
          </Link>

          {/* 5. Profile */}
          <Link
            to={handle ? `/profile/${handle}` : "/auth"}
            className={cn(
              "flex flex-col items-center justify-center min-h-[44px] min-w-[44px] p-1 transition-colors",
              pathname.startsWith("/profile")
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
            aria-label="Profile"
          >
            {user && profile?.avatarUrl ? (
              <Avatar className="size-7 ring-2 ring-transparent">
                <AvatarImage src={getAvatarUrl(profile.avatarUrl)!} alt="Profile" />
                <AvatarFallback className="text-[10px]">
                  {initialsOf(profile.name)}
                </AvatarFallback>
              </Avatar>
            ) : (
              <UserRound className="size-6" strokeWidth={pathname.startsWith("/profile") ? 2.4 : 1.8} />
            )}
          </Link>
        </nav>
      )}
    </div>
  );
}
