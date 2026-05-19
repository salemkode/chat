import { SymbolImage } from "@/components/symbol-image";
import { TouchableGlass } from "@/components/touchable-glass";
import { AttachmentChipList } from "./attachment-chip-list";
import {
  GlassContainer,
  GlassView,
  isLiquidGlassAvailable,
} from "expo-glass-effect";
import { useEffect, useRef, type ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { cn } from "@/utils/tailwind";
import { BlurView } from "expo-blur";
import { useChatContext } from "./chat-context";
import { useComposerProject } from "./composer-project-context";
import { useConversationContext } from "./conversation";
import { PendingProjectDraftCard } from "./pending-project-draft-card";
import { ProjectMentionPopup } from "./project-mention-popup";
import { COMPOSER_GLASS_PADDING } from "./composer-layout";

const AnimatedGlassContainer = Animated.createAnimatedComponent(GlassContainer);

/**
 * Root container for the message composer. Positions itself at the bottom of
 * the `<Conversation />` using the shared conversation context. Children are
 * laid out in a horizontal row inside a glass container.
 */
export function PromptInput({ children }: { children: ReactNode }) {
  const { promptInputStyle, onPromptInputLayout } = useConversationContext();
  const { error } = useChatContext();
  const {
    projectMention,
    mentionOptions,
    highlightedMentionIndex,
    handleMentionSelect,
    dismissProjectMention,
    pendingProjectDraft,
    pendingProjectName,
    setPendingProjectName,
    pendingProjectDescription,
    setPendingProjectDescription,
    handleConfirmCreateProject,
    handleCancelCreateProject,
    creatingProject,
  } = useComposerProject();

  return (
    <Animated.View
      onLayout={onPromptInputLayout}
      style={[{ position: "absolute", left: 0, right: 0 }, promptInputStyle]}
    >
      {error && <PromptInputError message={error.message} />}
      <View className="relative px-3">
        <AttachmentChipList />
        {projectMention ? (
          <ProjectMentionPopup
            mentionOptions={mentionOptions}
            highlightedIndex={highlightedMentionIndex}
            onSelect={handleMentionSelect}
            onDismiss={dismissProjectMention}
          />
        ) : null}
        <AnimatedGlassContainer
          style={{
            flex: 1,
            padding: COMPOSER_GLASS_PADDING,
            gap: 10,
          }}
          spacing={8}
        >
          {pendingProjectDraft ? (
            <PendingProjectDraftCard
              draft={pendingProjectDraft}
              name={pendingProjectName}
              description={pendingProjectDescription}
              creatingProject={creatingProject}
              onNameChange={setPendingProjectName}
              onDescriptionChange={setPendingProjectDescription}
              onConfirm={() => {
                void handleConfirmCreateProject();
              }}
              onCancel={handleCancelCreateProject}
            />
          ) : null}
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-end",
              gap: 10,
            }}
          >
            {children}
          </View>
        </AnimatedGlassContainer>
      </View>
    </Animated.View>
  );
}

function PromptInputError({ message }: { message?: string }) {
  return (
    <Animated.View entering={FadeIn.duration(200)} className="px-3 pb-2">
      <View
        className="flex-row items-center gap-2 rounded-xl bg-card px-3 py-2.5"
        style={{ borderCurve: "continuous" }}
      >
        <View
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: "#EF4444" }}
        />
        <Text
          className="flex-1 text-xs text-muted-foreground"
          numberOfLines={2}
        >
          {message || "Something went wrong"}
        </Text>
      </View>
    </Animated.View>
  );
}

/**
 * A circular glass button for actions (e.g. attachments, camera).
 */
export function PromptInputAction(props: {
  children: ReactNode;
  onPress?: () => void;
}) {
  return (
    <TouchableGlass
      hitSlop={4}
      {...props}
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: "center",
        alignItems: "center",
      }}
    />
  );
}

/**
 * Glass-wrapped container for the textarea and submit button.
 */
export function PromptInputBody({ children }: { children: ReactNode }) {
  if (isLiquidGlassAvailable()) {
    return (
      <GlassView
        isInteractive
        glassEffectStyle="regular"
        style={{
          flex: 1,
          flexDirection: "row",

          borderRadius: 22,
          borderCurve: "continuous",
        }}
      >
        {children}
      </GlassView>
    );
  }

  return (
    <BlurView
      tint="systemChromeMaterial"
      style={{
        flex: 1,
        flexDirection: "row",

        overflow: "hidden",
        borderRadius: 22,
        borderCurve: "continuous",
      }}
    >
      {children}
    </BlurView>
  );
}

/**
 * Auto-growing text input for composing messages. Reads/writes the current
 * input value from `ChatContext`.
 */
export function PromptInputTextarea({
  placeholder = "Chat with Agent...",
  maxLength = 1000,
}: {
  placeholder?: string;
  maxLength?: number;
}) {
  const { input, setInput } = useChatContext();
  const {
    projectMention,
    mentionOptions,
    setHighlightedMentionIndex,
    syncProjectMention,
    dismissProjectMention,
  } = useComposerProject();
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (input === "") {
      inputRef.current?.clear();
    }
  }, [input]);

  return (
    <TextInput
      ref={inputRef}
      nativeID="composer"
      cursorColorClassName="tint-foreground"
      selectionColorClassName="tint-foreground"
      style={{ fontSize: 16 }}
      className="flex-1 pl-4 pr-2 py-3 text-foreground dark:text-foreground max-h-25"
      value={input}
      onChangeText={(text) => {
        setInput(text);
        syncProjectMention(text, text.length);
      }}
      onSelectionChange={(event) => {
        syncProjectMention(input, event.nativeEvent.selection.start);
      }}
      onKeyPress={(event) => {
        if (!projectMention) {
          return;
        }

        const key = event.nativeEvent.key;
        if (key === "Escape") {
          dismissProjectMention();
          return;
        }

        if (mentionOptions.length === 0) {
          return;
        }

        if (key === "ArrowDown") {
          setHighlightedMentionIndex((current) =>
            current + 1 >= mentionOptions.length ? 0 : current + 1,
          );
          return;
        }

        if (key === "ArrowUp") {
          setHighlightedMentionIndex((current) =>
            current - 1 < 0 ? mentionOptions.length - 1 : current - 1,
          );
        }
      }}
      placeholder={placeholder}
      multiline
      maxLength={maxLength}
      blurOnSubmit={false}
    />
  );
}

/**
 * Submit button that sends the current input. Shows a spinner while the model
 * is generating. Reads state from `ChatContext`.
 */
export function PromptInputSubmit() {
  const { canSend, isGenerating, onSend } = useChatContext();
  const disabled = !canSend || isGenerating;

  return (
    <Pressable
      style={({ pressed }) => ({
        width: 34,
        height: 34,
        borderRadius: 17,
        borderCurve: "continuous",
        justifyContent: "center",
        alignItems: "center",
        opacity: pressed ? 0.7 : 1,
        margin: 5,
      })}
      className={disabled ? "bg-secondary" : "bg-foreground"}
      onPress={onSend}
      disabled={disabled}
    >
      {isGenerating ? (
        <Animated.View entering={FadeIn} exiting={FadeOut}>
          <ActivityIndicator size="small" colorClassName="tint-foreground" className="text-foreground" />
        </Animated.View>
      ) : (
          <SymbolImage
            name="arrow.up"
            size={16}
            sfEffect="scale/up"
            className={cn(
              "font-semibold",
              disabled
                ? "text-muted-foreground"
                : "text-background dark:text-background",
            )}
          />
        )}
    </Pressable>
  );
}
