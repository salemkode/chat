export type ProjectSummary = {
  id: string
  name: string
  description?: string
  visibility?: string
  role?: string
  threadCount: number
  createdAt: number
  updatedAt: number
}

export type ThreadSummary = {
  id: string
  title?: string
  emoji: string
  icon?: string
  projectId?: string
  projectName?: string
  sortOrder: number
  pinned: boolean
  lastMessageAt: number
  createdAt?: number
}

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
  parts: Array<Record<string, unknown>>
  status: 'success' | 'streaming' | 'pending' | 'failed'
  order?: number
  stepOrder?: number
  createdAt?: number
  failureKind?: 'stopped' | 'error'
  failureMode?: 'replace' | 'clarify'
  failureNote?: string
  localOnly?: boolean
  clientSendId?: string
}
