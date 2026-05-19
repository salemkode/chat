import { loadThemeSettings } from "@/lib/theme-preference";
import { useEffect } from "react";
import { Uniwind } from "uniwind";

/** Applies persisted theme mode before the first paint when possible. */
export function ThemePreferenceBootstrap() {
  useEffect(() => {
    void loadThemeSettings().then((settings) => {
      Uniwind.setTheme(settings.mode);
    });
  }, []);

  return null;
}
