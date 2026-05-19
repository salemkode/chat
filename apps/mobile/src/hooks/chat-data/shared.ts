import { useQuery } from "@chat/shared/convex-query-cache/hooks";
import { api } from "@convex/_generated/api";
import { useMemo, useSyncExternalStore } from "react";
import {
  getOfflineCacheVersion,
  readSession,
  subscribeOfflineCache,
  writeMessagesCache,
  writeProjectsCache,
  writeThreadsCache,
} from "@/offline/local-cache";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  parts: Array<Record<string, unknown>>;
  status: "success" | "streaming" | "pending" | "failed";
  order?: number;
  stepOrder?: number;
  createdAt?: number;
  failureKind?: "stopped" | "error";
  failureMode?: "replace" | "clarify";
  failureNote?: string;
};

export type LocalCachedMessageRow = {
  id: string;
  role: "user" | "assistant";
  text: string;
  parts: Array<Record<string, unknown>>;
  createdAt?: number;
  failureKind?: "stopped" | "error";
  failureMode?: "replace" | "clarify";
  failureNote?: string;
  status?: "success" | "streaming" | "failed";
};

export function useOfflineCacheVersion() {
  return useSyncExternalStore(
    subscribeOfflineCache,
    getOfflineCacheVersion,
    () => 0,
  );
}

export function useConvexUserIdForCache() {
  const cacheVersion = useOfflineCacheVersion();
  const viewer = useQuery(api.users.viewer);
  return useMemo(() => {
    return viewer?._id ?? readSession()?.userId ?? undefined;
  }, [viewer?._id, cacheVersion]);
}

export function cacheMessagesToLocal(
  userId: string,
  threadId: string,
  messages: ChatMessage[],
) {
  const snapshot: LocalCachedMessageRow[] = messages.map((message) => ({
    id: message.id,
    role: message.role,
    text: message.text,
    parts: message.parts,
    createdAt: message.createdAt ?? message.order,
    failureKind: message.failureKind,
    failureMode: message.failureMode,
    failureNote: message.failureNote,
    status:
      message.status === "streaming"
        ? "streaming"
        : message.status === "failed"
          ? "failed"
          : "success",
  }));

  void writeMessagesCache(userId, threadId, snapshot);
}

export function cacheThreadsToLocal(userId: string, threads: unknown) {
  void writeThreadsCache(userId, threads);
}

export function cacheProjectsToLocal(userId: string, projects: unknown) {
  void writeProjectsCache(userId, projects);
}
