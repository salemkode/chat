/** @type {import('expo/config').ExpoConfig} */
const expo = {
  name: "Salemkode Chat Mobile",
  slug: "salemkode-chat-mobile",
  version: "1.0.0",
  orientation: "portrait",
  scheme: "salemkode-chat-mobile",
  icon: "./assets/icon.png",
  userInterfaceStyle: "automatic",
  ios: {
    supportsTablet: true,
    infoPlist: {
      UIViewControllerBasedStatusBarAppearance: false,
      ITSAppUsesNonExemptEncryption: false,
    },
    bundleIdentifier: "com.salemkode.agent",
    appleTeamId: "A5XBH27R6R",
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/android-icon-foreground.png",
      backgroundImage: "./assets/android-icon-background.png",
      monochromeImage: "./assets/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
    package: "com.salemkode.agent",
  },
  web: {
    output: "server",
  },
  plugins: [
    "expo-router",
    "expo-dev-client",
    [
      "expo-build-properties",
      {
        android: {
          enableMinifyInReleaseBuilds: true,
          enableShrinkResourcesInReleaseBuilds: true,
          enablePngCrunchInReleaseBuilds: true,
          useLegacyPackaging: true,
        },
      },
    ],
    "@clerk/expo",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#160C2B",
      },
    ],
    "expo-asset",
    "expo-document-picker",
    "expo-font",
    "expo-image",
    [
      "expo-image-picker",
      {
        photosPermission: "Choose photos to use in the app.",
        cameraPermission: "Allow $(PRODUCT_NAME) to use your camera for chat attachments.",
        microphonePermission: false,
      },
    ],
    "expo-secure-store",
    "expo-web-browser",
    "expo-system-ui",
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    EXPO_PUBLIC_CLERK_GOOGLE_IOS_URL_SCHEME:
      "com.googleusercontent.apps.719208346092-o0aglbhq4vgg5frg2b1bi0o7e4bj1gpn",
    router: {},
    eas: {
      projectId: "3eb43048-7dce-40e1-b4e5-5fd0a4e62756",
    },
  },
};
const buildProfile = process.env.EXPO_PUBLIC_EAS_BUILD_PROFILE;

function readEnvOverride(key, fallback) {
  const value = process.env[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

const isDevelopmentProfile = buildProfile === "development";
const appName = readEnvOverride(
  "EXPO_APP_NAME",
  isDevelopmentProfile ? "Chat Dev" : expo.name,
);
const appScheme = readEnvOverride(
  "EXPO_APP_SCHEME",
  isDevelopmentProfile ? `${expo.scheme}-dev` : expo.scheme,
);
const iosBundleIdentifier = readEnvOverride(
  "EXPO_IOS_BUNDLE_IDENTIFIER",
  isDevelopmentProfile ? `${expo.ios.bundleIdentifier}.dev` : expo.ios.bundleIdentifier,
);
const androidPackage = readEnvOverride(
  "EXPO_ANDROID_PACKAGE",
  isDevelopmentProfile ? `${expo.android.package}.dev` : expo.android.package,
);

module.exports = () => ({
  ...expo,
  name: appName,
  scheme: appScheme,
  ios: {
    ...expo.ios,
    bundleIdentifier: iosBundleIdentifier,
  },
  android: {
    ...expo.android,
    package: androidPackage,
  },
  extra: {
    ...expo.extra,
    EXPO_PUBLIC_CONVEX_URL: process.env.EXPO_PUBLIC_CONVEX_URL,
    EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
    EXPO_PUBLIC_CLERK_GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_CLERK_GOOGLE_WEB_CLIENT_ID,
    EXPO_PUBLIC_CLERK_GOOGLE_IOS_CLIENT_ID: process.env.EXPO_PUBLIC_CLERK_GOOGLE_IOS_CLIENT_ID,
    EXPO_PUBLIC_CLERK_GOOGLE_ANDROID_CLIENT_ID:
      process.env.EXPO_PUBLIC_CLERK_GOOGLE_ANDROID_CLIENT_ID,
    EXPO_PUBLIC_CLERK_ENABLE_DEV_PASSWORD_AUTH:
      process.env.EXPO_PUBLIC_CLERK_ENABLE_DEV_PASSWORD_AUTH,
    EXPO_PUBLIC_APP_URL: process.env.EXPO_PUBLIC_APP_URL,
  },
});
