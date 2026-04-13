import { useMemo, useState } from 'react'
import { generatePath, useNavigate, useParams } from 'react-router'
import { useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useQuery } from '@/lib/convex-query-cache'
import { parseUploadResponse } from '@/lib/parsers'
import { writePendingNewChatProjectId } from '@/lib/project-selection'

type SourceProvider = 'github' | 'gmail' | 'manual'
type SourceKind = 'github_repo' | 'gmail_query' | 'manual_uploads' | 'manual_links'

export default function ProjectWorkspacePage() {
  const { projectId: rawProjectId = '' } = useParams()
  const projectId = rawProjectId as Id<'projects'>
  const navigate = useNavigate()

  const projectContextApi = (
    api as typeof api & {
      projectContext: {
        getProjectWorkspace: unknown
        listProjectSources: unknown
        createGithubRepoSource: unknown
        createGmailQuerySource: unknown
        createManualLinkArtifact: unknown
        listProjectArtifacts: unknown
        updateProjectArtifact: unknown
        generateProjectUploadUrl: unknown
        createUploadedArtifact: unknown
        syncProjectSourceNow: unknown
      }
      integrations: {
        listConnections: unknown
        getOAuthStartUrl: unknown
      }
      projectMembers: {
        listProjectMembers: unknown
      }
      projects: {
        listThreadsByProject: unknown
      }
    }
  ).projectContext
  const integrationsApi = (
    api as typeof api & {
      integrations: {
        listConnections: unknown
        getOAuthStartUrl: unknown
      }
    }
  ).integrations
  const projectMembersApi = (
    api as typeof api & {
      projectMembers: {
        listProjectMembers: unknown
      }
    }
  ).projectMembers
  const projectsApi = (
    api as typeof api & {
      projects: {
        listThreadsByProject: unknown
      }
    }
  ).projects

  const workspace = useQuery(
    projectContextApi.getProjectWorkspace as never,
    projectId ? ({ projectId } as never) : 'skip',
  ) as
    | {
        id: string
        name: string
        description?: string
        visibility: 'private' | 'shared'
        role: 'owner' | 'editor' | 'viewer'
        createdAt: number
        updatedAt: number
        counts: {
          chats: number
          sources: number
          artifacts: number
          members: number
        }
      }
    | null
    | undefined

  const sources = (useQuery(
    projectContextApi.listProjectSources as never,
    projectId ? ({ projectId } as never) : 'skip',
  ) ?? []) as Array<{
    id: string
    provider: SourceProvider
    kind: SourceKind
    title: string
    status: 'active' | 'paused' | 'error'
    syncMode: 'rule' | 'manual'
    connectionId?: string
    lastSyncedAt?: number
    lastError?: string
    config?: unknown
  }>

  const artifacts = (useQuery(
    projectContextApi.listProjectArtifacts as never,
    projectId ? ({ projectId } as never) : 'skip',
  ) ?? []) as Array<{
    id: string
    sourceId: string
    provider: SourceProvider
    kind: string
    title: string
    url?: string
    includeInContext: boolean
    pinned: boolean
    status: 'active' | 'archived' | 'error'
    extractionStatus?: 'pending' | 'ready' | 'error'
    extractionError?: string
    updatedAt: number
  }>

  const connections = (useQuery(integrationsApi.listConnections as never) ?? []) as Array<{
    id: string
    provider: 'github' | 'google'
    accountLabel: string
    status: 'active' | 'expired' | 'revoked' | 'error'
  }>

  const members = (useQuery(
    projectMembersApi.listProjectMembers as never,
    projectId ? ({ projectId } as never) : 'skip',
  ) ?? []) as Array<{
    id: string
    userId: string
    role: 'owner' | 'editor' | 'viewer'
  }>

  const threads = (useQuery(
    projectsApi.listThreadsByProject as never,
    projectId ? ({ projectId } as never) : 'skip',
  ) ?? []) as Array<{
    _id: string
    title?: string
    _creationTime: number
  }>

  const createGithubRepoSource = useMutation(projectContextApi.createGithubRepoSource as never)
  const createGmailQuerySource = useMutation(projectContextApi.createGmailQuerySource as never)
  const createManualLinkArtifact = useMutation(projectContextApi.createManualLinkArtifact as never)
  const updateProjectArtifact = useMutation(projectContextApi.updateProjectArtifact as never)
  const syncProjectSourceNow = useMutation(projectContextApi.syncProjectSourceNow as never)
  const generateProjectUploadUrl = useMutation(projectContextApi.generateProjectUploadUrl as never)
  const createUploadedArtifact = useMutation(projectContextApi.createUploadedArtifact as never)
  const getOAuthStartUrl = useMutation(integrationsApi.getOAuthStartUrl as never)

  const [manualLink, setManualLink] = useState('')
  const [manualLinkTitle, setManualLinkTitle] = useState('')
  const [githubOwner, setGithubOwner] = useState('')
  const [githubRepo, setGithubRepo] = useState('')
  const [gmailQuery, setGmailQuery] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [isWorking, setIsWorking] = useState(false)

  const githubConnections = useMemo(
    () => connections.filter((connection) => connection.provider === 'github'),
    [connections],
  )
  const googleConnections = useMemo(
    () => connections.filter((connection) => connection.provider === 'google'),
    [connections],
  )

  if (!projectId) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Missing project ID.
      </div>
    )
  }

  if (workspace === undefined) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading project workspace...
      </div>
    )
  }

  if (!workspace) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Project not found.
      </div>
    )
  }

  async function handleConnect(provider: 'github' | 'google') {
    setActionError(null)
    try {
      const result = (await getOAuthStartUrl({
        provider,
        projectId,
        redirectTo: `/projects/${projectId}`,
      } as never)) as { url: string }
      window.location.assign(result.url)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to start OAuth flow')
    }
  }

  async function handleAddGithubSource() {
    const connectionId = githubConnections[0]?.id
    if (!connectionId) {
      setActionError('Connect a GitHub account first.')
      return
    }
    if (!githubOwner.trim() || !githubRepo.trim()) {
      setActionError('GitHub owner and repo are required.')
      return
    }

    setIsWorking(true)
    setActionError(null)
    try {
      await createGithubRepoSource({
        projectId,
        connectionId: connectionId as Id<'integrationConnections'>,
        config: {
          owner: githubOwner.trim(),
          repo: githubRepo.trim(),
          includePullRequests: true,
          includeIssues: true,
          includePathGlobs: [],
          recentDays: 30,
        },
      } as never)
      setGithubOwner('')
      setGithubRepo('')
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to add GitHub source')
    } finally {
      setIsWorking(false)
    }
  }

  async function handleAddGmailSource() {
    const connectionId = googleConnections[0]?.id
    if (!connectionId) {
      setActionError('Connect a Google account first.')
      return
    }
    if (!gmailQuery.trim()) {
      setActionError('Gmail query is required.')
      return
    }

    setIsWorking(true)
    setActionError(null)
    try {
      await createGmailQuerySource({
        projectId,
        connectionId: connectionId as Id<'integrationConnections'>,
        config: {
          query: gmailQuery.trim(),
          maxThreads: 100,
          includeBody: true,
        },
      } as never)
      setGmailQuery('')
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to add Gmail source')
    } finally {
      setIsWorking(false)
    }
  }

  async function handleAddManualLink() {
    if (!manualLink.trim()) {
      setActionError('A URL is required.')
      return
    }

    setIsWorking(true)
    setActionError(null)
    try {
      await createManualLinkArtifact({
        projectId,
        url: manualLink.trim(),
        title: manualLinkTitle.trim() || undefined,
      } as never)
      setManualLink('')
      setManualLinkTitle('')
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to add manual link')
    } finally {
      setIsWorking(false)
    }
  }

  async function handleUploadFiles(files: FileList | null) {
    if (!files || files.length === 0) {
      return
    }

    setIsWorking(true)
    setActionError(null)
    try {
      const uploadUrl = (await generateProjectUploadUrl({ projectId } as never)) as string
      for (const file of Array.from(files)) {
        const response = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Content-Type': file.type || 'application/octet-stream',
          },
          body: file,
        })
        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`)
        }
        const payload = parseUploadResponse(await response.json())
        await createUploadedArtifact({
          projectId,
          storageId: payload.storageId as Id<'_storage'>,
          filename: file.name,
          mediaType: file.type || undefined,
        } as never)
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'File upload failed')
    } finally {
      setIsWorking(false)
    }
  }

  async function handleToggleArtifact(
    artifactId: string,
    patch: { includeInContext?: boolean; pinned?: boolean },
  ) {
    setActionError(null)
    try {
      await updateProjectArtifact({
        projectId,
        artifactId: artifactId as Id<'projectArtifacts'>,
        ...patch,
      } as never)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to update artifact')
    }
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-4 px-4 py-4">
      <Card className="gap-3 py-4">
        <CardHeader className="px-5">
          <CardTitle className="flex items-center gap-2 text-lg">
            {workspace.name}
            <Badge variant="secondary">{workspace.role}</Badge>
            <Badge variant="outline">{workspace.visibility}</Badge>
          </CardTitle>
          <CardDescription>
            {workspace.description || 'No project description yet.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 px-5 text-sm sm:grid-cols-4">
          <Metric label="Chats" value={workspace.counts.chats} />
          <Metric label="Sources" value={workspace.counts.sources} />
          <Metric label="Artifacts" value={workspace.counts.artifacts} />
          <Metric label="Members" value={Math.max(workspace.counts.members, members.length || 1)} />
        </CardContent>
      </Card>

      {actionError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {actionError}
        </div>
      ) : null}

      <Tabs defaultValue="overview" className="min-h-0 flex-1">
        <TabsList className="w-full justify-start sm:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sources">Sources</TabsTrigger>
          <TabsTrigger value="artifacts">Artifacts</TabsTrigger>
          <TabsTrigger value="chats">Chats</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Project Context Status</CardTitle>
              <CardDescription>
                Personal-first context workspace with collaboration-ready ownership.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Connected sources: {sources.length}</p>
              <p>Artifacts indexed: {artifacts.length}</p>
              <p>Project members: {Math.max(members.length, 1)}</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Connections</CardTitle>
              <CardDescription>Connect external providers for project sync.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isWorking}
                onClick={() => void handleConnect('github')}
              >
                Connect GitHub
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isWorking}
                onClick={() => void handleConnect('google')}
              >
                Connect Google
              </Button>
              {connections.map((connection) => (
                <Badge key={connection.id} variant="secondary">
                  {connection.provider}: {connection.accountLabel} ({connection.status})
                </Badge>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>GitHub Repo Source</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <Input
                value={githubOwner}
                onChange={(event) => setGithubOwner(event.target.value)}
                placeholder="owner"
              />
              <Input
                value={githubRepo}
                onChange={(event) => setGithubRepo(event.target.value)}
                placeholder="repo"
              />
              <Button
                type="button"
                disabled={isWorking}
                onClick={() => void handleAddGithubSource()}
              >
                Add Source
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Gmail Query Source</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <Input
                value={gmailQuery}
                onChange={(event) => setGmailQuery(event.target.value)}
                placeholder='from:client@example.com OR "project keyword"'
              />
              <Button
                type="button"
                disabled={isWorking}
                onClick={() => void handleAddGmailSource()}
              >
                Add Source
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Current Sources</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {sources.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sources yet.</p>
              ) : (
                sources.map((source) => (
                  <div
                    key={source.id}
                    className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2"
                  >
                    <Badge variant="secondary">{source.provider}</Badge>
                    <Badge variant="outline">{source.kind}</Badge>
                    <span className="text-sm">{source.title}</span>
                    <Badge variant="outline">{source.status}</Badge>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        void syncProjectSourceNow({
                          projectId,
                          sourceId: source.id as Id<'projectSources'>,
                        } as never)
                      }
                    >
                      Sync now
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="artifacts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Manual Link Artifact</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <Input
                value={manualLink}
                onChange={(event) => setManualLink(event.target.value)}
                placeholder="https://..."
              />
              <Input
                value={manualLinkTitle}
                onChange={(event) => setManualLinkTitle(event.target.value)}
                placeholder="Optional title"
              />
              <Button type="button" disabled={isWorking} onClick={() => void handleAddManualLink()}>
                Add Link
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upload Docs</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                type="file"
                multiple
                onChange={(event) => void handleUploadFiles(event.target.files)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Artifacts</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Artifact</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Context</TableHead>
                    <TableHead>Pin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {artifacts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-muted-foreground">
                        No artifacts yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    artifacts.map((artifact) => (
                      <TableRow key={artifact.id}>
                        <TableCell>
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate">{artifact.title}</span>
                            {artifact.url ? (
                              <a
                                className="truncate text-xs text-primary"
                                href={artifact.url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {artifact.url}
                              </a>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{artifact.kind}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge variant="secondary">{artifact.status}</Badge>
                            {artifact.extractionStatus ? (
                              <span className="text-xs text-muted-foreground">
                                {artifact.extractionStatus}
                              </span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            size="sm"
                            variant={artifact.includeInContext ? 'default' : 'outline'}
                            onClick={() =>
                              void handleToggleArtifact(artifact.id, {
                                includeInContext: !artifact.includeInContext,
                              })
                            }
                          >
                            {artifact.includeInContext ? 'Included' : 'Include'}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            size="sm"
                            variant={artifact.pinned ? 'default' : 'outline'}
                            onClick={() =>
                              void handleToggleArtifact(artifact.id, {
                                pinned: !artifact.pinned,
                              })
                            }
                          >
                            {artifact.pinned ? 'Pinned' : 'Pin'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chats" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Project Chats</CardTitle>
              <CardDescription>
                Every chat in this project inherits project memories and artifacts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                type="button"
                onClick={() => {
                  writePendingNewChatProjectId(projectId)
                  void navigate('/')
                }}
              >
                New Chat In Project
              </Button>
              {threads.length === 0 ? (
                <p className="text-sm text-muted-foreground">No chats in this project yet.</p>
              ) : (
                threads.map((thread) => (
                  <button
                    type="button"
                    key={thread._id}
                    className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left hover:bg-muted/40"
                    onClick={() => void navigate(generatePath('/:chatId', { chatId: thread._id }))}
                  >
                    <span className="truncate">{thread.title || 'Untitled chat'}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(thread._creationTime).toLocaleDateString()}
                    </span>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold text-foreground">{value}</div>
    </div>
  )
}
