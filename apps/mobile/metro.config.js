const { getDefaultConfig } = require("expo/metro-config");
const { withUniwindConfig } = require("uniwind/metro");
const path = require("path");

const localConvexDir = path.join(__dirname, "convex");

const config = getDefaultConfig(__dirname);

// Bridgeless RN 0.85 can hit a dev-only init race: setUpPerformance →
// TurboModuleRegistry → NativeModules → BatchedBridge → MessageQueue.
// inlineRequires defers those requires past module evaluation.
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: true,
      inlineRequires: true,
    },
  }),
};

const existingResolver = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "@convex" || moduleName.startsWith("@convex/")) {
    const targetPath =
      moduleName === "@convex"
        ? localConvexDir
        : path.join(localConvexDir, moduleName.slice("@convex/".length));

    return context.resolveRequest(context, targetPath, platform);
  }

  if (
    platform === "web" &&
    ["@expo/ui/swift-ui", "@expo/ui/swift-ui/modifiers"].includes(moduleName)
  ) {
    return { type: "empty" };
  }

  if (
    platform !== "android" &&
    ["@expo/ui/jetpack-compose", "@expo/ui/jetpack-compose/modifiers"].includes(
      moduleName,
    )
  ) {
    return { type: "empty" };
  }

  if (existingResolver) {
    return existingResolver(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withUniwindConfig(config, {
  cssEntryFile: "./src/global.css",
});
