import { AppleGlassView } from "@/components/tw";
import { useGlassTintColor } from "@/hooks/use-glass-tint-color";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import type { ReactNode } from "react";
import { View, type ViewProps } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { cn } from "@/utils/tailwind";

import {
  COMPOSER_FLOATING_INSET_CLASS,
  COMPOSER_FLOATING_PILL_RADIUS,
  COMPOSER_FLOATING_PILL_STYLE,
  COMPOSER_FLOATING_SOLID_CLASS,
} from "./composer-layout";

const COMPACT_PILL_RADIUS = 16;

const AnimatedView = Animated.createAnimatedComponent(View);

/**
 * Pill-shaped surface matching the composer text field — liquid glass when available,
 * otherwise a solid card (white in light mode, elevated dark in dark mode).
 */
export function ComposerFloatingPillSurface({
  children,
  className,
  animate = true,
  tone = "default",
  compact = false,
  ...rest
}: ViewProps & {
  children: ReactNode;
  className?: string;
  animate?: boolean;
  /** Brighter fill in light mode (e.g. @ mention menu). */
  tone?: "default" | "white";
  compact?: boolean;
}) {
  const inner = (
    <SurfaceShell tone={tone} compact={compact} className={className}>
      {children}
    </SurfaceShell>
  );

  if (!animate) {
    return <View {...rest}>{inner}</View>;
  }

  return (
    <AnimatedView
      entering={FadeIn.duration(160)}
      exiting={FadeOut.duration(120)}
      {...rest}
    >
      {inner}
    </AnimatedView>
  );
}

function SurfaceShell({
  children,
  className,
  tone,
  compact,
}: {
  children: ReactNode;
  className?: string;
  tone: "default" | "white";
  compact: boolean;
}) {
  const glassTint = useGlassTintColor();
  const radius = compact ? COMPACT_PILL_RADIUS : COMPOSER_FLOATING_PILL_RADIUS;
  const shellStyle = {
    borderRadius: radius,
    borderCurve: "continuous" as const,
    overflow: "hidden" as const,
  };

  const fillClass =
    tone === "white" ? "bg-white dark:bg-card" : "bg-card";

  if (isLiquidGlassAvailable()) {
    return (
      <AppleGlassView
        glassEffectStyle="regular"
        tintColor={glassTint}
        style={shellStyle}
        className={cn("overflow-hidden", className)}
      >
        <View className={fillClass}>{children}</View>
      </AppleGlassView>
    );
  }

  return (
    <View
      style={shellStyle}
      className={cn(
        fillClass,
        tone === "white"
          ? "border border-black/6 shadow-composer dark:border-border/50"
          : COMPOSER_FLOATING_SOLID_CLASS,
        className,
      )}
    >
      {children}
    </View>
  );
}

/**
 * Elevated inset block inside the composer glass row (draft card, dense controls).
 */
export function ComposerFloatingInsetSurface({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <View
      className={cn(
        COMPOSER_FLOATING_INSET_CLASS,
        COMPOSER_FLOATING_SOLID_CLASS,
        className,
      )}
      style={{
        borderRadius: COMPOSER_FLOATING_PILL_RADIUS - 4,
        borderCurve: "continuous",
      }}
    >
      {children}
    </View>
  );
}
