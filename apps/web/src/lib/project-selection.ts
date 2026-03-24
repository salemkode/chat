const NEW_CHAT_PROJECT_ID_KEY = 'new-chat-project-id'

export function readPendingNewChatProjectId() {
  if (typeof window === 'undefined') {
    return undefined
  }

  return sessionStorage.getItem(NEW_CHAT_PROJECT_ID_KEY) || undefined
}

export function writePendingNewChatProjectId(projectId?: string) {
  if (typeof window === 'undefined') {
    return
  }

  if (projectId) {
    sessionStorage.setItem(NEW_CHAT_PROJECT_ID_KEY, projectId)
    return
  }

  sessionStorage.removeItem(NEW_CHAT_PROJECT_ID_KEY)
}
