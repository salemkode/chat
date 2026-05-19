import AsyncStorage from "@react-native-async-storage/async-storage";

export const THEME_STORAGE_KEY = "theme-preference";
const DEFAULT_CUSTOM_PRIMARY = "#8b5cf6";

export type ThemeMode = "light" | "dark" | "system";

export type ThemeSettings = {
  mode: ThemeMode;
  primaryColor: string;
};

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  mode: "system",
  primaryColor: DEFAULT_CUSTOM_PRIMARY,
};

export function normalizeHexColor(
  value: unknown,
  fallback: string = DEFAULT_CUSTOM_PRIMARY,
): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(normalized)) {
    return `#${normalized
      .split("")
      .map((character) => `${character}${character}`)
      .join("")
      .toLowerCase()}`;
  }

  if (/^[0-9a-f]{6}$/i.test(normalized)) {
    return `#${normalized.toLowerCase()}`;
  }

  return fallback;
}

function parseThemeMode(
  value: unknown,
  fallback: ThemeMode = DEFAULT_THEME_SETTINGS.mode,
): ThemeMode {
  return value === "light" || value === "dark" || value === "system"
    ? value
    : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseThemeSettings(
  value: unknown,
  fallback: ThemeSettings = DEFAULT_THEME_SETTINGS,
): ThemeSettings {
  if (typeof value === "string") {
    if (value === "light" || value === "dark" || value === "system") {
      return { mode: value, primaryColor: fallback.primaryColor };
    }
    return fallback;
  }

  if (!isRecord(value)) {
    return fallback;
  }

  return {
    mode: parseThemeMode(value.mode, fallback.mode),
    primaryColor: normalizeHexColor(value.primaryColor, fallback.primaryColor),
  };
}

export function parseStoredThemeSettings(
  value: string | null,
  fallback: ThemeSettings = DEFAULT_THEME_SETTINGS,
): ThemeSettings {
  if (!value) {
    return fallback;
  }

  try {
    return parseThemeSettings(JSON.parse(value), fallback);
  } catch {
    return parseThemeSettings(value, fallback);
  }
}

export function serializeThemeSettings(settings: ThemeSettings): string {
  return JSON.stringify({
    mode: parseThemeMode(settings.mode, DEFAULT_THEME_SETTINGS.mode),
    primaryColor: normalizeHexColor(
      settings.primaryColor,
      DEFAULT_THEME_SETTINGS.primaryColor,
    ),
  });
}

export async function loadThemeSettings(): Promise<ThemeSettings> {
  const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
  return parseStoredThemeSettings(stored);
}

export async function saveThemeSettings(settings: ThemeSettings): Promise<void> {
  await AsyncStorage.setItem(THEME_STORAGE_KEY, serializeThemeSettings(settings));
}
