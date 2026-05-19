export const CHAT_STREAM_RESUME_EVENT = 'chat-stream:resume'
export const CHAT_FOLLOW_LATEST_EVENT = 'chat-follow-latest'
export const CHAT_COMPOSER_ERROR_EVENT = 'chat-composer:error'

export type ChatComposerErrorDetail = {
  message: string
}

export function dispatchComposerError(message: string) {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(
    new CustomEvent<ChatComposerErrorDetail>(CHAT_COMPOSER_ERROR_EVENT, {
      detail: { message },
    }),
  )
}

export function dispatchChatEvent(eventName: string, detail: { threadId?: string }) {
  if (typeof window === 'undefined' || !detail.threadId) {
    return
  }

  window.dispatchEvent(new CustomEvent(eventName, { detail }))
}
