import { usePaginatedQuery, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useMemo } from "react";

export type ChatMessage = {
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
  const paginatedMessages = usePaginatedQuery(
    api.chat.listMessages,
    threadId ? { threadId } : "skip",
    { initialNumItems: 30 },
  );

  const streamingMessages = useQuery(
    api.chat.listStreamingMessages,
    threadId ? { threadId } : "skip",
  );

  const persisted = useMemo(() => {
    if (!paginatedMessages.results?.length) return [];
    return paginatedMessages.results.map((msg: any) => ({
      id: msg._id,
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
  }, [paginatedMessages.results]);

  const streams = useMemo(() => {
    if (!streamingMessages?.length) return [];
    return streamingMessages.map((msg: any) => ({
      id: msg._id,
      role: msg.role as "user" | "assistant",
      text: msg.text ?? "",
      parts: msg.parts ?? [],
      status: "streaming" as const,
      order: msg.order,
      stepOrder: msg.stepOrder,
    }));
  }, [streamingMessages]);

  const messages = useMemo(() => {
    const byKey = new Map(
      persisted.map((m) => [`${m.order}:${m.stepOrder ?? 0}`, m]),
    );
    for (const msg of streams) {
      const key = `${msg.order}:${msg.stepOrder ?? 0}`;
      const existing = byKey.get(key);
      if (!existing || existing.status === "pending" || existing.status === "streaming") {
        byKey.set(key, msg);
      }
    }
    return Array.from(byKey.values()).sort(
      (a, b) =>
        (a.order ?? 0) - (b.order ?? 0) ||
        (a.stepOrder ?? 0) - (b.stepOrder ?? 0),
    );
  }, [persisted, streams]);

  const hasActiveStreaming = useMemo(
    () => messages.some((m) => m.status === "streaming" || m.status === "pending"),
    [messages],
  );

  return {
    messages,
    status: paginatedMessages.status,
    hasMore: paginatedMessages.status === "CanLoadMore" || paginatedMessages.status === "LoadingMore",
    loadOlderMessages: paginatedMessages.loadMore,
    hasActiveStreaming,
  };
}
