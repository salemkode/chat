export type ChatRenderableAttachment = {
  kind: 'image' | 'file'
  url: string
  mediaType: string
  filename?: string
}

export type ChatScreenMode = 'new' | 'existing' | 'custom'

export type ChatRenderableMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
  attachments?: ChatRenderableAttachment[]
  status?: 'success' | 'streaming' | 'failed' | 'pending'
  createdAt?: number
  order?: number
  local?: boolean
  requestId?: string
  errorText?: string
  replayable?: boolean
}

export type LocalAttachment = {
  uri: string
  name: string
  mimeType: string
  width?: number
  height?: number
  sizeBytes?: number
}
