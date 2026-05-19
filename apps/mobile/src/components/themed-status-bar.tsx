import { StatusBar } from "expo-status-bar";
import type { StatusBarStyle } from "expo-status-bar";
import { useUniwind } from "uniwind";

function statusBarStyleForTheme(theme: string): StatusBarStyle {
  return theme === "dark" ? "light" : "dark";
}

/** Status bar icon color that tracks the active Uniwind theme (light/dark/system). */
export function ThemedStatusBar() {
  const { theme } = useUniwind();
  return <StatusBar style={statusBarStyleForTheme(theme)} />;
}
