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
import { View } from "react-native";
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

  return (
    <BlurView tint={blurTint} style={[{ overflow: "hidden" }, style]}>
      <View className="bg-card/95">{children}</View>
    </BlurView>
  );
}

/** Glass container grouping composer controls (child views carry the tint). */
export function ThemedGlassContainer(props: GlassContainerProps) {
  return <XGlassContainer {...props} />;
}

export const AnimatedThemedGlassContainer =
  Animated.createAnimatedComponent(ThemedGlassContainer);
