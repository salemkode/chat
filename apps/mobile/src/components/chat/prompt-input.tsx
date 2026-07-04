import {
  AUTO_GROW_DEFAULT_MAX_HEIGHT,
  AUTO_GROW_DEFAULT_MIN_HEIGHT,
  AutoGrowingTextInput,
  type AutoGrowingTextInputHandle,
} from '@/components/auto-growing-text-input'
import { SymbolImage } from '@/components/symbol-image'
import { TouchableGlass } from '@/components/touchable-glass'
import { AttachmentChipList } from './attachment-chip-list'
import { useEffect, useRef, type ReactNode } from 'react'
import { ActivityIndicator, Platform, Pressable, View } from 'react-native'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'
import { useStableSafeAreaInsets } from '@/utils/use-stable-safe-area-insets'

import { useNativeThemeColors, type NativeThemeColors } from '@/hooks/use-native-theme-colors'
import { useChatContext } from './chat-context'
import { useComposerProject } from './composer-project-context'
import { useConversationContext } from './conversation'
import { ChatInlineError } from './chat-inline-error'
import { PendingProjectDraftCard } from './pending-project-draft-card'
import { ProjectMentionPopup } from './project-mention-popup'
import {
  COMPOSER_ACTION_SIZE,
  COMPOSER_GLASS_PADDING,
  COMPOSER_ROW_GAP,
  composerBottomSafeInset,
} from './composer-layout'

const IS_ANDROID = Platform.OS === 'android'

/** Android needs raw color strings; dark accent is too close to the card background. */
function composerTextSelectionColor(theme: string, colors: NativeThemeColors): string | undefined {
  if (theme === 'dark') {
    return colors.border ?? colors.accent
  }
  return colors.accent ?? colors.border
}

/**
 * Root container for the message composer. It renders as the bottom footer in
 * `<Conversation />` and participates in normal keyboard-avoiding layout.
 */
export function PromptInput({ children }: { children: ReactNode }) {
  const insets = useStableSafeAreaInsets()
  const { onPromptInputLayout } = useConversationContext()
  const { error } = useChatContext()
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
  } = useComposerProject()

  return (
    <Animated.View
      className="bg-background"
      style={{ paddingBottom: composerBottomSafeInset(insets.bottom) }}
    >
      <View onLayout={onPromptInputLayout}>
        {error ? (
          <Animated.View entering={FadeIn.duration(200)} className="px-3 pb-2">
            <ChatInlineError variant="composer" message={error.message} />
          </Animated.View>
        ) : null}
        <View className="pt-2">
          <AttachmentChipList />
          {projectMention ? (
            <ProjectMentionPopup
              mentionOptions={mentionOptions}
              highlightedIndex={highlightedMentionIndex}
              onSelect={handleMentionSelect}
              onDismiss={dismissProjectMention}
            />
          ) : null}
          <View
            style={{
              flex: 1,
              paddingHorizontal: COMPOSER_GLASS_PADDING,
              paddingVertical: 8,
              gap: 10,
            }}
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
                  void handleConfirmCreateProject()
                }}
                onCancel={handleCancelCreateProject}
              />
            ) : null}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-end',
                gap: COMPOSER_ROW_GAP,
              }}
            >
              {children}
            </View>
          </View>
        </View>
      </View>
    </Animated.View>
  )
}

/**
 * A circular glass button for actions (e.g. attachments, camera).
 */
export function PromptInputAction(props: { children: ReactNode; onPress?: () => void }) {
  if (IS_ANDROID) {
    return (
      <Pressable
        hitSlop={4}
        onPress={props.onPress}
        style={{
          width: COMPOSER_ACTION_SIZE,
          height: COMPOSER_ACTION_SIZE,
          borderRadius: 8,
          justifyContent: 'center',
          alignItems: 'center',
        }}
        className="bg-transparent active:bg-secondary"
      >
        {props.children}
      </Pressable>
    )
  }

  return (
    <TouchableGlass
      hitSlop={4}
      {...props}
      style={{
        width: COMPOSER_ACTION_SIZE,
        height: COMPOSER_ACTION_SIZE,
        borderRadius: COMPOSER_ACTION_SIZE / 2,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    />
  )
}

/**
 * Glass-wrapped container for the textarea and submit button.
 */
export function PromptInputBody({ children }: { children: ReactNode }) {
  return (
    <View
      className="flex-1 flex-row bg-background"
      style={{
        minHeight: 44,
        borderRadius: 0,
        borderCurve: 'continuous',
      }}
    >
      {children}
    </View>
  )
}

/**
 * Auto-growing text input for composing messages. Reads/writes the current
 * input value from `ChatContext`.
 */
export function PromptInputTextarea({
  placeholder = 'Chat with Agent...',
  maxLength = 1000,
}: {
  placeholder?: string
  maxLength?: number
}) {
  const { input, setInput } = useChatContext()
  const {
    projectMention,
    mentionOptions,
    setHighlightedMentionIndex,
    syncProjectMention,
    dismissProjectMention,
  } = useComposerProject()
  const inputRef = useRef<AutoGrowingTextInputHandle>(null)
  const themeColors = useNativeThemeColors()

  useEffect(() => {
    if (input === '') {
      inputRef.current?.clear()
    }
  }, [input])

  const textColorProps = IS_ANDROID
    ? {
        cursorColor: themeColors.foreground,
        selectionColor: composerTextSelectionColor(themeColors.theme, themeColors),
        placeholderTextColor: themeColors.mutedForeground,
      }
    : {
        cursorColorClassName: 'accent-foreground',
        selectionColorClassName: 'accent-accent dark:accent-border',
        selectionHandleColorClassName: 'accent-foreground',
        placeholderTextColorClassName: 'accent-muted-foreground',
      }

  return (
    <AutoGrowingTextInput
      ref={inputRef}
      nativeID="composer"
      testID="composer-input"
      accessibilityLabel="Message input"
      minHeight={AUTO_GROW_DEFAULT_MIN_HEIGHT}
      maxHeight={AUTO_GROW_DEFAULT_MAX_HEIGHT}
      {...textColorProps}
      underlineColorAndroid="transparent"
      style={{
        fontSize: 16,
        lineHeight: 22,
        textAlignVertical: 'top',
      }}
      className="flex-1 self-stretch bg-transparent pl-4 pr-2 py-3 text-foreground dark:text-foreground"
      value={input}
      onChangeText={(text) => {
        setInput(text)
        syncProjectMention(text, text.length)
      }}
      onSelectionChange={(event) => {
        syncProjectMention(input, event.nativeEvent.selection.start)
      }}
      onKeyPress={(event) => {
        if (!projectMention) {
          return
        }

        const key = event.nativeEvent.key
        if (key === 'Escape') {
          dismissProjectMention()
          return
        }

        if (mentionOptions.length === 0) {
          return
        }

        if (key === 'ArrowDown') {
          setHighlightedMentionIndex((current) =>
            current + 1 >= mentionOptions.length ? 0 : current + 1,
          )
          return
        }

        if (key === 'ArrowUp') {
          setHighlightedMentionIndex((current) =>
            current - 1 < 0 ? mentionOptions.length - 1 : current - 1,
          )
        }
      }}
      placeholder={placeholder}
      multiline
      maxLength={maxLength}
      blurOnSubmit={false}
    />
  )
}

/**
 * Submit button that sends the current input. Shows a spinner while the model
 * is generating. Reads state from `ChatContext`.
 */
export function PromptInputSubmit() {
  const { canSend, isGenerating, canStop, canForceStop, onSend, onStop } = useChatContext()
  const showStop = isGenerating && canStop
  const sendDisabled = !canSend || (isGenerating && !showStop)

  return (
    <Pressable
      testID="composer-send"
      style={{
        width: 34,
        height: 34,
        borderRadius: 17,
        borderCurve: 'continuous',
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'flex-end',
        margin: 5,
      }}
      className={
        sendDisabled && !showStop
          ? 'bg-secondary active:opacity-70 disabled:opacity-60'
          : 'bg-foreground active:opacity-70'
      }
      onPress={showStop ? onStop : onSend}
      disabled={sendDisabled && !showStop}
      accessibilityLabel={
        showStop ? (canForceStop ? 'Force stop' : 'Stop generation') : 'Send message'
      }
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
          <SymbolImage name="stop.fill" size={14} tintColorClassName="accent-background" />
        </Animated.View>
      ) : (
        <SymbolImage
          name="arrow.up"
          size={16}
          sfEffect="scale/up"
          tintColorClassName={sendDisabled ? 'accent-muted-foreground' : 'accent-background'}
        />
      )}
    </Pressable>
  )
}
