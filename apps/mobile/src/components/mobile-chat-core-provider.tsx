import { ChatCoreShell } from "@chat/chat-core";
import type { ProjectSummary, ThreadSummary } from "@chat/chat-core/types";
import { useMutation } from "convex/react";
import { useMemo, type ReactNode } from "react";
import { api } from "@convex/_generated/api";
import { chatCoreApiRefs } from "@/lib/chat-core-api";
import { createMobileAttachmentAdapter } from "@/lib/chat-core-adapters";
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
  const generateAttachmentUploadUrl = useMutation(
    api.agents.generateAttachmentUploadUrl,
  );

  const attachmentAdapter = useMemo(
    () =>
      createMobileAttachmentAdapter(async () => {
        const uploadUrl = await generateAttachmentUploadUrl({});
        return uploadUrl ?? null;
      }),
    [generateAttachmentUploadUrl],
  );

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
    <ChatCoreShell
      apiRefs={chatCoreApiRefs}
      cacheAccessors={cacheAccessors}
      cacheRevision={cacheRevision}
      attachmentAdapter={attachmentAdapter}
    >
      {children}
    </ChatCoreShell>
  );
}
