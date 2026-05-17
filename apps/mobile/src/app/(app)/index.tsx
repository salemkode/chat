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
import { useChatAttachments } from "@/components/chat/attachment-context";
import { Icon } from "@/components/icon";
import { MainHeader } from "@/components/main-header";
import { useModel } from "@/components/model-context";
import { selectThread, threadSelection$ } from "@/state/thread-selection";
import { useMessages, useSendMessage } from "@/hooks/use-chat-data";
import { useSelector } from "@legendapp/state/react";
import { useChatCoreContext } from "@chat/chat-core";
import * as Haptics from "expo-haptics";
import { Link, useLocalSearchParams } from "expo-router";
import { Plus } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "Unable to send message";
}

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
  const { selectedModelId } = useModel();
  const { send } = useSendMessage();
  const { attachments, clearAttachments } = useChatAttachments();
  const { messages, hasActiveStreaming } = useMessages(threadId);
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
  const canSend = Boolean(input.trim() || attachments.length > 0);

  const onSend = useCallback(async () => {
    if (!canSend || isGenerating) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setError(null);

    const text = input;
    setInput("");

    try {
      const result = await send({
        text,
        threadId,
        modelDocId: selectedModelId,
        attachments,
      });
      clearAttachments();
      if (!threadId && result.threadId) {
        selectThread(result.threadId);
        if (pendingProjectId) {
          assignThreadToProject(result.threadId, pendingProjectId)
            .catch(() => {})
            .finally(() => setPendingProjectId(null));
        }
      }
    } catch (err) {
      setInput(text);
      setError(new Error(getErrorMessage(err)));
      console.error("Send error:", err);
    }
  }, [
    attachments,
    assignThreadToProject,
    canSend,
    clearAttachments,
    input,
    isGenerating,
    pendingProjectId,
    selectedModelId,
    send,
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
        return (
          <Message from="user">
            <View className="gap-2">
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

      const isStreaming = isGenerating && item.content === "";
      return (
        <Message from="assistant">
          {isStreaming ? (
            <StreamingMessage store={streamingStore} />
          ) : (
            <MessageResponse>{item.content}</MessageResponse>
          )}
        </Message>
      );
    },
    [isGenerating, streamingStore],
  );

  const chat = useMemo(
    () => ({
      messages: chatMessages,
      input,
      setInput,
      isGenerating,
      canSend,
      onSend,
      streamingStore,
      error,
    }),
    [canSend, chatMessages, error, input, isGenerating, onSend, streamingStore],
  );

  return (
    <>
      <ChatProvider value={chat}>
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
              <PromptInputTextarea />
              <PromptInputSubmit />
            </PromptInputBody>
          </PromptInput>
        </Conversation>
      </ChatProvider>
      <MainHeader />
    </>
  );
}
