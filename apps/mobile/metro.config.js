const { getDefaultConfig } = require("expo/metro-config");
const { withUniwindConfig } = require("uniwind/metro");
const path = require("path");
const fs = require("fs");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const workspaceRoot = path.resolve(__dirname, "../..");
const backendConvexDir = path.join(workspaceRoot, "packages/backend/convex");
const localConvexDir = path.join(__dirname, "convex");

// Only add watchFolders if backend directory exists (for local development)
if (fs.existsSync(backendConvexDir)) {
  config.watchFolders = [workspaceRoot];
}

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "@convex" || moduleName.startsWith("@convex/")) {
    // For EAS builds, use local convex directory
    const localConvexModulePath =
      moduleName === "@convex"
        ? localConvexDir
        : path.join(localConvexDir, moduleName.slice("@convex/".length));

    // For local development, use backend workspace directory
    const backendConvexModulePath =
      moduleName === "@convex"
        ? backendConvexDir
        : path.join(backendConvexDir, moduleName.slice("@convex/".length));

    // Check if local directory exists (for EAS builds)
    if (fs.existsSync(localConvexDir)) {
      return context.resolveRequest(context, localConvexModulePath, platform);
    }

    // Fallback to backend directory (for local development)
    return context.resolveRequest(context, backendConvexModulePath, platform);
  }

  if (
    platform === "web" &&
    ["@expo/ui/swift-ui", "@expo/ui/swift-ui/modifiers"].includes(moduleName)
  ) {
    return {
      type: "empty",
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withUniwindConfig(config, {
  cssEntryFile: "./src/global.css",
  debug: true,
});
