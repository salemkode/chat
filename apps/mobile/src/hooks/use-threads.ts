import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useMemo, useCallback } from "react";

export type ThreadSummary = {
  id: string;
  title?: string;
  emoji: string;
  icon?: string;
  projectId?: string;
  projectName?: string;
  sortOrder: number;
  pinned: boolean;
  lastMessageAt: number;
};

function normalizeThread(thread: any): ThreadSummary {
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
    lastMessageAt:
      (thread as any).lastMessageAt ?? thread._creationTime,
  };
}

export function useThreads() {
  const liveThreads = useQuery(api.agents.listThreadsWithMetadata);
  const setThreadPinned = useMutation(api.agents.setThreadPinned);
  const deleteThreadMutation = useMutation(api.chat.deleteThread);

  const threads = useMemo<ThreadSummary[]>(() => {
    if (!liveThreads) return [];
    return liveThreads
      .map(normalizeThread)
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return b.lastMessageAt - a.lastMessageAt;
      });
  }, [liveThreads]);

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

  return { threads, setPinned, deleteThread };
}

export function useThread(threadId?: string) {
  const liveThread = useQuery(
    api.chat.getThread,
    threadId ? { threadId } : "skip",
  );

  return useMemo(() => {
    if (!liveThread) return null;
    return normalizeThread(liveThread);
  }, [liveThread]);
}
