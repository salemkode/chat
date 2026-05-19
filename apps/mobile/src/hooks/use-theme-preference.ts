import {
  DEFAULT_THEME_SETTINGS,
  loadThemeSettings,
  saveThemeSettings,
  type ThemeMode,
  type ThemeSettings,
} from "@/lib/theme-preference";
import { useCallback, useEffect, useState } from "react";
import { Uniwind } from "uniwind";

export function useThemePreference() {
  const [settings, setSettings] = useState<ThemeSettings>(DEFAULT_THEME_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadThemeSettings().then((loaded) => {
      if (cancelled) {
        return;
      }
      setSettings(loaded);
      Uniwind.setTheme(loaded.mode);
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setMode = useCallback(async (mode: ThemeMode) => {
    const next = { ...settings, mode };
    setSettings(next);
    Uniwind.setTheme(mode);
    await saveThemeSettings(next);
  }, [settings]);

  return {
    settings,
    hydrated,
    setMode,
  };
}
