import { toNativeColorString } from "@/lib/native-color";
import { useCSSVariable, useUniwind } from "uniwind";

function cssVarValue(value: string | number | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/** Liquid-glass `tintColor` — white in light mode, elevated gray in dark mode. */
export function useGlassTintColor(): string {
  const value = useCSSVariable("--app-glass-tint");
  return toNativeColorString(cssVarValue(value)) ?? "#FFFFFF";
}

/** Blur fallback tint when liquid glass is unavailable. */
export function useGlassBlurFallbackTint(): "light" | "dark" {
  const { theme } = useUniwind();
  return theme === "dark" ? "dark" : "light";
}
