import type { ChatMessage, ProjectSummary, ThreadSummary } from './types'

export interface StorageAdapter {
  readDraft(threadId: string): string
  writeDraft(threadId: string, value: string): void
  readCachedThreads(userId: string): ThreadSummary[] | null
  writeCachedThreads(userId: string, threads: ThreadSummary[]): void
  readCachedProjects(userId: string): ProjectSummary[] | null
  writeCachedProjects(userId: string, projects: ProjectSummary[]): void
  readCachedMessages(userId: string, threadId: string): ChatMessage[] | null
  writeCachedMessages(userId: string, threadId: string, messages: ChatMessage[]): void
  getCacheVersion(): number
  subscribeToCacheChanges(callback: () => void): () => void
}

export interface AttachmentAdapter<T = unknown> {
  createPendingAttachments(
    files: T[],
  ): Array<{ filename: string; mediaType: string; url: string }>
  revokePendingAttachments(attachments: Array<{ url: string }>): void
  upload(
    files: T[],
    getUploadUrl: () => Promise<string>,
  ): Promise<Array<{ storageId: string; filename: string; mediaType: string }>>
}

export interface EventsAdapter {
  dispatchStreamResume(threadId: string): void
  dispatchFollowLatest(threadId: string): void
  onStreamResume(threadId: string, callback: () => void): () => void
}
