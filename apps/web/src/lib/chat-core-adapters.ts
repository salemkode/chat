import type { StorageAdapter, AttachmentAdapter, EventsAdapter } from '@chat/chat-core/adapters'
import type { ChatMessage, ProjectSummary } from '@chat/chat-core/types'
import { CHAT_STREAM_RESUME_EVENT, CHAT_FOLLOW_LATEST_EVENT, dispatchChatEvent } from '@/lib/chat-events'
import { parseUploadResponse } from '@/lib/parsers'
import type { Id } from '@convex/_generated/dataModel'
import {
  readThreadsCache,
  writeThreadsCache,
  readMessagesCache,
  readProjectsCache,
  writeProjectsCache,
} from '@/offline/local-cache'
import { cacheMessagesToLocal } from '@/hooks/chat-data/shared'

export function createWebStorageAdapter(): StorageAdapter {
  let cacheVersion = 0
  const listeners = new Set<() => void>()

  function notify() {
    cacheVersion += 1
    listeners.forEach((cb) => cb())
  }

  return {
    readDraft(threadId: string) {
      if (typeof window === 'undefined') return ''
      return localStorage.getItem(`chat-draft:${threadId}`) || ''
    },

    writeDraft(threadId: string, value: string) {
      if (typeof window === 'undefined') return
      const key = `chat-draft:${threadId}`
      if (value) {
        localStorage.setItem(key, value)
      } else {
        localStorage.removeItem(key)
      }
    },

    readCachedThreads(userId: string) {
      return readThreadsCache(userId)
    },

    writeCachedThreads(userId: string, threads) {
      writeThreadsCache(userId, threads)
      notify()
    },

    readCachedProjects(userId: string) {
      return readProjectsCache<ProjectSummary[]>(userId)
    },

    writeCachedProjects(userId: string, projects: ProjectSummary[]) {
      writeProjectsCache(userId, projects)
      notify()
    },

    readCachedMessages(userId: string, threadId: string) {
      return readMessagesCache(userId, threadId)
    },

    writeCachedMessages(userId: string, threadId: string, messages: ChatMessage[]) {
      cacheMessagesToLocal(userId, threadId, messages)
      notify()
    },

    getCacheVersion() {
      return cacheVersion
    },

    subscribeToCacheChanges(callback: () => void) {
      listeners.add(callback)
      return () => {
        listeners.delete(callback)
      }
    },
  }
}

export function createWebAttachmentAdapter(): AttachmentAdapter<File> {
  return {
    createPendingAttachments(files: File[]) {
      return files.map((file) => ({
        filename: file.name,
        mediaType: file.type || 'application/octet-stream',
        url: URL.createObjectURL(file),
      }))
    },

    revokePendingAttachments(attachments: Array<{ url: string }>) {
      for (const attachment of attachments) {
        URL.revokeObjectURL(attachment.url)
      }
    },

    async upload(files: File[], getUploadUrl: () => Promise<string>) {
      return await Promise.all(
        files.map(async (file) => {
          const uploadUrl = await getUploadUrl()
          const response = await fetch(uploadUrl, {
            method: 'POST',
            headers: { 'Content-Type': file.type },
            body: file,
          })

          if (!response.ok) {
            throw new Error(`Failed to upload ${file.name}`)
          }

          const payload = parseUploadResponse(await response.json())
          return {
            storageId: payload.storageId as Id<'_storage'>,
            filename: file.name,
            mediaType: file.type,
          }
        }),
      )
    },
  }
}

export function createWebEventsAdapter(): EventsAdapter {
  return {
    dispatchStreamResume(threadId: string) {
      dispatchChatEvent(CHAT_STREAM_RESUME_EVENT, { threadId })
    },

    dispatchFollowLatest(threadId: string) {
      dispatchChatEvent(CHAT_FOLLOW_LATEST_EVENT, { threadId })
    },

    onStreamResume(threadId: string, callback: () => void) {
      if (typeof window === 'undefined') return () => {}

      const handler = (event: Event) => {
        const customEvent = event as CustomEvent<{ threadId?: string }>
        if (customEvent.detail?.threadId === threadId) {
          callback()
        }
      }
      window.addEventListener(CHAT_STREAM_RESUME_EVENT, handler)
      return () => window.removeEventListener(CHAT_STREAM_RESUME_EVENT, handler)
    },
  }
}
