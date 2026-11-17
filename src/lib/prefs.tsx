"use client";
// Viewer preferences: language (EN/PT) and day/night theme. Stored per browser.
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { PT } from "./i18n";

export type Lang = "en" | "pt";
export type Theme = "light" | "dark";

interface Prefs {
  lang: Lang;
  theme: Theme;
  setLang: (l: Lang) => void;
  setTheme: (t: Theme) => void;
  /** Translate an English UI string (returns it unchanged in English or when no translation exists). */
  t: (s: string) => string;
}

const Ctx = createContext<Prefs | null>(null);
const LANG_KEY = "option-lang";
const THEME_KEY = "option-theme";

export function PrefsProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    try {
      const l = localStorage.getItem(LANG_KEY);
      if (l === "pt" || l === "en") setLangState(l);
      const t = localStorage.getItem(THEME_KEY);
      setThemeState(t === "dark" || (!t && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light");
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === "pt" ? "pt-PT" : "en";
  }, [lang]);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {}
  }, []);
  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch {}
  }, []);
  const t = useCallback((s: string) => (lang === "pt" ? PT[s] ?? s : s), [lang]);

  return <Ctx.Provider value={{ lang, theme, setLang, setTheme, t }}>{children}</Ctx.Provider>;
}

export function usePrefs() {
  const p = useContext(Ctx);
  if (!p) throw new Error("usePrefs must be used inside PrefsProvider");
  return p;
}

export const useT = () => usePrefs().t;

/** PT | EN switch and day/night button. `onBrand` = sitting on the red header. */
export function PrefsToggle({ onBrand = false, className = "" }: { onBrand?: boolean; className?: string }) {
  const { lang, setLang, theme, setTheme, t } = usePrefs();
  const wrap = onBrand ? "border-white/25 bg-white/10" : "border-line bg-white/80 backdrop-blur";
  const on = onBrand ? "bg-white text-brand" : "bg-ink text-paper";
  const off = onBrand ? "text-white/75 hover:text-white" : "text-ink/55 hover:text-ink";
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <div className={`flex rounded-lg border p-0.5 text-xs font-bold ${wrap}`} role="group" aria-label={t("Language")}>
        {(["pt", "en"] as Lang[]).map((l) => (
          <button key={l} type="button" onClick={() => setLang(l)} aria-pressed={lang === l} className={`rounded-md px-2 py-1 uppercase transition ${lang === l ? on : off}`}>
            {l}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className={`grid size-8 place-items-center rounded-lg border transition ${wrap} ${off}`}
        aria-label={theme === "dark" ? t("Day mode") : t("Night mode")}
        title={theme === "dark" ? t("Day mode") : t("Night mode")}
      >
        {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </button>
    </div>
  );
}
