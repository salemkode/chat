/* eslint-disable react-hooks/immutability -- Reanimated shared values are intentionally mutable in layout and scroll callbacks. */
import { SymbolImage } from "@/components/symbol-image";
import {
  AnimatedLegendList,
} from "@legendapp/list/reanimated";
import { type LegendListRef } from "@legendapp/list/react-native";
import {
  createContext,
  use,
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  LayoutChangeEvent,
  Platform,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type AnimatedStyle as ReanimatedStyle,
} from "react-native-reanimated";

import { isLiquidGlassAvailable } from "expo-glass-effect";
import { useStableSafeAreaInsets } from "@/utils/use-stable-safe-area-insets";
import { TouchableGlass } from "../touchable-glass";
import { KeyboardGestureArea } from "../tw";
import { useChatContext } from "./chat-context";
import type { ChatMessage } from "./types";

const IS_GLASS = isLiquidGlassAvailable();
const IS_IOS = Platform.OS === "ios";
const IOS_NATIVE_HEADER_HEIGHT = 44;
const IOS_TRANSPARENT_HEADER_GAP = 24;
const IOS_TRANSPARENT_HEADER_MIN_TOP_PADDING = 112;

type AnimatedStyle = ReanimatedStyle<StyleProp<ViewStyle>>;

type ConversationContextValue = {
  scrollToBottom: () => void;
  /** Animated style applied to the prompt input container. */
  promptInputStyle: AnimatedStyle;
  /** Prompt input reports its measured height through this callback. */
  onPromptInputLayout: (e: LayoutChangeEvent) => void;
  /** Animated style for the scroll-to-bottom button. */
  scrollButtonStyle: AnimatedStyle;
};

const ConversationCtx = createContext<ConversationContextValue | null>(null);

export function useConversationContext() {
  const ctx = use(ConversationCtx);
  if (!ctx)
    throw new Error(
      "useConversationContext must be used within <Conversation>",
    );
  return ctx;
}

export function Conversation({
  renderMessage,
  emptyState,
  children,
  hasOlderMessages = false,
  isLoadingOlder = false,
  onLoadOlder,
}: {
  /** Render callback for each message – passed to the underlying list. */
  renderMessage: (info: { item: ChatMessage }) => ReactElement;
  /** Element shown when the message list is empty. */
  emptyState?: ReactElement;
  /** Compound children: <ConversationScrollButton />, <PromptInput />, etc. */
  children?: ReactNode;
  hasOlderMessages?: boolean;
  isLoadingOlder?: boolean;
  onLoadOlder?: (numItems: number) => void;
}) {
  const { messages } = useChatContext();
  const listRef = useRef<LegendListRef>(null);
  const insets = useStableSafeAreaInsets();

  // -- Layout bookkeeping --------------------------------------------------

  const [composerOffsetHeight, setComposerOffsetHeight] = useState(68);
  const composerHeight = useSharedValue(68);
  const scrollViewHeight = useSharedValue(0);
  const totalContentHeight = useSharedValue(0);
  const currentFooterHeight = useSharedValue(0);
  const messagesOnlyHeight = useSharedValue(0);

  // -- Auto-scroll ---------------------------------------------------------

  const scrollY = useSharedValue(0);
  const lastContentHeight = useSharedValue(0);
  const SCROLL_THRESHOLD = 50;

  const isAtBottom = useCallback(() => {
    const maxScrollY = totalContentHeight.value - scrollViewHeight.value;
    if (maxScrollY <= 0) return true;
    return maxScrollY - scrollY.value <= SCROLL_THRESHOLD;
  }, [scrollViewHeight, scrollY, totalContentHeight]);

  // -- Callbacks -----------------------------------------------------------

  const onScrollViewLayout = useCallback(
    (e: LayoutChangeEvent) => {
      scrollViewHeight.value = e.nativeEvent.layout.height;
    },
    [scrollViewHeight],
  );

  const onScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number } } }) => {
      scrollY.value = event.nativeEvent.contentOffset.y;
    },
    [scrollY],
  );

  const onContentSizeChange = useCallback(
    (_width: number, height: number) => {
      const wasAtBottom = isAtBottom();
      const heightIncreased = height > lastContentHeight.value;

      totalContentHeight.value = height;
      lastContentHeight.value = height;
      // Derive message-only height by subtracting the last known footer height.
      // This is stable: when the footer resizes, totalContent changes but
      // messagesOnly stays the same, breaking the feedback loop.
      messagesOnlyHeight.value = height - currentFooterHeight.value;

      if (wasAtBottom && heightIncreased && listRef.current) {
        requestAnimationFrame(() => {
          listRef.current?.scrollToEnd({
            animated: true,
          });
        });
      }
    },
    [
      currentFooterHeight,
      isAtBottom,
      lastContentHeight,
      messagesOnlyHeight,
      totalContentHeight,
    ],
  );

  const scrollToBottom = useCallback(() => {
    listRef.current?.scrollToEnd({
      animated: true,
    });
  }, []);

  // -- Animated styles -----------------------------------------------------
  const topPadding =
    IS_IOS
      ? Math.max(
          IS_GLASS ? IOS_TRANSPARENT_HEADER_MIN_TOP_PADDING : 16,
          insets.top + IOS_NATIVE_HEADER_HEIGHT + IOS_TRANSPARENT_HEADER_GAP,
        )
      : IS_GLASS
        ? 128
        : 16;

  const footerSpacerStyle = useAnimatedStyle(() => {
    const scrollHeight = scrollViewHeight.value;
    if (scrollHeight <= 0) return { height: 0 };

    const blankSpace = scrollHeight - messagesOnlyHeight.value;
    const footerHeight = Math.max(0, blankSpace - topPadding);

    currentFooterHeight.value = footerHeight;
    return { height: footerHeight };
  });

  const promptInputStyle = useAnimatedStyle(() => ({}));

  const scrollButtonStyle = useAnimatedStyle(() => {
    const maxScrollY = totalContentHeight.value - scrollViewHeight.value;
    const shouldShowScrollButton =
      maxScrollY > 50 && maxScrollY - scrollY.value > SCROLL_THRESHOLD;

    return {
      opacity: withTiming(shouldShowScrollButton ? 1 : 0, {
        duration: 200,
      }),
      transform: [
        {
          scale: withTiming(shouldShowScrollButton ? 1 : 0.8, {
            duration: 200,
          }),
        },
      ],
      bottom: composerHeight.value + 12,
    };
  });

  const onPromptInputLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const h = e.nativeEvent.layout.height;
      composerHeight.value = h;
      setComposerOffsetHeight(h);
    },
    [composerHeight],
  );

  // -- Context value -------------------------------------------------------

  const contextValue: ConversationContextValue = {
    scrollToBottom,
    promptInputStyle,
    onPromptInputLayout,
    scrollButtonStyle,
  };

  const latestMessage = messages[messages.length - 1];
  const dataVersion = useMemo(
    () =>
      `${messages.length}:${latestMessage?.id ?? ""}:${latestMessage?.content ?? ""}`,
    [latestMessage?.content, latestMessage?.id, messages.length],
  );

  // -- Render --------------------------------------------------------------

  return (
    <ConversationCtx value={contextValue}>
      <KeyboardAvoidingView
        behavior="padding"
        automaticOffset
        style={{ flex: 1 }}
      >
        <View className="flex-1 bg-background">
          {IS_IOS ? (
            <KeyboardGestureArea
              interpolator="ios"
              showOnSwipeUp
              offset={composerOffsetHeight}
              className="flex-1"
            >
              <AnimatedLegendList
                ref={listRef}
                className="flex-1"
                data={messages}
                dataVersion={dataVersion}
                renderItem={renderMessage}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{
                  padding: 16,
                  paddingBottom: 8,
                }}
                keyboardDismissMode="interactive"
                automaticallyAdjustsScrollIndicatorInsets={false}
                maintainVisibleContentPosition={{ data: true, size: true }}
                estimatedItemSize={80}
                getEstimatedItemSize={(message) =>
                  message.role === "assistant" ? 220 : 108
                }
                drawDistance={600}
                onStartReached={
                  onLoadOlder && hasOlderMessages && !isLoadingOlder
                    ? () => onLoadOlder(30)
                    : undefined
                }
                onStartReachedThreshold={0.15}
                onLayout={onScrollViewLayout}
                onScroll={onScroll}
                scrollEventThrottle={16}
                onContentSizeChange={onContentSizeChange}
                contentInset={{ top: topPadding, left: 0, right: 0, bottom: 0 }}
                scrollIndicatorInsets={{ top: 0, left: 0, right: 0, bottom: 0 }}
                ListEmptyComponent={emptyState}
                ListHeaderComponent={
                  hasOlderMessages ? (
                    <View className="items-center pb-3">
                      <View className="rounded-full border border-border/70 bg-background/90 px-3 py-1">
                        <Text className="text-xs text-muted-foreground">
                          {isLoadingOlder
                            ? "Loading older messages..."
                            : "Scroll up to load older messages"}
                        </Text>
                      </View>
                    </View>
                  ) : null
                }
                ListFooterComponent={<Animated.View style={footerSpacerStyle} />}
              />
            </KeyboardGestureArea>
          ) : (
            <View className="flex-1">
              <AnimatedLegendList
                ref={listRef}
                className="flex-1"
                data={messages}
                dataVersion={dataVersion}
                renderItem={renderMessage}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{
                  padding: 16,
                  paddingBottom: 8,
                }}
                keyboardDismissMode="interactive"
                automaticallyAdjustsScrollIndicatorInsets={false}
                maintainVisibleContentPosition={{ data: true, size: true }}
                estimatedItemSize={80}
                getEstimatedItemSize={(message) =>
                  message.role === "assistant" ? 220 : 108
                }
                drawDistance={600}
                onStartReached={
                  onLoadOlder && hasOlderMessages && !isLoadingOlder
                    ? () => onLoadOlder(30)
                    : undefined
                }
                onStartReachedThreshold={0.15}
                onLayout={onScrollViewLayout}
                onScroll={onScroll}
                scrollEventThrottle={16}
                onContentSizeChange={onContentSizeChange}
                contentInset={{ top: topPadding, left: 0, right: 0, bottom: 0 }}
                scrollIndicatorInsets={{ top: 0, left: 0, right: 0, bottom: 0 }}
                ListEmptyComponent={emptyState}
                ListHeaderComponent={
                  hasOlderMessages ? (
                    <View className="items-center pb-3">
                      <View className="rounded-full border border-border/70 bg-background/90 px-3 py-1">
                        <Text className="text-xs text-muted-foreground">
                          {isLoadingOlder
                            ? "Loading older messages..."
                            : "Scroll up to load older messages"}
                        </Text>
                      </View>
                    </View>
                  ) : null
                }
                ListFooterComponent={<Animated.View style={footerSpacerStyle} />}
              />
            </View>
          )}

          {children}
        </View>
      </KeyboardAvoidingView>
    </ConversationCtx>
  );
}


export function ConversationScrollButton() {
  const { scrollToBottom, scrollButtonStyle } = useConversationContext();

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[{ position: "absolute", right: 16 }, scrollButtonStyle]}
    >
      <TouchableGlass
        onPress={scrollToBottom}
        hitSlop={8}
        className="w-10 h-10 rounded-full justify-center items-center"
      >
        <SymbolImage
          name="chevron.down"
          sfEffect={{effect: "wiggle", repeat: -1, }}
          className="text-muted-foreground dark:text-muted-foreground text-xs mt-1"
        />
      </TouchableGlass>
    </Animated.View>
  );
}

export function ConversationEmptyState({
  title = "Ready",
  description,
  icon = "bubble.left.and.bubble.right",
}: {
  title?: string;
  description?: string;
  icon?: string;
}) {
  return (
    <View className="flex-1 justify-center items-center gap-2">
      <SymbolImage
        name={icon}
        size={48}
        className="text-muted-foreground dark:text-muted-foreground"
      />
      <Text className="text-xl font-semibold text-foreground dark:text-foreground">
        {title}
      </Text>
      {description && (
        <Text className="text-sm text-muted-foreground dark:text-muted-foreground">
          {description}
        </Text>
      )}
    </View>
  );
}
