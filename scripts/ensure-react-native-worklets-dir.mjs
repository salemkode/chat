import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const isLocalEasBuild =
  process.env.EAS_BUILD === "true" &&
  process.env.EAS_BUILD_RUNNER === "local-build-plugin";

function replaceInFile(filePath, replacements) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const original = fs.readFileSync(filePath, "utf8");
  let patched = original;

  for (const [searchValue, replaceValue] of replacements) {
    patched = patched.replace(searchValue, replaceValue);
  }

  if (patched !== original) {
    fs.writeFileSync(filePath, patched, "utf8");
  }
}

const targets = [
  path.join(repoRoot, "node_modules/react-native-worklets/.worklets"),
  path.join(repoRoot, "apps/mobile/node_modules/react-native-worklets/.worklets"),
];

for (const dir of targets) {
  const packageDir = path.dirname(dir);
  if (!fs.existsSync(packageDir)) {
    continue;
  }

  fs.mkdirSync(dir, { recursive: true });

  const dummyFile = path.join(dir, "dummy.md");
  if (!fs.existsSync(dummyFile)) {
    fs.writeFileSync(
      dummyFile,
      "# Generated worklets directory\n",
      "utf8",
    );
  }
}

const gradlePluginSettingsPath = path.join(
  repoRoot,
  "node_modules/@react-native/gradle-plugin/settings.gradle.kts",
);

if (isLocalEasBuild) {
  replaceInFile(gradlePluginSettingsPath, [
    [
      'plugins { id("org.gradle.toolchains.foojay-resolver-convention").version("0.5.0") }',
      "// Foojay resolver disabled for local EAS builds; use the configured local JDK instead.",
    ],
  ]);
}

replaceInFile(path.join(repoRoot, "node_modules/@expo/dom-webview/ios/DomWebView.swift"), [
  [/import ExpoModulesCore\s+import WebKit/, "import ExpoModulesCore\nimport React\nimport WebKit"],
]);

replaceInFile(path.join(repoRoot, "node_modules/@expo/dom-webview/ios/ExpoDomWebView.podspec"), [
  [/:ios => '15\.1'/, ":ios => '17.0'"],
]);
