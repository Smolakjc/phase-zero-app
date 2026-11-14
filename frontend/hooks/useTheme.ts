"use client";

import { useCallback, useEffect, useState } from "react";

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "color-scheme";

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "dark";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readStoredPreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "light" || raw === "dark") return raw;
  } catch {
    // Ignore storage access errors in restricted contexts
  }
  return "system";
}

function applyThemeToDocument(pref: ThemePreference): void {
  if (typeof document === "undefined") return;
  const content = pref === "system" ? "light dark" : pref;
  let meta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "color-scheme";
    document.head.appendChild(meta);
  }
  meta.content = content;
}

/**
 * Gerencia tema Claro, Escuro e Automático (Sistema) em sincronia com `<meta name="color-scheme">`
 * e múltiplas abas (`storage` + `matchMedia` change).
 */
export function useTheme(): {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (next: ThemePreference) => void;
  toggleTheme: () => void;
} {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>("dark");

  useEffect(() => {
    const initialPref = readStoredPreference();
    setPreferenceState(initialPref);
    setSystemTheme(getSystemTheme());
    applyThemeToDocument(initialPref);

    const media =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-color-scheme: dark)")
        : null;

    const handleMediaChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? "dark" : "light");
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      const next = e.newValue === "light" || e.newValue === "dark" ? e.newValue : "system";
      setPreferenceState(next);
      applyThemeToDocument(next);
    };

    media?.addEventListener("change", handleMediaChange);
    window.addEventListener("storage", handleStorage);
    return () => {
      media?.removeEventListener("change", handleMediaChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const resolvedTheme: ResolvedTheme = preference === "system" ? systemTheme : preference;

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    applyThemeToDocument(next);
    try {
      if (next === "system") {
        window.localStorage.removeItem(STORAGE_KEY);
      } else {
        window.localStorage.setItem(STORAGE_KEY, next);
      }
    } catch {
      // Ignore storage access errors
    }
  }, []);

  const toggleTheme = useCallback(() => {
    const currentResolved = preference === "system" ? getSystemTheme() : preference;
    const target: ResolvedTheme = currentResolved === "dark" ? "light" : "dark";
    const sys = getSystemTheme();
    // Se o destino voltar a coincidir com o sistema, remove o override para acompanhar o SO
    if (target === sys) {
      setPreference("system");
    } else {
      setPreference(target);
    }
  }, [preference, setPreference]);

  return { preference, resolvedTheme, setPreference, toggleTheme };
}
