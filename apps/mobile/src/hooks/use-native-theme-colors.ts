import { toNativeColorString } from "@/lib/native-color";
import { useCSSVariable, useUniwind } from "uniwind";

/** @theme aliases from global.css — must match Tailwind token names used in classNames. */
const THEME_VAR_NAMES = [
  "--color-foreground",
  "--color-muted-foreground",
  "--color-border",
  "--color-card",
  "--color-secondary",
  "--color-muted",
  "--color-accent",
  "--color-blue-400",
] as const;

function cssVarValue(value: string | number | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export type NativeThemeColors = {
  foreground: string | undefined;
  mutedForeground: string | undefined;
  border: string | undefined;
  card: string | undefined;
  secondary: string | undefined;
  muted: string | undefined;
  accent: string | undefined;
  link: string | undefined;
};

/**
 * Theme colors as hex/rgba strings for native APIs (enriched-markdown, etc.).
 * OKLCH tokens from global.css are converted via culori because processColor
 * does not support OKLCH.
 */
export function useNativeThemeColors(): NativeThemeColors & { theme: string } {
  const { theme } = useUniwind();
  const [
    foreground,
    mutedForeground,
    border,
    card,
    secondary,
    muted,
    accent,
    link,
  ] = useCSSVariable([...THEME_VAR_NAMES]);

  return {
    theme,
    foreground: toNativeColorString(cssVarValue(foreground)),
    mutedForeground: toNativeColorString(cssVarValue(mutedForeground)),
    border: toNativeColorString(cssVarValue(border)),
    card: toNativeColorString(cssVarValue(card)),
    secondary: toNativeColorString(cssVarValue(secondary)),
    muted: toNativeColorString(cssVarValue(muted)),
    accent: toNativeColorString(cssVarValue(accent)),
    link: toNativeColorString(cssVarValue(link)),
  };
}
