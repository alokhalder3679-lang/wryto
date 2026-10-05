import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { FollowButton } from "@/components/post-card";
import { supabase } from "@/integrations/supabase/client";
import { initialsOf } from "@/lib/inkline-data";
import { useInkline } from "@/lib/inkline-context";

type Preview = {
  id: string;
  handle: string;
  display_name: string;
  bio: string | null;
  followers_count: number;
  following_count: number;
};
type Mutual = { handle: string; display_name: string; total: number };

export async function fetchMutuals(targetId: string) {
  const { data, error } = await supabase.rpc("mutual_followers", { _target: targetId, _limit: 3 });
  if (error) throw error;
  const rows = (data ?? []) as Mutual[];
  return { names: rows, total: Number(rows[0]?.total ?? 0) };
}

export function MutualLine({ names, total }: { names: Mutual[]; total: number }) {
  if (!total) return null;
  const shown = names
    .slice(0, 2)
    .map((m) => m.display_name)
    .join(", ");
  const rest = total - Math.min(2, names.length);
  return (
    <p className="text-xs text-muted-foreground">
      Followed by {shown}
      {rest > 0 ? ` and ${rest} other${rest > 1 ? "s" : ""} you follow` : ""}
    </p>
  );
}

export function ProfilePreview({ handle, children }: { handle: string; children: ReactNode }) {
  const { profile: me } = useInkline();
  const [data, setData] = useState<Preview | null>(null);
  const [mutual, setMutual] = useState<{ names: Mutual[]; total: number } | null>(null);
  const [followsYou, setFollowsYou] = useState(false);
  const [error, setError] = useState(false);

  async function load() {
    if (data) return;
    setError(false);
    const { data: row, error: err } = await supabase
      .from("profiles")
      .select("id, handle, display_name, bio, followers_count, following_count")
      .eq("handle", handle)
      .maybeSingle();
    if (err || !row) {
      setError(true);
      return;
    }
    setData(row);
    if (me && me.id !== row.id) {
      const [m, f] = await Promise.all([
        fetchMutuals(row.id).catch(() => null),
        supabase
          .from("followers")
          .select("id", { head: true, count: "exact" })
          .eq("follower_id", row.id)
          .eq("following_id", me.id),
      ]);
      setMutual(m);
      setFollowsYou((f.count ?? 0) > 0);
    }
  }

  return (
    <HoverCard openDelay={300} onOpenChange={(o) => o && void load()}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent className="glass w-72 rounded-2xl">
        {error ? (
          <p className="text-sm text-muted-foreground">Couldn't load this profile.</p>
        ) : !data ? (
          <div className="space-y-3">
            <div className="flex gap-3">
              <Skeleton className="size-11 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
            <Skeleton className="h-3 w-full" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <Link
                to="/profile/$handle"
                params={{ handle: data.handle }}
                className="flex min-w-0 gap-3"
              >
                <Avatar className="size-11">
                  <AvatarFallback className="bg-accent text-xs font-semibold">
                    {initialsOf(data.display_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{data.display_name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    @{data.handle}
                    {followsYou && (
                      <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                        Follows you
                      </span>
                    )}
                  </p>
                </div>
              </Link>
              {me?.id !== data.id && <FollowButton handle={data.handle} />}
            </div>
            {data.bio && <p className="line-clamp-3 text-sm">{data.bio}</p>}
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>
                <strong className="text-foreground">{data.followers_count}</strong> followers
              </span>
              <span>
                <strong className="text-foreground">{data.following_count}</strong> following
              </span>
            </div>
            {mutual && <MutualLine {...mutual} />}
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
