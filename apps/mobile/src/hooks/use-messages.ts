import { useUIMessages } from "@convex-dev/agent/react";
import type { UsePaginatedQueryResult } from "convex/react";
import { useMemo } from "react";
import { api } from "@convex/_generated/api";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  parts: Array<Record<string, unknown>>;
  status: "success" | "streaming" | "pending" | "failed";
  order?: number;
  stepOrder?: number;
  failureKind?: "stopped" | "error";
  failureMode?: "replace" | "clarify";
  failureNote?: string;
};

export function useMessages(threadId?: string) {
  const queryArgs = threadId ? { threadId } : "skip";
  const paginatedMessages = useUIMessages(api.chat.listMessages, queryArgs, {
    initialNumItems: 30,
    stream: true,
  }) as unknown as UsePaginatedQueryResult<ChatMessage>;

  const messages = useMemo(() => {
    if (!threadId || !paginatedMessages.results?.length) return [];
    return paginatedMessages.results.map((msg: any) => ({
      id: msg.id ?? msg._id,
      role: msg.role as "user" | "assistant",
      text: msg.text ?? "",
      parts: msg.parts ?? [],
      status: msg.status ?? "success",
      order: msg.order,
      stepOrder: msg.stepOrder,
      failureKind: msg.failureKind,
      failureMode: msg.failureMode,
      failureNote: msg.failureNote,
    }));
  }, [paginatedMessages.results, threadId]);

  const hasActiveStreaming = useMemo(
    () =>
      messages.some((m) => m.status === "streaming" || m.status === "pending"),
    [messages],
  );

  return {
    messages,
    status: paginatedMessages.status,
    hasMore:
      paginatedMessages.status === "CanLoadMore" ||
      paginatedMessages.status === "LoadingMore",
    loadOlderMessages: paginatedMessages.loadMore,
    hasActiveStreaming,
  };
}
