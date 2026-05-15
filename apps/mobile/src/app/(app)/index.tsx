import {
  ChatProvider,
  Conversation,
  ConversationEmptyState,
  ConversationScrollButton,
  Message,
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
import { Icon } from "@/components/icon";
import { MainHeader } from "@/components/main-header";
import { useModel } from "@/components/model-context";
import { useMessages, useSendMessage } from "@/hooks/use-chat-data";
import * as Haptics from "expo-haptics";
import { Link } from "expo-router";
import { Plus } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export default function ChatScreen() {
  const [threadId, setThreadId] = useState<string | undefined>(undefined);
  const [input, setInput] = useState("");
  const { selectedModelId } = useModel();
  const { send } = useSendMessage();
  const { messages, hasActiveStreaming } = useMessages(threadId);
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

  const isGenerating = hasActiveStreaming;

  const onSend = useCallback(async () => {
    if (!input.trim() || isGenerating) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const text = input.trim();
    setInput("");

    try {
      const result = await send({
        text,
        threadId,
        modelDocId: selectedModelId as any,
      });
      if (result.threadId && !threadId) {
        setThreadId(result.threadId);
      }
    } catch (err) {
      console.error("Send error:", err);
    }
  }, [input, isGenerating, send, threadId, selectedModelId]);

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
      })),
    [messages],
  );

  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => {
      if (item.role === "user") {
        return <Message from="user">{item.content}</Message>;
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
      onSend,
      streamingStore,
    }),
    [chatMessages, input, isGenerating, onSend, streamingStore],
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
                <Icon icon={Plus} className="w-5 h-5 text-muted-foreground" />
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
