import { useUIMessages } from "@convex-dev/agent/react";
import type { UsePaginatedQueryResult } from "convex/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { DeviceEventEmitter } from "react-native";
import { api } from "@convex/_generated/api";
import { useThreadMessages } from "@chat/chat-core";
import {
  cacheMessagesToLocal,
  type ChatMessage,
  type LocalCachedMessageRow,
  useConvexUserIdForCache,
  useOfflineCacheVersion,
} from "@/hooks/chat-data/shared";
import { CHAT_STREAM_RESUME_EVENT } from "@/lib/chat-events";
import { readMessagesCache } from "@/offline/local-cache";

export function useMessages(threadId?: string) {
  const cacheUserId = useConvexUserIdForCache();
  const cacheVersion = useOfflineCacheVersion();
  const [streamEnabled, setStreamEnabled] = useState(Boolean(threadId));
  const stableSignatureRef = useRef("");
  const stableSnapshotCountRef = useRef(0);
  const queryArgs = threadId ? { threadId } : "skip";
  const paginatedMessages = useUIMessages(api.chat.listMessages, queryArgs, {
    initialNumItems: 30,
    stream: streamEnabled,
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

  const liveResults = useMemo(() => {
    if (!threadId || paginatedMessages.results === undefined) {
      return undefined;
    }
    return paginatedMessages.results.map((msg) => ({
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
    })) as ChatMessage[];
  }, [paginatedMessages.results, threadId]);

  const { messages, hasMore, loadOlderMessages, hasRenderableMessages } = useThreadMessages({
    threadId,
    threadKey: threadId ?? "new",
    liveResults,
    persistedMessages: cachedMessages,
    paginatedStatus: paginatedMessages.status,
    loadMore: paginatedMessages.loadMore,
  });

  const liveMessages = useMemo(() => {
    if (!threadId || !paginatedMessages.results?.length) {
      return [] as ChatMessage[];
    }
    return liveResults ?? [];
  }, [liveResults, paginatedMessages.results?.length, threadId]);

  const lastCachedSignatureRef = useRef("");
  const hasStreamingMessages = useMemo(
    () =>
      liveMessages.some(
        (message) => message.status === "streaming" || message.status === "pending",
      ),
    [liveMessages],
  );
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
      hasStreamingMessages ? 1 : 0,
    ].join(":");
  }, [hasStreamingMessages, liveMessages, threadId]);

  useEffect(() => {
    lastCachedSignatureRef.current = "";
    stableSignatureRef.current = "";
    stableSnapshotCountRef.current = 0;
    setStreamEnabled(Boolean(threadId));
  }, [threadId]);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      CHAT_STREAM_RESUME_EVENT,
      (detail: { threadId?: string }) => {
        if (!threadId || detail.threadId !== threadId) {
          return;
        }
        stableSignatureRef.current = "";
        stableSnapshotCountRef.current = 0;
        setStreamEnabled(true);
      },
    );
    return () => subscription.remove();
  }, [threadId]);

  useEffect(() => {
    if (!threadId || !cacheSignature) {
      return;
    }

    if (hasStreamingMessages) {
      stableSignatureRef.current = cacheSignature;
      stableSnapshotCountRef.current = 0;
      if (!streamEnabled) {
        setStreamEnabled(true);
      }
      return;
    }

    if (stableSignatureRef.current === cacheSignature) {
      stableSnapshotCountRef.current += 1;
      if (stableSnapshotCountRef.current >= 1 && streamEnabled) {
        setStreamEnabled(false);
      }
      return;
    }

    stableSignatureRef.current = cacheSignature;
    stableSnapshotCountRef.current = 0;
  }, [cacheSignature, hasStreamingMessages, streamEnabled, threadId]);

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

  const hasActiveStreaming = useMemo(
    () => messages.some((m) => m.status === "streaming" || m.status === "pending"),
    [messages],
  );

  return {
    messages,
    status: paginatedMessages.status,
    hasMore,
    loadOlderMessages,
    hasActiveStreaming,
    hasRenderableMessages,
  };
}
