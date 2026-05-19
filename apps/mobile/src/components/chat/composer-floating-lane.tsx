import type { ReactNode } from "react";
import { View, type ViewProps } from "react-native";

import { cn } from "@/utils/tailwind";

import { COMPOSER_FLOATING_LEFT_INSET_PX } from "./composer-layout";

/**
 * Fixed-width gutter aligning floating composer UI with the text field (after +).
 * For horizontal `ScrollView` rows (image thumbs), use
 * `COMPOSER_FLOATING_SCROLL_CONTENT_INSET` on `contentContainerStyle` instead.
 */
export function ComposerFloatingLeftGutter() {
  return <View style={{ width: COMPOSER_FLOATING_LEFT_INSET_PX }} />;
}

/**
 * [gutter | content] row for chips, mention menu, and other floating composer chrome.
 */
export function ComposerFloatingLane({
  children,
  className,
  contentClassName,
  ...rest
}: ViewProps & {
  children: ReactNode;
  /** Classes on the content column (right of the gutter). */
  contentClassName?: string;
}) {
  return (
    <View className={cn("flex-row", className)} {...rest}>
      <ComposerFloatingLeftGutter />
      <View className={cn("min-w-0 flex-1", contentClassName)}>{children}</View>
    </View>
  );
}
