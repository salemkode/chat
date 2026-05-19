import { useUIMessages } from "@convex-dev/agent/react";
import type { UsePaginatedQueryResult } from "convex/react";
import { useEffect, useMemo, useRef } from "react";
import { api } from "@convex/_generated/api";
import { sortChatMessages } from "@/hooks/chat-data/message-order";
import {
  cacheMessagesToLocal,
  type ChatMessage,
  type LocalCachedMessageRow,
  useConvexUserIdForCache,
  useOfflineCacheVersion,
} from "@/hooks/chat-data/shared";
import { readMessagesCache } from "@/offline/local-cache";

export function useMessages(threadId?: string) {
  const cacheUserId = useConvexUserIdForCache();
  const cacheVersion = useOfflineCacheVersion();
  const queryArgs = threadId ? { threadId } : "skip";
  const paginatedMessages = useUIMessages(api.chat.listMessages, queryArgs, {
    initialNumItems: 30,
    stream: true,
  }) as unknown as UsePaginatedQueryResult<ChatMessage>;

  const cachedMessages = useMemo(() => {
    if (!threadId || !cacheUserId) {
      return [] as ChatMessage[];
    }
    const raw = readMessagesCache<LocalCachedMessageRow[]>(cacheUserId, threadId);
    if (!Array.isArray(raw)) {
      return [] as ChatMessage[];
    }
    return raw.map(
      (message) =>
        ({
          id: message.id,
          role: message.role,
          text: message.text,
          parts: message.parts,
          createdAt: message.createdAt,
          failureKind: message.failureKind,
          failureMode: message.failureMode,
          failureNote: message.failureNote,
          status:
            message.status === "streaming"
              ? "streaming"
              : message.status === "failed"
                ? "failed"
                : "success",
        }) as ChatMessage,
    );
  }, [threadId, cacheUserId, cacheVersion]);

  const orderedCachedMessages = useMemo(
    () => sortChatMessages(cachedMessages),
    [cachedMessages],
  );

  const liveMessages = useMemo(() => {
    if (!threadId || !paginatedMessages.results?.length) {
      return [] as ChatMessage[];
    }
    return sortChatMessages(
      paginatedMessages.results.map((msg) => ({
        id: msg.id ?? (msg as { _id?: string })._id ?? "",
        role: msg.role as "user" | "assistant",
        text: msg.text ?? "",
        parts: msg.parts ?? [],
        status: (msg.status ?? "success") as ChatMessage["status"],
        order: msg.order,
        stepOrder: msg.stepOrder,
        createdAt: msg.order,
        failureKind: msg.failureKind,
        failureMode: msg.failureMode,
        failureNote: msg.failureNote,
      })),
    );
  }, [paginatedMessages.results, threadId]);

  const lastCachedSignatureRef = useRef("");
  const cacheSignature = useMemo(() => {
    if (!threadId || liveMessages.length === 0) {
      return "";
    }

    const lastMessage = liveMessages[liveMessages.length - 1];
    return [
      threadId,
      liveMessages.length,
      lastMessage?.id || "",
      lastMessage?.status || "",
      lastMessage?.text?.length || 0,
    ].join(":");
  }, [liveMessages, threadId]);

  useEffect(() => {
    if (!threadId || !cacheUserId || liveMessages.length === 0 || !cacheSignature) {
      return;
    }

    if (cacheSignature === lastCachedSignatureRef.current) {
      return;
    }

    try {
      cacheMessagesToLocal(cacheUserId, threadId, liveMessages);
      lastCachedSignatureRef.current = cacheSignature;
    } catch {
      // Live Convex data remains authoritative.
    }
  }, [cacheSignature, cacheUserId, liveMessages, threadId]);

  const messages = liveMessages.length > 0 ? liveMessages : orderedCachedMessages;

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
    hasRenderableMessages: messages.length > 0,
  };
}
