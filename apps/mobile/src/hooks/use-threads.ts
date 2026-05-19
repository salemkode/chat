import { resolveChatSnapshot } from "@chat/chat-core";
import { compareThreadsForSidebar } from "@chat/chat-core/sidebar";
import type { ThreadSummary } from "@chat/chat-core/types";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useMemo, useCallback } from "react";
import {
  useConvexUserIdForCache,
  useOfflineCacheVersion,
} from "@/hooks/chat-data/shared";
import { readThreadsCache } from "@/offline/local-cache";

function normalizeThread(thread: {
  _id: string;
  title?: string;
  metadata?: { emoji?: string; icon?: string; sortOrder?: number };
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
  const liveThreads = useQuery(api.agents.listThreadsWithMetadata);
  const setThreadPinned = useMutation(api.agents.setThreadPinned);
  const deleteThreadMutation = useMutation(api.chat.deleteThread);

  const cachedThreads = useMemo(() => {
    if (!cacheUserId) {
      return [] as ThreadSummary[];
    }
    const fromCache = readThreadsCache<ThreadSummary[]>(cacheUserId);
    return Array.isArray(fromCache) ? [...fromCache].sort(compareThreadsForSidebar) : [];
  }, [cacheUserId, cacheVersion]);

  const threads = useMemo<ThreadSummary[]>(() => {
    const normalized =
      liveThreads === undefined ? undefined : liveThreads.map(normalizeThread);
    return resolveChatSnapshot({
      live: normalized,
      persisted: cachedThreads,
    }).sort(compareThreadsForSidebar);
  }, [cachedThreads, liveThreads]);

  const setPinned = useCallback(
    async (threadId: string, pinned: boolean) => {
      await setThreadPinned({ threadId, pinned });
    },
    [setThreadPinned],
  );

  const deleteThread = useCallback(
    async (threadId: string) => {
      await deleteThreadMutation({ threadId });
    },
    [deleteThreadMutation],
  );

  return { threads, setPinned, deleteThread, isLoading: liveThreads === undefined };
}

export function useThread(threadId?: string) {
  const liveThread = useQuery(api.chat.getThread, threadId ? { threadId } : "skip");

  return useMemo(() => {
    if (!liveThread) return null;
    return normalizeThread(liveThread);
  }, [liveThread]);
}
