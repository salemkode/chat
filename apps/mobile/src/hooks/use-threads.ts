import { resolveChatSnapshot } from "@chat/chat-core";
import { compareThreadsForSidebar } from "@chat/chat-core/sidebar";
import type { ThreadSummary } from "@chat/chat-core/types";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useMemo, useCallback } from "react";
import {
  useConvexUserIdForCache,
  useOfflineCacheVersion,
} from "@/hooks/chat-data/shared";
import { sortedCopy } from "@/lib/sorted-copy";
import { deleteThreadCache, readThreadsCache } from "@/offline/local-cache";

function normalizeThread(thread: {
  _id: string;
  title?: string;
  metadata?: { emoji?: string; icon?: string; sortOrder?: number } | null;
  project?: { id: string; name: string } | null;
  lastMessageAt?: number;
  _creationTime: number;
}): ThreadSummary {
  const project = thread.project;
  return {
    id: thread._id,
    title: thread.title,
    emoji: thread.metadata?.emoji || "💬",
    icon: thread.metadata?.icon,
    projectId: project?.id,
    projectName: project?.name,
    sortOrder: thread.metadata?.sortOrder ?? 0,
    pinned: (thread.metadata?.sortOrder ?? 0) > 0,
    lastMessageAt: thread.lastMessageAt ?? thread._creationTime,
  };
}

export function useThreads() {
  const cacheUserId = useConvexUserIdForCache();
  const cacheVersion = useOfflineCacheVersion();
  const liveThreadsQuery = usePaginatedQuery(
    api.agents.listThreadsWithMetadata,
    {},
    { initialNumItems: 30 },
  );
  const setThreadPinned = useMutation(api.agents.setThreadPinned);
  const deleteThreadMutation = useMutation(api.chat.deleteThread);

  const cachedThreads = useMemo(() => {
    if (!cacheUserId) {
      return [] as ThreadSummary[];
    }
    const fromCache = readThreadsCache<ThreadSummary[]>(cacheUserId);
    return Array.isArray(fromCache) ? sortedCopy(fromCache, compareThreadsForSidebar) : [];
  }, [cacheUserId, cacheVersion]);

  const threads = useMemo<ThreadSummary[]>(() => {
    const normalized =
      liveThreadsQuery.results === undefined
        ? undefined
        : liveThreadsQuery.results.map(normalizeThread);
    return sortedCopy(resolveChatSnapshot({
      live: normalized,
      persisted: cachedThreads,
    }), compareThreadsForSidebar);
  }, [cachedThreads, liveThreadsQuery.results]);

  const setPinned = useCallback(
    async (threadId: string, pinned: boolean) => {
      await setThreadPinned({ threadId, pinned });
    },
    [setThreadPinned],
  );

  const deleteThread = useCallback(
    async (threadId: string) => {
      await deleteThreadMutation({ threadId });
      if (cacheUserId) {
        await deleteThreadCache(cacheUserId, threadId);
      }
    },
    [cacheUserId, deleteThreadMutation],
  );

  return {
    threads,
    setPinned,
    deleteThread,
    isLoading: liveThreadsQuery.results === undefined,
    hasMore: liveThreadsQuery.status === "CanLoadMore" || liveThreadsQuery.status === "LoadingMore",
    isLoadingMore: liveThreadsQuery.status === "LoadingMore",
    loadMore: (numItems = 30) => liveThreadsQuery.loadMore(numItems),
  };
}

export function useThread(threadId?: string) {
  const liveThread = useQuery(api.chat.getThread, threadId ? { threadId } : "skip");

  return useMemo(() => {
    if (!liveThread) return null;
    return normalizeThread(liveThread);
  }, [liveThread]);
}
