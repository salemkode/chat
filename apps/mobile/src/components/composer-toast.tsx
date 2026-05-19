import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TOAST_DURATION_MS = 2500;

type ComposerToastContextValue = {
  showComposerToast: (message: string) => void;
};

const ComposerToastContext = createContext<ComposerToastContextValue | null>(
  null,
);

export function ComposerToastProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState<string | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const showComposerToast = useCallback(
    (nextMessage: string) => {
      const trimmed = nextMessage.trim();
      if (!trimmed) {
        return;
      }

      clearHideTimeout();
      setMessage(trimmed);
      hideTimeoutRef.current = setTimeout(() => {
        setMessage(null);
        hideTimeoutRef.current = null;
      }, TOAST_DURATION_MS);
    },
    [clearHideTimeout],
  );

  useEffect(() => {
    return () => {
      clearHideTimeout();
    };
  }, [clearHideTimeout]);

  const value = useMemo(
    () => ({
      showComposerToast,
    }),
    [showComposerToast],
  );

  return (
    <ComposerToastContext value={value}>
      {children}
      {message ? (
        <View
          pointerEvents="none"
          style={[styles.host, { paddingBottom: Math.max(insets.bottom, 16) }]}
        >
          <Animated.View
            entering={FadeInDown.duration(200)}
            exiting={FadeOutDown.duration(180)}
            className="mx-5 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm"
            style={{ borderCurve: "continuous" }}
          >
            <Text className="text-center text-sm leading-5 text-foreground">
              {message}
            </Text>
          </Animated.View>
        </View>
      ) : null}
    </ComposerToastContext>
  );
}

export function useComposerToast() {
  const context = use(ComposerToastContext);
  if (!context) {
    throw new Error(
      "useComposerToast must be used within <ComposerToastProvider>",
    );
  }
  return context;
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    zIndex: 1000,
  },
});
