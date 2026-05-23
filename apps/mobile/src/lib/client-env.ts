import Constants from "expo-constants";

/** Public env vars the mobile client reads at build time. */
export const CLIENT_PUBLIC_ENV_KEYS = [
  "EXPO_PUBLIC_EAS_ENVIRONMENT",
  "EXPO_PUBLIC_EAS_BUILD_PROFILE",
  "EXPO_PUBLIC_CONVEX_URL",
  "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "EXPO_PUBLIC_CLERK_GOOGLE_WEB_CLIENT_ID",
  "EXPO_PUBLIC_CLERK_GOOGLE_IOS_CLIENT_ID",
  "EXPO_PUBLIC_CLERK_GOOGLE_ANDROID_CLIENT_ID",
  "EXPO_PUBLIC_APP_URL",
] as const;

export type ClientEnvEntry = {
  key: string;
  value: string;
};

function readProcessEnv(key: string): string | undefined {
  const value = process.env[key];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function readExtraEnv(key: string): string | undefined {
  const extra = Constants.expoConfig?.extra;
  if (!extra || typeof extra !== "object" || !(key in extra)) {
    return undefined;
  }

  const value = extra[key];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function readClientEnv(key: string): string | undefined {
  return readExtraEnv(key) ?? readProcessEnv(key);
}

export function getClientEnvEntries(): ClientEnvEntry[] {
  const entries: ClientEnvEntry[] = [
    { key: "EXPO_OS", value: readProcessEnv("EXPO_OS") ?? "(not set)" },
    { key: "__DEV__", value: String(__DEV__) },
  ];

  for (const key of CLIENT_PUBLIC_ENV_KEYS) {
    entries.push({
      key,
      value: readClientEnv(key) ?? "(not set)",
    });
  }

  return entries;
}
