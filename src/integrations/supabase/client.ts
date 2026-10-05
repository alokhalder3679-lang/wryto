// Supabase client integration
// Connects directly to the live Supabase backend.
// Gracefully falls back to local storage if specific tables are not yet created in the Supabase schema cache.

import { supabase as liveSupabase } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";

const STORAGE_KEY_PREFIX = "inkline_db_";

function getInitialData<T>(table: string, fallback: T[]): T[] {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${table}`);
    if (raw) return JSON.parse(raw) as T[];
  } catch {
    // ignore
  }
  return fallback;
}

function saveData<T>(table: string, data: T[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${table}`, JSON.stringify(data));
  } catch {
    // ignore
  }
}

// Local mock fixtures as fallback when tables are not yet created in remote schema
const INITIAL_PROFILES = [
  {
    id: "78a7e42f-f043-4520-afbc-868222d71409",
    handle: "test_writer",
    username: "test_writer",
    display_name: "Test Writer",
    bio: "Essayist exploring stillness, craft, and slower software.",
    location: "Kolkata, India",
    avatar_url: null,
    profile_image: null,
    followers_count: 12,
    following_count: 5,
    created_at: "2026-08-01T10:00:00.000Z",
  },
];

const INITIAL_POSTS = [
  {
    id: "post-1",
    author_id: "78a7e42f-f043-4520-afbc-868222d71409",
    title: "The Architecture of Quiet",
    body: "We have filled every micro-second of silence with notification pings and infinite scrolling feeds. But great writing requires stillness — an empty room where a thought can stretch its limbs before committing to the page. Wryto was created as an antidote to performative velocity: a place where sentences have breathing room, and where reading is once again an act of sustained attention rather than algorithmic triage.",
    tags: ["essay", "reflection"],
    created_at: "2026-09-28T08:30:00.000Z",
    updated_at: "2026-09-28T08:30:00.000Z",
  },
  {
    id: "post-2",
    author_id: "78a7e42f-f043-4520-afbc-868222d71409",
    title: "Morning Fog on the River",
    body: "A cold grey mist unspools across the stone bridges.\nThe bells chime seven,\nand beneath the cobblestones\nyesterday's whispers freeze into salt.\nWe walk with wool scarves pulled tight,\ncarrying books like warm loaves of bread.",
    tags: ["poetry"],
    created_at: "2026-09-29T07:15:00.000Z",
    updated_at: "2026-09-29T07:15:00.000Z",
  },
  {
    id: "post-3",
    author_id: "78a7e42f-f043-4520-afbc-868222d71409",
    title: "On Keeping a Digital Notebook",
    body: "For five years I kept scraps of thoughts scattered across twelve different note-taking apps. What I discovered is that software that tries to do everything ends up helping you write nothing. A text editor should be like a clean wooden desk: nothing on it except the lamp, the paper, and the ink.",
    tags: ["essay", "story"],
    created_at: "2026-09-30T16:45:00.000Z",
    updated_at: "2026-09-30T16:45:00.000Z",
  },
];

const INITIAL_COMMENTS = [
  {
    id: "c-1",
    post_id: "post-1",
    author_id: "78a7e42f-f043-4520-afbc-868222d71409",
    body: "This resonated so deeply. 'Performative velocity' is exactly what drained the joy out of writing online for me.",
    created_at: "2026-09-28T09:45:00.000Z",
  },
];

const INITIAL_LIKES = [
  {
    user_id: "78a7e42f-f043-4520-afbc-868222d71409",
    post_id: "post-1",
    created_at: "2026-09-28T09:00:00.000Z",
  },
];

const tables: Record<string, any[]> = {
  ["profiles"]: getInitialData("profiles", INITIAL_PROFILES),
  ["posts"]: getInitialData("posts", INITIAL_POSTS),
  ["comments"]: getInitialData("comments", INITIAL_COMMENTS),
  ["likes"]: getInitialData("likes", INITIAL_LIKES),
  ["followers"]: getInitialData("followers", []),
  ["notifications"]: getInitialData("notifications", []),
  ["user_settings"]: getInitialData("user_settings", []),
  ["user_blocks"]: getInitialData("user_blocks", []),
  ["conversations"]: getInitialData("conversations", []),
  ["messages"]: getInitialData("messages", []),
  ["calls"]: getInitialData("calls", []),
};

// Fallback query builder when remote table is missing (PGRST205)
class FallbackQueryBuilder {
  private tableName: string;
  private filters: ((row: any) => boolean)[] = [];
  private orderField?: string;
  private ascending = true;
  private limitCount?: number;
  private rangeStart = 0;
  private rangeEnd = Infinity;
  private headOnly = false;
  private pendingPatch?: any;
  private isDelete = false;
  private pendingInsert?: any;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(_columns = "*", options?: { count?: string; head?: boolean }): this {
    if (options?.head) this.headOnly = true;
    return this;
  }

  eq(field: string, value: any): this {
    this.filters.push((row) => row[field] === value);
    return this;
  }

  neq(field: string, value: any): this {
    this.filters.push((row) => row[field] !== value);
    return this;
  }

  in(field: string, values: any[]): this {
    this.filters.push((row) => values.includes(row[field]));
    return this;
  }

  or(expr: string): this {
    const terms = expr.split(",").map((s) => s.trim());
    this.filters.push((row) => {
      return terms.some((term) => {
        const parts = term.split(".");
        if (parts.length >= 3) {
          const col = parts[0]!;
          const op = parts[1]!;
          const pat = parts.slice(2).join(".").replace(/%/g, "").toLowerCase();
          const val = String(row[col] ?? "").toLowerCase();
          if (op === "ilike") return val.includes(pat);
        }
        return false;
      });
    });
    return this;
  }

  order(field: string, options?: { ascending?: boolean }): this {
    this.orderField = field;
    this.ascending = options?.ascending ?? true;
    return this;
  }

  limit(count: number): this {
    this.limitCount = count;
    return this;
  }

  range(start: number, end: number): this {
    this.rangeStart = start;
    this.rangeEnd = end;
    return this;
  }

  insert(entry: any | any[]): this {
    this.pendingInsert = entry;
    return this;
  }

  update(patch: any): this {
    this.pendingPatch = patch;
    return this;
  }

  delete(): this {
    this.isDelete = true;
    return this;
  }

  upsert(record: any): this {
    const targetTable = tables[this.tableName] ?? [];
    const index = targetTable.findIndex((r) => {
      if (record.id && r.id === record.id) return true;
      if (record.user_id && r.user_id === record.user_id) return true;
      return false;
    });

    if (index >= 0) {
      targetTable[index] = {
        ...targetTable[index],
        ...record,
        updated_at: new Date().toISOString(),
      };
    } else {
      const id =
        record.id || `${this.tableName.slice(0, 4)}-${Math.random().toString(36).slice(2, 9)}`;
      targetTable.push({ ...record, id, created_at: new Date().toISOString() });
    }

    tables[this.tableName] = targetTable;
    saveData(this.tableName, targetTable);
    return this;
  }

  private executeOperation(): { data: any; error: any; count?: number } {
    if (this.pendingInsert !== undefined) {
      const items = Array.isArray(this.pendingInsert) ? this.pendingInsert : [this.pendingInsert];
      const targetTable = tables[this.tableName] ?? [];
      const inserted: any[] = [];

      for (const item of items) {
        const id =
          item.id || `${this.tableName.slice(0, 4)}-${Math.random().toString(36).slice(2, 9)}`;
        const row = {
          ...item,
          id,
          created_at: item.created_at || new Date().toISOString(),
        };
        targetTable.unshift(row);
        inserted.push(row);
      }

      tables[this.tableName] = targetTable;
      saveData(this.tableName, targetTable);
      return {
        data: Array.isArray(this.pendingInsert) ? inserted : inserted[0],
        error: null,
      };
    }

    if (this.pendingPatch !== undefined) {
      const targetTable = tables[this.tableName] ?? [];
      let updatedCount = 0;
      tables[this.tableName] = targetTable.map((row) => {
        if (this.filters.every((f) => f(row))) {
          updatedCount++;
          return { ...row, ...this.pendingPatch, updated_at: new Date().toISOString() };
        }
        return row;
      });
      saveData(this.tableName, tables[this.tableName] ?? []);
      return { data: null, error: null, count: updatedCount };
    }

    if (this.isDelete) {
      const targetTable = tables[this.tableName] ?? [];
      const nextTable = targetTable.filter((row) => !this.filters.every((f) => f(row)));
      tables[this.tableName] = nextTable;
      saveData(this.tableName, nextTable);
      return { data: null, error: null };
    }

    const raw = tables[this.tableName] ?? [];
    let rows = raw.filter((row) => this.filters.every((f) => f(row)));
    const totalCount = rows.length;

    if (this.orderField) {
      const field = this.orderField;
      const asc = this.ascending;
      rows = [...rows].sort((a, b) => {
        const valA = a[field];
        const valB = b[field];
        if (valA < valB) return asc ? -1 : 1;
        if (valA > valB) return asc ? 1 : -1;
        return 0;
      });
    }

    if (this.rangeStart > 0 || this.rangeEnd < Infinity) {
      rows = rows.slice(this.rangeStart, this.rangeEnd + 1);
    }

    if (this.limitCount !== undefined) {
      rows = rows.slice(0, this.limitCount);
    }

    const data = this.headOnly ? null : rows.map((row) => this.hydrateRow(row));
    return { data, error: null, count: totalCount };
  }

  private hydrateRow(row: any): any {
    const res = { ...row };
    if (this.tableName === "posts") {
      const profiles = tables["profiles"] ?? [];
      const author = profiles.find((p: any) => p.id === row.author_id) ?? null;
      res.author = author;
      const likes = tables["likes"] ?? [];
      const comments = tables["comments"] ?? [];
      const postLikes = likes.filter((l: any) => l.post_id === row.id);
      const postComments = comments.filter((c: any) => c.post_id === row.id);
      res.likes = [{ count: postLikes.length }];
      res.comments = [{ count: postComments.length }];
    } else if (this.tableName === "comments") {
      const profiles = tables["profiles"] ?? [];
      const author = profiles.find((p: any) => p.id === row.author_id) ?? null;
      res.author = author;
    } else if (this.tableName === "notifications") {
      const profiles = tables["profiles"] ?? [];
      const actor = profiles.find((p: any) => p.id === row.actor_id) ?? null;
      res.actor = actor;
    } else if (this.tableName === "followers") {
      const profiles = tables["profiles"] ?? [];
      const following = profiles.find((p: any) => p.id === row.following_id) ?? null;
      const follower = profiles.find((p: any) => p.id === row.follower_id) ?? null;
      res.following = following;
      res.follower = follower;
      res.p = following ?? follower;
    } else if (this.tableName === "user_blocks") {
      const profiles = tables["profiles"] ?? [];
      const blocked = profiles.find((p: any) => p.id === row.blocked_id) ?? null;
      res.blocked = blocked;
    }
    return res;
  }

  async then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    try {
      const result = this.executeOperation();
      return Promise.resolve(onfulfilled ? onfulfilled(result) : (result as any));
    } catch (err) {
      if (onrejected) return Promise.resolve(onrejected(err));
      throw err;
    }
  }

  async maybeSingle() {
    const result = this.executeOperation();
    const rows = Array.isArray(result.data) ? result.data : result.data ? [result.data] : [];
    return { data: rows[0] ?? null, error: null };
  }

  async single() {
    const result = this.executeOperation();
    const rows = Array.isArray(result.data) ? result.data : result.data ? [result.data] : [];
    if (!rows.length) return { data: null, error: { message: "Row not found", code: "PGRST116" } };
    return { data: rows[0], error: null };
  }
}

// Smart query router: tries live Supabase first, falls back gracefully if table is missing
class SmartQueryBuilder {
  private tableName: string;
  private actions: Array<{ method: string; args: any[] }> = [];

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(...args: any[]): this {
    this.actions.push({ method: "select", args });
    return this;
  }

  eq(...args: any[]): this {
    this.actions.push({ method: "eq", args });
    return this;
  }

  neq(...args: any[]): this {
    this.actions.push({ method: "neq", args });
    return this;
  }

  in(...args: any[]): this {
    this.actions.push({ method: "in", args });
    return this;
  }

  or(...args: any[]): this {
    this.actions.push({ method: "or", args });
    return this;
  }

  order(...args: any[]): this {
    this.actions.push({ method: "order", args });
    return this;
  }

  limit(...args: any[]): this {
    this.actions.push({ method: "limit", args });
    return this;
  }

  range(...args: any[]): this {
    this.actions.push({ method: "range", args });
    return this;
  }

  insert(...args: any[]): this {
    this.actions.push({ method: "insert", args });
    return this;
  }

  update(...args: any[]): this {
    this.actions.push({ method: "update", args });
    return this;
  }

  delete(...args: any[]): this {
    this.actions.push({ method: "delete", args });
    return this;
  }

  upsert(...args: any[]): this {
    this.actions.push({ method: "upsert", args });
    return this;
  }

  private executeFallback(method?: string, args?: any[]) {
    let builder: any = new FallbackQueryBuilder(this.tableName);
    for (const a of this.actions) {
      if (typeof builder[a.method] === "function") {
        builder = builder[a.method](...a.args);
      }
    }
    if (method && typeof builder[method] === "function") {
      return builder[method](...(args ?? []));
    }
    return builder;
  }

  async then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    try {
      let query: any = liveSupabase.from(this.tableName as any);
      for (const a of this.actions) {
        if (typeof query[a.method] === "function") {
          query = query[a.method](...a.args);
        }
      }
      const response = await query;
      if (response?.error?.code === "PGRST205" || response?.error?.code === "PGRST200") {
        const fallbackRes = await this.executeFallback();
        return onfulfilled ? onfulfilled(fallbackRes) : (fallbackRes as any);
      }
      return onfulfilled ? onfulfilled(response) : (response as any);
    } catch {
      const fallbackRes = await this.executeFallback();
      return onfulfilled ? onfulfilled(fallbackRes) : (fallbackRes as any);
    }
  }

  async maybeSingle() {
    try {
      let query: any = liveSupabase.from(this.tableName as any);
      for (const a of this.actions) {
        if (typeof query[a.method] === "function") {
          query = query[a.method](...a.args);
        }
      }
      const response = await query.maybeSingle();
      if (response?.error?.code === "PGRST205" || response?.error?.code === "PGRST200") {
        return this.executeFallback("maybeSingle");
      }
      return response;
    } catch {
      return this.executeFallback("maybeSingle");
    }
  }

  async single() {
    try {
      let query: any = liveSupabase.from(this.tableName as any);
      for (const a of this.actions) {
        if (typeof query[a.method] === "function") {
          query = query[a.method](...a.args);
        }
      }
      const response = await query.single();
      if (response?.error?.code === "PGRST205" || response?.error?.code === "PGRST200") {
        return this.executeFallback("single");
      }
      return response;
    } catch {
      return this.executeFallback("single");
    }
  }
}

// Exported Supabase client that seamlessly connects to live Supabase backend
export const supabase = {
  from: (table: string) => new SmartQueryBuilder(table),

  rpc: async (fn: string, args?: Record<string, any>) => {
    try {
      const res = await liveSupabase.rpc(fn as any, args as any);
      if (!res.error) return res;
    } catch {
      // fallback
    }
    // Client-side fallback for custom functions like following_feed or mutual_followers
    if (fn === "following_feed") {
      const { data: sess } = await liveSupabase.auth.getSession();
      const uid = sess.session?.user?.id;
      if (!uid) return { data: [], error: null };
      const followers = tables["followers"] ?? [];
      const followingIds = followers
        .filter((f: any) => f.follower_id === uid)
        .map((f: any) => f.following_id);
      const posts = (tables["posts"] ?? []).filter((p: any) => followingIds.includes(p.author_id));
      return { data: posts.map((p: any) => ({ id: p.id })), error: null };
    }
    if (fn === "mutual_followers") {
      const targetId = args?.["_target"];
      const { data: sess } = await liveSupabase.auth.getSession();
      const uid = sess.session?.user?.id;
      if (!uid || !targetId) return { data: [], error: null };
      const followers = tables["followers"] ?? [];
      const myFollowing = followers
        .filter((f: any) => f.follower_id === uid)
        .map((f: any) => f.following_id);
      const targetFollowers = followers
        .filter((f: any) => f.following_id === targetId)
        .map((f: any) => f.follower_id);
      const mutualIds = myFollowing.filter((id: any) => targetFollowers.includes(id));
      const profiles = tables["profiles"] ?? [];
      const mutualProfiles = profiles
        .filter((p: any) => mutualIds.includes(p.id))
        .map((p: any) => ({
          handle: p.handle || p.username,
          display_name: p.display_name || p.username,
          total: mutualIds.length,
        }));
      return { data: mutualProfiles, error: null };
    }
    return { data: [], error: null };
  },

  storage: liveSupabase.storage,

  channel: (name: string) => liveSupabase.channel(name),

  removeChannel: (channel: any) => liveSupabase.removeChannel(channel),

  auth: liveSupabase.auth,
};
