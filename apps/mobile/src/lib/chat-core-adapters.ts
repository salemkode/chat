import type { AttachmentAdapter, StorageAdapter } from "@chat/chat-core/adapters";
import type { ChatMessage, ProjectSummary, ThreadSummary } from "@chat/chat-core/types";
import type { LocalAttachment } from "@/components/chat/attachment-types";
import { uploadLocalAttachment } from "@/lib/attachment-upload";
import {
  readMessagesCache,
  readProjectsCache,
  readThreadsCache,
} from "@/offline/local-cache";
import {
  cacheMessagesToLocal,
  cacheProjectsToLocal,
  cacheThreadsToLocal,
} from "@/hooks/chat-data/shared";

export function createMobileStorageAdapter(
  getUserId: () => string | null,
  onCacheChange: () => void,
): StorageAdapter {
  return {
    readDraft() {
      return "";
    },
    writeDraft() {},
    readCachedThreads(userId: string) {
      return readThreadsCache<ThreadSummary[]>(userId);
    },
    writeCachedThreads(userId: string, threads: ThreadSummary[]) {
      cacheThreadsToLocal(userId, threads);
      onCacheChange();
    },
    readCachedProjects(userId: string) {
      return readProjectsCache<ProjectSummary[]>(userId);
    },
    writeCachedProjects(userId: string, projects: ProjectSummary[]) {
      cacheProjectsToLocal(userId, projects);
      onCacheChange();
    },
    readCachedMessages(userId: string, threadId: string) {
      return readMessagesCache<ChatMessage[]>(userId, threadId);
    },
    writeCachedMessages(userId: string, threadId: string, messages: ChatMessage[]) {
      cacheMessagesToLocal(userId, threadId, messages);
      onCacheChange();
    },
    getCacheVersion() {
      return 0;
    },
    subscribeToCacheChanges(callback: () => void) {
      return callback;
    },
  };
}

export function createMobileAttachmentAdapter(
  getUploadUrl: () => Promise<string | null>,
): AttachmentAdapter<LocalAttachment> {
  return {
    createPendingAttachments(attachments: LocalAttachment[]) {
      return attachments.map((attachment) => ({
        filename: attachment.filename,
        mediaType: attachment.mediaType,
        url: attachment.uri,
      }));
    },
    revokePendingAttachments() {},
    async upload(attachments: LocalAttachment[]) {
      return await Promise.all(
        attachments.map(async (attachment) => {
          if (attachment.storageId && attachment.uploadStatus === "ready") {
            return {
              storageId: attachment.storageId,
              filename: attachment.filename,
              mediaType: attachment.mediaType,
            };
          }
          return await uploadLocalAttachment(attachment, getUploadUrl);
        }),
      );
    },
  };
}
