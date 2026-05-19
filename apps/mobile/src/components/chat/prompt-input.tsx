import { SymbolImage } from "@/components/symbol-image";
import { TouchableGlass } from "@/components/touchable-glass";
import { AttachmentChipList } from "./attachment-chip-list";
import {
  AnimatedThemedGlassContainer,
  ThemedGlassView,
} from "@/components/themed-glass";
import { useEffect, useRef, type ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { cn } from "@/utils/tailwind";
import { useChatContext } from "./chat-context";
import { useComposerProject } from "./composer-project-context";
import { useConversationContext } from "./conversation";
import { ChatInlineError } from "./chat-inline-error";
import { PendingProjectDraftCard } from "./pending-project-draft-card";
import { ProjectMentionPopup } from "./project-mention-popup";
import {
  COMPOSER_ACTION_SIZE,
  COMPOSER_GLASS_PADDING,
  COMPOSER_ROW_GAP,
} from "./composer-layout";

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
      {error ? (
        <Animated.View entering={FadeIn.duration(200)} className="px-3 pb-2">
          <ChatInlineError variant="composer" message={error.message} />
        </Animated.View>
      ) : null}
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
        <AnimatedThemedGlassContainer
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
              gap: COMPOSER_ROW_GAP,
            }}
          >
            {children}
          </View>
        </AnimatedThemedGlassContainer>
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
        width: COMPOSER_ACTION_SIZE,
        height: COMPOSER_ACTION_SIZE,
        borderRadius: COMPOSER_ACTION_SIZE / 2,
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
  return (
    <ThemedGlassView
      isInteractive
      style={{
        flex: 1,
        flexDirection: "row",
        borderRadius: 22,
        borderCurve: "continuous",
      }}
    >
      {children}
    </ThemedGlassView>
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
  const { canSend, isGenerating, canStop, canForceStop, onSend, onStop } = useChatContext();
  const showStop = isGenerating && canStop;
  const sendDisabled = !canSend || (isGenerating && !showStop);

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
      className={sendDisabled && !showStop ? "bg-secondary" : "bg-foreground"}
      onPress={showStop ? onStop : onSend}
      disabled={sendDisabled && !showStop}
      accessibilityLabel={showStop ? (canForceStop ? "Force stop" : "Stop generation") : "Send message"}
    >
      {isGenerating && !showStop ? (
        <Animated.View entering={FadeIn} exiting={FadeOut}>
          <ActivityIndicator size="small" colorClassName="tint-foreground" className="text-foreground" />
        </Animated.View>
      ) : showStop ? (
        <Animated.View entering={FadeIn} exiting={FadeOut}>
          <SymbolImage
            name="stop.fill"
            size={14}
            className="font-semibold text-background"
          />
        </Animated.View>
      ) : (
          <SymbolImage
            name="arrow.up"
            size={16}
            sfEffect="scale/up"
            className={cn(
              "font-semibold",
              sendDisabled
                ? "text-muted-foreground"
                : "text-background dark:text-background",
            )}
          />
        )}
    </Pressable>
  );
}
