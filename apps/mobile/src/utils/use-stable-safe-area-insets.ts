import { Platform } from "react-native";
import {
  initialWindowMetrics,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

const IOS_FALLBACK_TOP_INSET = 59;
const IOS_FALLBACK_BOTTOM_INSET = 34;

function stableInset(
  current: number,
  initial: number | undefined,
  fallback: number,
) {
  if (current > 0 || Platform.OS !== "ios") {
    return current;
  }
  return initial ?? fallback;
}

export function useStableSafeAreaInsets() {
  const insets = useSafeAreaInsets();
  const initialInsets = initialWindowMetrics?.insets;

  return {
    top: stableInset(insets.top, initialInsets?.top, IOS_FALLBACK_TOP_INSET),
    right: stableInset(insets.right, initialInsets?.right, 0),
    bottom: stableInset(
      insets.bottom,
      initialInsets?.bottom,
      IOS_FALLBACK_BOTTOM_INSET,
    ),
    left: stableInset(insets.left, initialInsets?.left, 0),
  };
}
