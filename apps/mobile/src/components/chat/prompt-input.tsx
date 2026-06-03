import { SymbolImage } from "@/components/symbol-image";
import { TouchableGlass } from "@/components/touchable-glass";
import { AttachmentChipList } from "./attachment-chip-list";
import {
  AnimatedThemedGlassContainer,
  ThemedGlassView,
} from "@/components/themed-glass";
import { SafeAreaView } from "@/components/tw";
import { useEffect, useRef, type ReactNode } from "react";
import { ActivityIndicator, Platform, Pressable, TextInput, View } from "react-native";
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

const IS_ANDROID = Platform.OS === "android";

/**
 * Root container for the message composer. It renders as the bottom footer in
 * `<Conversation />` so the message list cannot scroll underneath it.
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
    <SafeAreaView edges={["bottom"]} mode="padding">
      <Animated.View onLayout={onPromptInputLayout} style={promptInputStyle}>
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
    </SafeAreaView>
  );
}

/**
 * A circular glass button for actions (e.g. attachments, camera).
 */
export function PromptInputAction(props: {
  children: ReactNode;
  onPress?: () => void;
}) {
  if (IS_ANDROID) {
    return (
      <Pressable
        hitSlop={4}
        onPress={props.onPress}
        style={({ pressed }) => ({
          width: COMPOSER_ACTION_SIZE,
          height: COMPOSER_ACTION_SIZE,
          borderRadius: COMPOSER_ACTION_SIZE / 2,
          justifyContent: "center",
          alignItems: "center",
          opacity: pressed ? 0.82 : 1,
        })}
        className="border border-border/70 bg-card shadow-card"
      >
        {props.children}
      </Pressable>
    );
  }

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
  if (IS_ANDROID) {
    return (
      <View
        className="flex-1 flex-row rounded-[22px] border border-border/70 bg-card shadow-card"
        style={{
          borderRadius: 22,
          borderCurve: "continuous",
        }}
      >
        {children}
      </View>
    );
  }

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
      cursorColorClassName="accent-foreground"
      selectionColorClassName="accent-foreground"
      underlineColorAndroid="transparent"
      style={{ fontSize: 16 }}
      className="flex-1 bg-transparent pl-4 pr-2 py-3 text-foreground dark:text-foreground max-h-25"
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
      placeholderTextColor={IS_ANDROID ? "rgba(120,120,128,0.88)" : undefined}
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
      className={
        sendDisabled && !showStop
          ? "border border-border/60 bg-secondary"
          : "bg-foreground"
      }
      onPress={showStop ? onStop : onSend}
      disabled={sendDisabled && !showStop}
      accessibilityLabel={showStop ? (canForceStop ? "Force stop" : "Stop generation") : "Send message"}
    >
      {isGenerating && !showStop ? (
        <Animated.View entering={FadeIn} exiting={FadeOut}>
          <ActivityIndicator
            size="small"
            colorClassName="accent-background"
            className="text-background"
          />
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
