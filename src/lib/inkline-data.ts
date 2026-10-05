export type Writer = {
  id: string;
  name: string;
  handle: string;
  initials: string;
  bio: string | null;
  location: string | null;
  avatarUrl: string | null;
};

export type Post = {
  id: string;
  author: Writer;
  title?: string;
  body: string;
  tags: string[];
  likes: number;
  comments: number;
  createdAt: string;
  time: string;
  readTime: string;
};

export type Comment = {
  id: string;
  author: Writer;
  body: string;
  createdAt: string;
  time: string;
};

type ProfileRow = {
  id: string;
  handle: string;
  display_name: string;
  bio: string | null;
  location: string | null;
  avatar_url: string | null;
};

export function initialsOf(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "WR"
  );
}

export function toWriter(row: ProfileRow | any): Writer {
  const name = row.display_name || row.username || "Writer";
  const handle = row.handle || row.username || "writer";
  return {
    id: row.id,
    name,
    handle,
    initials: initialsOf(name),
    bio: row.bio ?? null,
    location: row.location ?? null,
    avatarUrl: row.avatar_url ?? row.profile_image ?? null,
  };
}

export function relativeTime(iso: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "Now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 172800) return "Yesterday";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function readTimeOf(body: string) {
  return `${Math.max(1, Math.ceil(body.trim().split(/\s+/).length / 200))} min read`;
}

export const POST_SELECT =
  "id, title, body, tags, created_at, author:profiles!posts_author_id_fkey(id, handle, display_name, bio, location, avatar_url), likes(count), comments(count)";

type PostRow = {
  id: string;
  title: string | null;
  body: string;
  tags: string[];
  created_at: string;
  author: ProfileRow | null;
  likes: { count: number }[] | null;
  comments: { count: number }[] | null;
};

export function toPost(row: PostRow | any): Post | null {
  const author = row.author
    ? toWriter(row.author)
    : {
        id: row.author_id || "writer",
        name: "Writer",
        handle: "writer",
        initials: "WR",
        bio: null,
        location: null,
        avatarUrl: null,
      };
  const bodyText = row.body || row.content || "";
  return {
    id: String(row.id),
    author,
    ...(row.title ? { title: row.title } : {}),
    body: bodyText,
    tags: Array.isArray(row.tags) ? row.tags : [],
    likes: Array.isArray(row.likes)
      ? (row.likes[0]?.count ?? row.likes.length)
      : typeof row.likes === "number"
        ? row.likes
        : 0,
    comments: Array.isArray(row.comments)
      ? (row.comments[0]?.count ?? row.comments.length)
      : typeof row.comments === "number"
        ? row.comments
        : 0,
    createdAt: row.created_at || new Date().toISOString(),
    time: relativeTime(row.created_at || new Date().toISOString()),
    readTime: readTimeOf(bodyText),
  };
}
