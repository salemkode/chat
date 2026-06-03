const { getDefaultConfig } = require("expo/metro-config");
const { withUniwindConfig } = require("uniwind/metro");
const path = require("path");

const localConvexDir = path.join(__dirname, "convex");
const appNodeModules = path.join(__dirname, "node_modules");
const workspaceNodeModules = path.join(__dirname, "..", "..", "node_modules");
const reactPackageRoot = path.dirname(require.resolve("react/package.json"));
const reactDomPackageRoot = path.dirname(require.resolve("react-dom/package.json"));
const reactNativePackageRoot = path.dirname(require.resolve("react-native/package.json"));

const config = getDefaultConfig(__dirname);

// Metro can lose track of hoisted packages in this pnpm workspace when caches
// are warm or when a dependency graph changes mid-session. Pin the primary
// package roots so core React Native modules always resolve from known paths.
config.resolver = {
  ...config.resolver,
  nodeModulesPaths: [appNodeModules, workspaceNodeModules],
  extraNodeModules: {
    ...config.resolver.extraNodeModules,
    react: reactPackageRoot,
    "react-dom": reactDomPackageRoot,
    "react-native": reactNativePackageRoot,
  },
};

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
