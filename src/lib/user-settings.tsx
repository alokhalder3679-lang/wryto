import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useInkline } from "./inkline-context";
import { dictionaries, type Lang, type TKey } from "./i18n";

export type Settings = {
  language: Lang;
  theme: "light" | "dark" | "system";
  font_size: "small" | "medium" | "large";
  reading_mode: boolean;
  is_private: boolean;
  who_can_follow: "everyone" | "nobody";
  who_can_comment: "everyone" | "followers" | "nobody";
  notify_all: boolean;
  notify_likes: boolean;
  notify_comments: boolean;
  notify_follows: boolean;
};
export const DEFAULT_SETTINGS: Settings = {
  language: "en",
  theme: "system",
  font_size: "medium",
  reading_mode: false,
  is_private: false,
  who_can_follow: "everyone",
  who_can_comment: "everyone",
  notify_all: true,
  notify_likes: true,
  notify_comments: true,
  notify_follows: true,
};
const LOCAL = "inkline-settings";

type Ctx = {
  settings: Settings;
  update: (patch: Partial<Settings>) => Promise<boolean>;
  t: (k: TKey) => string;
};
const SettingsContext = createContext<Ctx | null>(null);

export function applySettings(s: Settings) {
  try {
    const root = document.documentElement;
    const dark =
      s.theme === "dark" ||
      (s.theme === "system" && typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)")?.matches);
    root.classList.toggle("dark", dark);
    try {
      localStorage.setItem("inkline-theme", dark ? "dark" : "light");
    } catch {
      // ignore
    }
    root.style.fontSize =
      s.font_size === "small" ? "15px" : s.font_size === "large" ? "18px" : "16px";
    root.classList.toggle("reading-mode", s.reading_mode);
    root.lang = s.language;
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("inkline-theme", { detail: dark }));
    }
  } catch (e) {
    console.warn("[UserSettings] applySettings error:", e);
  }
}

export function UserSettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useInkline();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL);
      if (raw) {
        const s = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
        setSettings(s);
        applySettings(s);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!data) {
        await supabase.from("user_settings").insert({ user_id: user.id });
        return;
      }
      const { user_id: _u, updated_at: _t, ...rest } = data;
      const s = { ...DEFAULT_SETTINGS, ...rest } as Settings;
      setSettings(s);
      applySettings(s);
      localStorage.setItem(LOCAL, JSON.stringify(s));
    })();
  }, [user]);

  const update = useCallback(
    async (patch: Partial<Settings>) => {
      const next = { ...settings, ...patch };
      setSettings(next);
      applySettings(next);
      localStorage.setItem(LOCAL, JSON.stringify(next));
      if (!user) return true;
      const { error } = await supabase.from("user_settings").upsert({ user_id: user.id, ...next });
      return !error;
    },
    [settings, user],
  );

  const t = useCallback(
    (k: TKey) => dictionaries[settings.language]?.[k] ?? dictionaries.en[k],
    [settings.language],
  );
  return (
    <SettingsContext.Provider value={{ settings, update, t }}>{children}</SettingsContext.Provider>
  );
}

export const FALLBACK_SETTINGS_CONTEXT: Ctx = {
  settings: DEFAULT_SETTINGS,
  update: async () => false,
  t: (k: TKey) => dictionaries.en[k] ?? k,
};

export function useSettings() {
  const v = useContext(SettingsContext);
  return v ?? FALLBACK_SETTINGS_CONTEXT;
}
