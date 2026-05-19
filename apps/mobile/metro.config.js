const { getDefaultConfig } = require("expo/metro-config");
const { withUniwindConfig } = require("uniwind/metro");
const { getBundleModeMetroConfig } = require("react-native-worklets/bundleMode");
const path = require("path");
const fs = require("fs");

const workspaceRoot = path.resolve(__dirname, "../..");
const backendConvexDir = path.join(workspaceRoot, "packages/backend/convex");
const localConvexDir = path.join(__dirname, "convex");
const workletsPackageDir = path.dirname(
  require.resolve("react-native-worklets/package.json"),
);
const workletsBundleDir = path.join(workletsPackageDir, ".worklets");

const config = getDefaultConfig(__dirname);

if (fs.existsSync(backendConvexDir)) {
  config.watchFolders = [workspaceRoot];
}

config.watchFolders = config.watchFolders || [];
config.watchFolders.push(workletsBundleDir);

const bundleModeMetroConfig = getBundleModeMetroConfig(config);

const existingResolver = config.resolver.resolveRequest;
const bundleModeResolver = bundleModeMetroConfig.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "@convex" || moduleName.startsWith("@convex/")) {
    const localConvexModulePath =
      moduleName === "@convex"
        ? localConvexDir
        : path.join(localConvexDir, moduleName.slice("@convex/".length));

    const backendConvexModulePath =
      moduleName === "@convex"
        ? backendConvexDir
        : path.join(backendConvexDir, moduleName.slice("@convex/".length));

    if (fs.existsSync(localConvexDir)) {
      return context.resolveRequest(context, localConvexModulePath, platform);
    }

    return context.resolveRequest(context, backendConvexModulePath, platform);
  }

  if (
    moduleName.startsWith(
      path.join("react-native-worklets", ".worklets"),
    )
  ) {
    return bundleModeResolver(context, moduleName, platform);
  }

  if (
    platform === "web" &&
    ["@expo/ui/swift-ui", "@expo/ui/swift-ui/modifiers"].includes(moduleName)
  ) {
    return {
      type: "empty",
    };
  }

  if (
    platform !== "android" &&
    ["@expo/ui/jetpack-compose", "@expo/ui/jetpack-compose/modifiers"].includes(
      moduleName,
    )
  ) {
    return {
      type: "empty",
    };
  }

  if (existingResolver) {
    return existingResolver(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withUniwindConfig(
  Object.assign(config, {
    resolver: {
      ...config.resolver,
      ...bundleModeMetroConfig.resolver,
      resolveRequest: config.resolver.resolveRequest,
    },
    transformer: {
      ...config.transformer,
      ...bundleModeMetroConfig.transformer,
    },
  }),
  {
    cssEntryFile: "./src/global.css",
    debug: true,
  },
);
