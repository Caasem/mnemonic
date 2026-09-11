// App-wide settings state: loads once at startup, applies the theme to the
// document root, and exposes settings + a setter to any page (Settings page,
// nav bar for showReviewTab, Memory page for sort order, etc).
import React, { createContext, useContext, useEffect, useState } from "react";
import { DEFAULT_SETTINGS } from "../core/types";
import type { Settings } from "../core/types";
import { getAllMemories, getSettings, saveSettings } from "../db/repository";
import { seedDemoData } from "../db/seed";

interface SettingsContextValue {
  settings: Settings;
  loaded: boolean;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  loaded: false,
  updateSettings: async () => {},
});

function applyTheme(theme: Settings["theme"]) {
  const root = document.documentElement;
  if (theme === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", theme);
  }
}

// Module-level guard against seeding running twice in one page load — e.g.
// React.StrictMode intentionally double-invokes effects in development,
// and both invocations would otherwise read "0 memories" before either has
// finished writing, causing a duplicate seed. A per-module promise makes the
// whole init-and-maybe-seed sequence idempotent regardless of how many times
// the effect fires.
let initPromise: Promise<Settings> | null = null;

async function initSettingsOnce(): Promise<Settings> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    let s = await getSettings();
    if (!s.seeded) {
      const existing = await getAllMemories();
      if (existing.length === 0) {
        await seedDemoData();
      }
      s = { ...s, seeded: true };
      await saveSettings(s);
    }
    return s;
  })();
  return initPromise;
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    initSettingsOnce().then((s) => {
      if (cancelled) return;
      applyTheme(s.theme);
      setSettings(s);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function updateSettings(patch: Partial<Settings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    if (patch.theme) applyTheme(next.theme);
    await saveSettings(next);
  }

  return (
    <SettingsContext.Provider value={{ settings, loaded, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  return useContext(SettingsContext);
}
