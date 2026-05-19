import { ChatCoreProvider } from "@chat/chat-core";
import type { ProjectSummary, ThreadSummary } from "@chat/chat-core/types";
import { useMemo, type ReactNode } from "react";
import { chatCoreApiRefs } from "@/lib/chat-core-api";
import {
  cacheProjectsToLocal,
  cacheThreadsToLocal,
  useConvexUserIdForCache,
  useOfflineCacheVersion,
} from "@/hooks/chat-data/shared";
import {
  readProjectsCache,
  readThreadsCache,
} from "@/offline/local-cache";

export function MobileChatCoreProvider({ children }: { children: ReactNode }) {
  const cacheUserId = useConvexUserIdForCache();
  const cacheRevision = useOfflineCacheVersion();

  const cacheAccessors = useMemo(
    () => ({
      readCachedThreads: () => {
        if (!cacheUserId) {
          return null;
        }
        return readThreadsCache<ThreadSummary[]>(cacheUserId);
      },
      readCachedProjects: () => {
        if (!cacheUserId) {
          return null;
        }
        return readProjectsCache<ProjectSummary[]>(cacheUserId);
      },
      writeCachedThreads: (threads: ThreadSummary[]) => {
        if (!cacheUserId) {
          return;
        }
        cacheThreadsToLocal(cacheUserId, threads);
      },
      writeCachedProjects: (projects: ProjectSummary[]) => {
        if (!cacheUserId) {
          return;
        }
        cacheProjectsToLocal(cacheUserId, projects);
      },
    }),
    [cacheUserId],
  );

  return (
    <ChatCoreProvider
      apiRefs={chatCoreApiRefs}
      cacheAccessors={cacheAccessors}
      cacheRevision={cacheRevision}
    >
      {children}
    </ChatCoreProvider>
  );
}
