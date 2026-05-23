#!/usr/bin/env node
/**
 * Android Google sign-in smoke test via mobile-mcp.
 * Usage: node scripts/android-google-login-check.mjs [path/to/app.apk]
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const PACKAGE_NAME = "com.salemkode.agent";
const ANDROID_DEVICE_ID = "emulator-5554";
const apkPath = resolve(process.argv[2] ?? "");

function textContent(result) {
  return result.content
    .filter((item) => item.type === "text")
    .map((item) => item.text)
    .join("\n");
}

async function callTool(client, name, args = {}) {
  const result = await client.callTool({ name, arguments: args });
  if (result.isError) {
    throw new Error(`${name} failed:\n${textContent(result)}`);
  }
  return textContent(result);
}

function parseElements(raw) {
  const marker = "Found these elements on screen:";
  const jsonStart = raw.indexOf("[", raw.indexOf(marker));
  if (jsonStart === -1) {
    return [];
  }
  return JSON.parse(raw.slice(jsonStart));
}

function findGoogleButton(elements) {
  for (const element of elements) {
    const label = `${element.text ?? ""} ${element.label ?? ""}`.toLowerCase();
    if (label.includes("continue with google") || label.includes("sign in with google")) {
      const { x, y, width, height } = element.coordinates;
      return {
        x: x + width / 2,
        y: y + height / 2,
        label: label.trim(),
      };
    }
  }
  return null;
}

function screenHasGooglePrompt(raw) {
  const lower = raw.toLowerCase();
  return (
    lower.includes("choose an account") ||
    lower.includes("sign in with google") ||
    lower.includes("google account") ||
    lower.includes("add another account") ||
    lower.includes("one tap sign") ||
    lower.includes("checking info") ||
    lower.includes("com.google.android.gms") ||
    lower.includes("clerk")
  );
}

function screenHasGoogleFailure(raw) {
  const lower = raw.toLowerCase();
  return (
    lower.includes("google sign-in failed") ||
    lower.includes("credentials not found") ||
    lower.includes("please set expo_public_clerk_google")
  );
}

async function unlockDevice(client) {
  await callTool(client, "mobile_press_button", {
    device: ANDROID_DEVICE_ID,
    button: "HOME",
  });
  await callTool(client, "mobile_swipe_on_screen", {
    device: ANDROID_DEVICE_ID,
    direction: "up",
    y: 2000,
  });
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 1000));
}

async function launchAppViaAdb() {
  execSync(
    `adb -s ${ANDROID_DEVICE_ID} shell monkey -p ${PACKAGE_NAME} -c android.intent.category.LAUNCHER 1`,
    { stdio: "ignore" },
  );
}

async function openAppFromLauncher(client) {
  try {
    await launchAppViaAdb();
    return;
  } catch {
    console.log("ADB launch failed, falling back to launcher navigation.");
  }

  await callTool(client, "mobile_press_button", {
    device: ANDROID_DEVICE_ID,
    button: "HOME",
  });
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 1000));

  let elementsRaw = await callTool(client, "mobile_list_elements_on_screen", {
    device: ANDROID_DEVICE_ID,
  });
  let elements = parseElements(elementsRaw);

  const appEntry = elements.find((element) => {
    const label = `${element.text ?? ""} ${element.label ?? ""}`.toLowerCase();
    return (
      label.includes("salemkode") ||
      label.includes("chat mobile") ||
      label.includes("agent")
    );
  });

  if (appEntry) {
    const { x, y, width, height } = appEntry.coordinates;
    await callTool(client, "mobile_click_on_screen_at_coordinates", {
      device: ANDROID_DEVICE_ID,
      x: Math.round(x + width / 2),
      y: Math.round(y + height / 2),
    });
    return;
  }

  // Fall back to opening the app drawer and searching visually.
  await callTool(client, "mobile_swipe_on_screen", {
    device: ANDROID_DEVICE_ID,
    direction: "up",
    y: 2100,
  });
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 1500));

  elementsRaw = await callTool(client, "mobile_list_elements_on_screen", {
    device: ANDROID_DEVICE_ID,
  });
  elements = parseElements(elementsRaw);
  const drawerEntry = elements.find((element) => {
    const label = `${element.text ?? ""} ${element.label ?? ""}`.toLowerCase();
    return label.includes("salemkode") || label.includes("chat");
  });

  if (!drawerEntry) {
    throw new Error("Could not find the app icon on the launcher.");
  }

  const { x, y, width, height } = drawerEntry.coordinates;
  await callTool(client, "mobile_click_on_screen_at_coordinates", {
    device: ANDROID_DEVICE_ID,
    x: Math.round(x + width / 2),
    y: Math.round(y + height / 2),
  });
}

async function main() {
  if (!apkPath || !existsSync(apkPath)) {
    throw new Error(`APK not found: ${apkPath || "(missing path argument)"}`);
  }

  const transport = new StdioClientTransport({
    command: "npx",
    args: ["-y", "@mobilenext/mobile-mcp@latest"],
    env: {
      ...process.env,
      MOBILEMCP_DISABLE_TELEMETRY: "1",
    },
    stderr: "pipe",
  });

  const client = new Client(
    { name: "chat-android-google-login-check", version: "1.0.0" },
    {
      capabilities: {},
      requestTimeout: 120_000,
    },
  );

  await client.connect(transport);

  try {
    const devices = await callTool(client, "mobile_list_available_devices");
    console.log("Devices:\n", devices);

    if (!devices.includes(ANDROID_DEVICE_ID)) {
      throw new Error(`Expected Android emulator ${ANDROID_DEVICE_ID} to be online.`);
    }

    await unlockDevice(client);

    console.log(`Uninstalling any existing ${PACKAGE_NAME} build ...`);
    try {
      await callTool(client, "mobile_uninstall_app", {
        device: ANDROID_DEVICE_ID,
        bundle_id: PACKAGE_NAME,
      });
    } catch {
      console.log("No previous install to remove.");
    }

    console.log(`Installing ${apkPath} ...`);
    await callTool(client, "mobile_install_app", {
      device: ANDROID_DEVICE_ID,
      path: apkPath,
    });

    console.log("Launching app via adb ...");
    await openAppFromLauncher(client);

    await new Promise((resolveDelay) => setTimeout(resolveDelay, 8000));

    const elementsRaw = await callTool(client, "mobile_list_elements_on_screen", {
      device: ANDROID_DEVICE_ID,
    });
    console.log("Sign-in screen elements:\n", elementsRaw);

    const elements = parseElements(elementsRaw);
    const googleButton = findGoogleButton(elements);
    if (!googleButton) {
      if (!screenHasGooglePrompt(elementsRaw)) {
        throw new Error("Could not find a Google sign-in button on screen.");
      }
      console.log("App appears already on an auth-related screen.");
    } else {
      console.log(`Tapping Google sign-in at (${googleButton.x}, ${googleButton.y}) ...`);
      await callTool(client, "mobile_click_on_screen_at_coordinates", {
        device: ANDROID_DEVICE_ID,
        x: Math.round(googleButton.x),
        y: Math.round(googleButton.y),
      });
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 5000));
    }

    const afterTapRaw = await callTool(client, "mobile_list_elements_on_screen", {
      device: ANDROID_DEVICE_ID,
    });
    console.log("After Google tap:\n", afterTapRaw);

    if (screenHasGoogleFailure(afterTapRaw)) {
      throw new Error(
        "Google sign-in failed in the built app. Clerk Google credentials were not embedded at build time.",
      );
    }

    if (!screenHasGooglePrompt(afterTapRaw)) {
      throw new Error("Google sign-in did not appear to start after tapping.");
    }

    console.log("PASS: Google sign-in flow opened successfully.");
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
