import { StyleSheet } from "react-native";
import { withUniwind } from "uniwind";
import type { LucideIcon } from "lucide-react-native";

function IconBase({
  icon: Icon,
  style,
  color,
  strokeWidth,
}: {
  icon: LucideIcon;
  style?: any;
  color?: string;
  strokeWidth?: number;
  className?: string;
}) {
  const flat = StyleSheet.flatten(style) || {};
  const size = (flat.width as number) ?? (flat.height as number) ?? 24;
  const resolvedColor = color ?? (flat.color as string) ?? "currentColor";
  return <Icon size={size} color={resolvedColor} strokeWidth={strokeWidth} />;
}

export const Icon = withUniwind(IconBase);
