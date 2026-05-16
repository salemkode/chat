const { getDefaultConfig } = require("expo/metro-config");
const { withUniwindConfig } = require("uniwind/metro");
const path = require("path");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const workspaceRoot = path.resolve(__dirname, "../..");
const backendConvexDir = path.join(workspaceRoot, "packages/backend/convex");

config.watchFolders = [workspaceRoot];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "@convex" || moduleName.startsWith("@convex/")) {
    const convexModulePath =
      moduleName === "@convex"
        ? backendConvexDir
        : path.join(backendConvexDir, moduleName.slice("@convex/".length));

    return context.resolveRequest(context, convexModulePath, platform);
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
