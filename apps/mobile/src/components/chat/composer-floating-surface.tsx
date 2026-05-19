import { AppleGlassView } from "@/components/tw";
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

const AnimatedView = Animated.createAnimatedComponent(View);

/**
 * Pill-shaped surface matching the composer text field — liquid glass when available,
 * otherwise a solid card (white in light mode, elevated dark in dark mode).
 */
export function ComposerFloatingPillSurface({
  children,
  className,
  animate = true,
  ...rest
}: ViewProps & {
  children: ReactNode;
  className?: string;
  /** Fade in/out when mounted (e.g. @ mention popup). */
  animate?: boolean;
}) {
  const inner = (
    <SurfaceShell className={className}>{children}</SurfaceShell>
  );

  if (!animate) {
    return <View {...rest}>{inner}</View>;
  }

  return (
    <AnimatedView
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(140)}
      {...rest}
    >
      {inner}
    </AnimatedView>
  );
}

function SurfaceShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  if (isLiquidGlassAvailable()) {
    return (
      <AppleGlassView
        glassEffectStyle="regular"
        style={COMPOSER_FLOATING_PILL_STYLE}
        className={cn("overflow-hidden", className)}
      >
        {children}
      </AppleGlassView>
    );
  }

  return (
    <View
      style={COMPOSER_FLOATING_PILL_STYLE}
      className={cn("bg-card", COMPOSER_FLOATING_SOLID_CLASS, className)}
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
