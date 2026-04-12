export type ProjectRole = 'owner' | 'editor' | 'viewer'

export type ProjectVisibility = 'private' | 'shared'

export type ProjectSourceProvider = 'github' | 'gmail' | 'manual'

export type ProjectSourceKind =
  | 'github_repo'
  | 'gmail_query'
  | 'manual_uploads'
  | 'manual_links'

export type ProjectArtifactKind =
  | 'repo_file'
  | 'pull_request'
  | 'issue'
  | 'commit'
  | 'email_thread'
  | 'email_message'
  | 'email_attachment'
  | 'uploaded_file'
  | 'external_link'

export type ProjectArtifactSummary = {
  id: string
  projectId: string
  sourceId: string
  provider: ProjectSourceProvider
  kind: ProjectArtifactKind
  title: string
  subtitle?: string
  url?: string
  mimeType?: string
  includeInContext: boolean
  pinned: boolean
  status: 'active' | 'archived' | 'error'
  updatedAt: number
}

export type ProjectWorkspaceRecord = {
  id: string
  name: string
  description?: string
  visibility: ProjectVisibility
  role: ProjectRole
  createdAt: number
  updatedAt: number
  counts: {
    chats: number
    sources: number
    artifacts: number
    members: number
  }
}

export type ProjectArtifactMentionOption = {
  id: string
  title: string
  kind: ProjectArtifactKind
  provider: ProjectSourceProvider
  subtitle?: string
  url?: string
}
