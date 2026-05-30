import {
  useGlassBlurFallbackTint,
  useGlassTintColor,
} from "@/hooks/use-glass-tint-color";
import { BlurView } from "expo-blur";
import {
  GlassContainer as XGlassContainer,
  GlassView as XGlassView,
  isLiquidGlassAvailable,
} from "expo-glass-effect";
import type { ComponentProps } from "react";
import { Platform, View } from "react-native";
import Animated from "react-native-reanimated";

type GlassViewProps = ComponentProps<typeof XGlassView>;
type GlassContainerProps = ComponentProps<typeof XGlassContainer>;

/** `expo-glass-effect` view with theme-aware `tintColor`. */
export function ThemedGlassView({
  tintColor,
  glassEffectStyle = "regular",
  ...props
}: GlassViewProps) {
  const themeTint = useGlassTintColor();

  if (!isLiquidGlassAvailable()) {
    return <ThemedGlassViewFallback {...props} />;
  }

  return (
    <XGlassView
      glassEffectStyle={glassEffectStyle}
      tintColor={tintColor ?? themeTint}
      {...props}
    />
  );
}

function ThemedGlassViewFallback({
  children,
  style,
}: Pick<GlassViewProps, "children" | "style">) {
  const blurTint = useGlassBlurFallbackTint();

  if (Platform.OS === "android") {
    return (
      <View
        style={style}
        className="overflow-hidden rounded-[22px] border border-border/70 bg-card shadow-composer"
      >
        {children}
      </View>
    );
  }

  return (
    <BlurView tint={blurTint} style={[{ overflow: "hidden" }, style]}>
      <View className="bg-card/95">{children}</View>
    </BlurView>
  );
}

/** Glass container grouping composer controls (child views carry the tint). */
export function ThemedGlassContainer({
  children,
  style,
  spacing: _spacing,
}: Pick<GlassContainerProps, "children" | "style" | "spacing">) {
  if (!isLiquidGlassAvailable() && Platform.OS === "android") {
    return (
      <View
        style={style}
        className="overflow-hidden rounded-[28px] bg-background shadow-composer"
      >
        {children}
      </View>
    );
  }

  return <XGlassContainer style={style}>{children}</XGlassContainer>;
}

export const AnimatedThemedGlassContainer =
  Animated.createAnimatedComponent(ThemedGlassContainer);
