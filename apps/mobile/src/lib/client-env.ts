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
  "EXPO_PUBLIC_CLERK_ENABLE_DEV_PASSWORD_AUTH",
  "EXPO_PUBLIC_APP_URL",
] as const;

export type ClientEnvEntry = {
  key: string;
  value: string;
};

function normalizeEnvValue(value: string | undefined): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function readKnownProcessEnv(
  key: (typeof CLIENT_PUBLIC_ENV_KEYS)[number] | "EXPO_OS",
): string | undefined {
  switch (key) {
    case "EXPO_OS":
      return normalizeEnvValue(process.env.EXPO_OS);
    case "EXPO_PUBLIC_EAS_ENVIRONMENT":
      return normalizeEnvValue(process.env.EXPO_PUBLIC_EAS_ENVIRONMENT);
    case "EXPO_PUBLIC_EAS_BUILD_PROFILE":
      return normalizeEnvValue(process.env.EXPO_PUBLIC_EAS_BUILD_PROFILE);
    case "EXPO_PUBLIC_CONVEX_URL":
      return normalizeEnvValue(process.env.EXPO_PUBLIC_CONVEX_URL);
    case "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY":
      return normalizeEnvValue(process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY);
    case "EXPO_PUBLIC_CLERK_GOOGLE_WEB_CLIENT_ID":
      return normalizeEnvValue(process.env.EXPO_PUBLIC_CLERK_GOOGLE_WEB_CLIENT_ID);
    case "EXPO_PUBLIC_CLERK_GOOGLE_IOS_CLIENT_ID":
      return normalizeEnvValue(process.env.EXPO_PUBLIC_CLERK_GOOGLE_IOS_CLIENT_ID);
    case "EXPO_PUBLIC_CLERK_GOOGLE_ANDROID_CLIENT_ID":
      return normalizeEnvValue(process.env.EXPO_PUBLIC_CLERK_GOOGLE_ANDROID_CLIENT_ID);
    case "EXPO_PUBLIC_CLERK_ENABLE_DEV_PASSWORD_AUTH":
      return normalizeEnvValue(process.env.EXPO_PUBLIC_CLERK_ENABLE_DEV_PASSWORD_AUTH);
    case "EXPO_PUBLIC_APP_URL":
      return normalizeEnvValue(process.env.EXPO_PUBLIC_APP_URL);
  }
}

function readExtraEnv(key: string): string | undefined {
  const extra = Constants.expoConfig?.extra;
  if (!extra || typeof extra !== "object" || !(key in extra)) {
    return undefined;
  }

  const value = extra[key];
  return normalizeEnvValue(typeof value === "string" ? value : undefined);
}

function readClientEnv(key: (typeof CLIENT_PUBLIC_ENV_KEYS)[number]): string | undefined {
  return readExtraEnv(key) ?? readKnownProcessEnv(key);
}

export function getClientEnvEntries(): ClientEnvEntry[] {
  const entries: ClientEnvEntry[] = [
    { key: "EXPO_OS", value: readKnownProcessEnv("EXPO_OS") ?? "(not set)" },
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
