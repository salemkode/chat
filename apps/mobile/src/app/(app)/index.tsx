import {
  ChatProvider,
  Conversation,
  ConversationEmptyState,
  ConversationScrollButton,
  Message,
  MessageAttachments,
  MessageResponse,
  PromptInput,
  PromptInputAction,
  PromptInputBody,
  PromptInputSubmit,
  PromptInputTextarea,
  StreamingMessage,
  createStreamingStore,
  type ChatMessage,
} from "@/components/chat";
import { getMessageFileParts } from "@chat/shared/logic/message-file-parts";
import { ChatInlineError } from "@/components/chat/chat-inline-error";
import { ComposerProjectProvider } from "@/components/chat/composer-project-context";
import { useChatAttachments } from "@/components/chat/attachment-context";
import { useChatComposerOptions } from "@/components/chat/composer-options-context";
import { Icon } from "@/components/icon";
import { MainHeader } from "@/components/main-header";
import { useModel } from "@/components/model-context";
import { validateAttachmentsForSend } from "@/lib/attachment-capability-messages";
import {
  CHAT_PROJECT_ASSIGN_FAILED_MESSAGE,
  CHAT_STOP_GENERATION_FAILED_MESSAGE,
  formatMessageFailureNote,
  formatUserFacingError,
} from "@chat/shared/logic/user-facing-errors";
import { selectThread, threadSelection$ } from "@/state/thread-selection";
import { useMessages, useSendMessage } from "@/hooks/use-chat-data";
import { useSettings } from "@/hooks/use-settings";
import { useSelector } from "@legendapp/state/react";
import { useChatCoreContext, useGenerationState } from "@chat/chat-core";
import * as Haptics from "expo-haptics";
import { Link, useLocalSearchParams } from "expo-router";
import { Plus } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";

export default function ChatScreen() {
  const params = useLocalSearchParams<{
    threadId?: string | string[];
  }>();
  const routeThreadId = Array.isArray(params.threadId)
    ? params.threadId[0]
    : params.threadId;
  const selectedThreadId = useSelector(() =>
    threadSelection$.selectedThreadId.get(),
  );
  const threadId = selectedThreadId || routeThreadId || undefined;
  const [input, setInput] = useState("");
  const [error, setError] = useState<Error | null>(null);
  const {
    selectedModelId,
    selectedModel,
    attachmentMediaTypes,
    attachmentsSupported,
    imageAttachmentsSupported,
  } = useModel();
  const { searchEnabled } = useChatComposerOptions();
  const { settings } = useSettings();
  const { send, stop } = useSendMessage();
  const { attachments, clearAttachments, hasUploadingAttachments } =
    useChatAttachments();
  const { messages, hasActiveStreaming } = useMessages(threadId);
  const { activeGeneration, canStop, canForceStop } = useGenerationState(messages);
  const { pendingProjectId, setPendingProjectId, assignThreadToProject } =
    useChatCoreContext();
  const streamingStore = useMemo(() => createStreamingStore(), []);
  const prevStreamTextRef = useRef("");

  useEffect(() => {
    if (!hasActiveStreaming) {
      if (prevStreamTextRef.current) {
        prevStreamTextRef.current = "";
        streamingStore.set("");
      }
      return;
    }
    const streamingMsgs = messages.filter(
      (m) => m.status === "streaming" || m.status === "pending",
    );
    const lastStreaming = streamingMsgs[streamingMsgs.length - 1];
    if (lastStreaming) {
      const text = lastStreaming.text ?? "";
      if (text !== prevStreamTextRef.current) {
        prevStreamTextRef.current = text;
        streamingStore.set(text);
      }
    }
  }, [messages, hasActiveStreaming, streamingStore]);

  useEffect(() => {
    if (!error) {
      return;
    }

    if (input.trim() || attachments.length > 0) {
      setError(null);
    }
  }, [attachments.length, error, input]);

  const isGenerating = hasActiveStreaming;
  const canSend =
    Boolean(input.trim() || attachments.length > 0) && !hasUploadingAttachments;

  const onStop = useCallback(async () => {
    if (!threadId || !canStop) {
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    prevStreamTextRef.current = "";
    streamingStore.set("");
    try {
      const result = await stop({
        threadId,
        promptMessageId: activeGeneration?.promptMessageId,
      });
      if (!result.stopped) {
        setError(new Error(CHAT_STOP_GENERATION_FAILED_MESSAGE));
        return;
      }
      setError(null);
    } catch (err) {
      setError(new Error(formatUserFacingError(err)));
    }
  }, [
    activeGeneration?.promptMessageId,
    canStop,
    stop,
    streamingStore,
    threadId,
  ]);

  const onSend = useCallback(async () => {
    if (!canSend || isGenerating) return;

    const attachmentError = validateAttachmentsForSend({
      attachments,
      modelName: selectedModel,
      attachmentMediaTypes,
      attachmentsSupported,
      imageAttachmentsSupported,
    });
    if (attachmentError) {
      setError(new Error(formatUserFacingError(attachmentError)));
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setError(null);

    const text = input;
    setInput("");

    try {
      const reasoningLevel =
        settings?.reasoningLevel === "low" ||
        settings?.reasoningLevel === "medium" ||
        settings?.reasoningLevel === "high"
          ? settings.reasoningLevel
          : "medium";

      const result = await send({
        text,
        threadId,
        modelDocId: selectedModelId,
        attachments,
        searchEnabled,
        searchMode: searchEnabled ? "required" : undefined,
        reasoning: settings?.reasoningEnabled
          ? { enabled: true, level: reasoningLevel }
          : undefined,
      });
      clearAttachments();
      if (!threadId && result.threadId) {
        selectThread(result.threadId);
        if (pendingProjectId) {
          void assignThreadToProject(result.threadId, pendingProjectId)
            .catch(() => {
              setError(new Error(CHAT_PROJECT_ASSIGN_FAILED_MESSAGE));
            })
            .finally(() => setPendingProjectId(null));
        }
      }
    } catch (err) {
      setInput(text);
      setError(new Error(formatUserFacingError(err)));
      console.error("Send error:", err);
    }
  }, [
    attachmentMediaTypes,
    attachments,
    attachmentsSupported,
    assignThreadToProject,
    canSend,
    clearAttachments,
    imageAttachmentsSupported,
    settings?.reasoningEnabled,
    input,
    isGenerating,
    pendingProjectId,
    searchEnabled,
    selectedModel,
    selectedModelId,
    send,
    settings?.reasoningLevel,
    setPendingProjectId,
    threadId,
  ]);

  const chatMessages = useMemo<ChatMessage[]>(
    () =>
      messages.map((m) => ({
        id: m.id,
        role: m.role,
        content:
          (m.status === "streaming" || m.status === "pending") &&
          m.role === "assistant" &&
          m === messages[messages.length - 1]
            ? ""
            : m.text,
        parts: m.parts,
      })),
    [messages],
  );

  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => {
      if (item.role === "user") {
        const hasAttachments = getMessageFileParts(item.parts ?? []).length > 0;
        return (
          <Message from="user" wide={hasAttachments}>
            <View className="w-full gap-2">
              <MessageAttachments parts={item.parts} />
              {item.content ? (
                <Text className="text-base leading-5.5 text-foreground">
                  {item.content}
                </Text>
              ) : null}
            </View>
          </Message>
        );
      }

      const sourceMessage = messages.find((m) => m.id === item.id);
      const isFailed = sourceMessage?.status === "failed";
      const isStreaming =
        isGenerating && item.content === "" && !isFailed;
      const failureNote = formatMessageFailureNote(
        sourceMessage?.failureNote,
        sourceMessage?.failureKind === "stopped" ? "stopped" : "error",
      );

      return (
        <Message from="assistant">
          {isStreaming ? (
            <StreamingMessage store={streamingStore} />
          ) : isFailed ? (
            <ChatInlineError message={failureNote} />
          ) : (
            <MessageResponse>{item.content}</MessageResponse>
          )}
        </Message>
      );
    },
    [isGenerating, messages, streamingStore],
  );

  const chat = useMemo(
    () => ({
      messages: chatMessages,
      input,
      setInput,
      isGenerating,
      canSend,
      canStop,
      canForceStop,
      onSend,
      onStop,
      streamingStore,
      error,
    }),
    [
      canForceStop,
      canSend,
      canStop,
      chatMessages,
      error,
      input,
      isGenerating,
      onSend,
      onStop,
      streamingStore,
    ],
  );

  return (
    <>
      <ChatProvider value={chat}>
        <ComposerProjectProvider threadId={threadId}>
          <Conversation
            renderMessage={renderMessage}
            emptyState={
              <ConversationEmptyState
                title="Chat"
                description="Send a message to get started"
              />
            }
          >
            <ConversationScrollButton />
            <PromptInput>
              <Link href="/attachments" asChild>
                <PromptInputAction>
                  <View>
                    <Icon icon={Plus} className="w-5 h-5 text-muted-foreground" />
                    {attachments.length > 0 ? (
                      <View className="absolute -right-2 -top-2 min-w-4 items-center rounded-full bg-foreground px-1">
                        <Text className="text-[10px] font-semibold text-background">
                          {attachments.length}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </PromptInputAction>
              </Link>
              <PromptInputBody>
                <PromptInputTextarea placeholder="Type @ to link a project…" />
                <PromptInputSubmit />
              </PromptInputBody>
            </PromptInput>
          </Conversation>
        </ComposerProjectProvider>
      </ChatProvider>
      <MainHeader />
    </>
  );
}
