import { createFileRoute } from '@tanstack/react-router'
import { useAction, useConvexAuth, useQuery } from 'convex/react'
import { useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import type { Id } from '../../convex/_generated/dataModel'
import { api } from '../../convex/_generated/api'
import { AppSidebar } from '@/components/app-sidebar'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Pencil, Save, Search, Trash2, X } from 'lucide-react'

export const Route = createFileRoute('/memory')({
  component: MemoryPage,
})

type MemoryScope = 'all' | 'user' | 'thread' | 'project'
type EditableScope = Exclude<MemoryScope, 'all'>

type MemoryItem = {
  memoryId: string
  scope: EditableScope
  title: string
  content: string
  category?: string
  tags?: string[]
  source: string
  userId: string
  threadId?: string
  projectId?: string
  originThreadId?: string
  originMessageIds?: string[]
  createdAt: number
  updatedAt: number
}

function MemoryPage() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const [filterScope, setFilterScope] = useState<MemoryScope>('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterThreadId, setFilterThreadId] = useState('all')
  const [filterProjectId, setFilterProjectId] = useState('all')
  const [searchInput, setSearchInput] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<MemoryItem[] | null>(null)
  const [pageError, setPageError] = useState<string | null>(null)

  const [formScope, setFormScope] = useState<EditableScope>('user')
  const [formThreadId, setFormThreadId] = useState('all')
  const [formProjectId, setFormProjectId] = useState('all')
  const [formTitle, setFormTitle] = useState('')
  const [formContent, setFormContent] = useState('')
  const [formCategory, setFormCategory] = useState('')
  const [formTags, setFormTags] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingScope, setEditingScope] = useState<EditableScope | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [editingContent, setEditingContent] = useState('')
  const [editingCategory, setEditingCategory] = useState('')
  const [editingTags, setEditingTags] = useState('')

  const threads = useQuery(api.agents.listThreadsWithMetadata) || []
  const projects = useQuery(api.functions.memory.listProjects) || []
  const userMemories = useQuery(api.functions.memory.listUserMemories, {
    paginationOpts: { cursor: null, numItems: 200 },
    category: filterCategory === 'all' ? undefined : filterCategory,
  })
  const threadMemories = useQuery(api.functions.memory.listThreadMemories, {
    paginationOpts: { cursor: null, numItems: 200 },
    threadId: filterThreadId === 'all' ? undefined : filterThreadId,
    category: filterCategory === 'all' ? undefined : filterCategory,
  })
  const projectMemories = useQuery(api.functions.memory.listProjectMemories, {
    paginationOpts: { cursor: null, numItems: 200 },
    projectId:
      filterProjectId === 'all'
        ? undefined
        : (filterProjectId as Id<'projects'>),
    category: filterCategory === 'all' ? undefined : filterCategory,
  })

  const createUserMemory = useAction(api.functions.memory.createUserMemory)
  const createThreadMemory = useAction(api.functions.memory.createThreadMemory)
  const createProjectMemory = useAction(
    api.functions.memory.createProjectMemory,
  )
  const updateMemory = useAction(api.functions.memory.updateMemory)
  const deleteMemory = useAction(api.functions.memory.deleteMemory)
  const searchMemory = useAction(api.functions.memory.searchMemory)

  const allListedMemories = [
    ...(userMemories?.page ?? []),
    ...(threadMemories?.page ?? []),
    ...(projectMemories?.page ?? []),
  ]
    .slice()
    .sort((a, b) => b.updatedAt - a.updatedAt)

  const visibleMemories =
    searchResults ??
    (filterScope === 'user'
      ? (userMemories?.page ?? [])
      : filterScope === 'thread'
        ? (threadMemories?.page ?? [])
        : filterScope === 'project'
          ? (projectMemories?.page ?? [])
          : allListedMemories)

  const categories = Array.from(
    new Set(
      allListedMemories
        .map((memory) => memory.category)
        .filter((category): category is string => Boolean(category)),
    ),
  ).sort()

  useEffect(() => {
    if (!searchInput.trim()) {
      setSearchResults(null)
      setSearching(false)
    }
  }, [searchInput])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <Loader2 className="size-8 animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        Sign in to manage memory.
      </div>
    )
  }

  async function runSearch() {
    const query = searchInput.trim()
    if (!query) {
      setSearchResults(null)
      return
    }

    setSearching(true)
    setPageError(null)

    try {
      const result = await searchMemory({
        query,
        scope: filterScope,
        threadId:
          filterScope === 'thread' && filterThreadId !== 'all'
            ? filterThreadId
            : undefined,
        projectId:
          filterScope === 'project' && filterProjectId !== 'all'
            ? (filterProjectId as Id<'projects'>)
            : undefined,
        categories: filterCategory === 'all' ? undefined : [filterCategory],
        maxResults: 20,
      })

      setSearchResults(result.hits as MemoryItem[])
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  async function refreshSearchIfNeeded() {
    if (searchInput.trim()) {
      await runSearch()
    }
  }

  function resetCreateForm() {
    setFormTitle('')
    setFormContent('')
    setFormCategory('')
    setFormTags('')
  }

  async function handleCreateMemory() {
    if (!formTitle.trim() || !formContent.trim()) return

    setSubmitting(true)
    setPageError(null)

    try {
      const tags = parseTags(formTags)

      if (formScope === 'user') {
        await createUserMemory({
          title: formTitle,
          content: formContent,
          category: formCategory || undefined,
          tags,
        })
      }

      if (formScope === 'thread') {
        if (formThreadId === 'all') {
          throw new Error('Select a thread for thread-scoped memory')
        }

        await createThreadMemory({
          threadId: formThreadId,
          title: formTitle,
          content: formContent,
          category: formCategory || undefined,
          tags,
        })
      }

      if (formScope === 'project') {
        if (formProjectId === 'all') {
          throw new Error('Select a project for project-scoped memory')
        }

        await createProjectMemory({
          projectId: formProjectId as Id<'projects'>,
          title: formTitle,
          content: formContent,
          category: formCategory || undefined,
          tags,
        })
      }

      resetCreateForm()
      await refreshSearchIfNeeded()
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Create failed')
    } finally {
      setSubmitting(false)
    }
  }

  function startEditing(memory: MemoryItem) {
    setEditingId(memory.memoryId)
    setEditingScope(memory.scope)
    setEditingTitle(memory.title)
    setEditingContent(memory.content)
    setEditingCategory(memory.category ?? '')
    setEditingTags((memory.tags ?? []).join(', '))
  }

  function stopEditing() {
    setEditingId(null)
    setEditingScope(null)
    setEditingTitle('')
    setEditingContent('')
    setEditingCategory('')
    setEditingTags('')
  }

  async function handleSaveEdit() {
    if (!editingId || !editingScope) return

    setSubmitting(true)
    setPageError(null)

    try {
      await updateMemory({
        scope: editingScope,
        userMemoryId:
          editingScope === 'user'
            ? (editingId as Id<'userMemories'>)
            : undefined,
        threadMemoryId:
          editingScope === 'thread'
            ? (editingId as Id<'threadMemories'>)
            : undefined,
        projectMemoryId:
          editingScope === 'project'
            ? (editingId as Id<'projectMemories'>)
            : undefined,
        title: editingTitle,
        content: editingContent,
        category: editingCategory || undefined,
        tags: parseTags(editingTags),
      })
      stopEditing()
      await refreshSearchIfNeeded()
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Update failed')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(memory: MemoryItem) {
    if (!confirm(`Delete "${memory.title}"?`)) return

    setSubmitting(true)
    setPageError(null)

    try {
      await deleteMemory({
        scope: memory.scope,
        userMemoryId:
          memory.scope === 'user'
            ? (memory.memoryId as Id<'userMemories'>)
            : undefined,
        threadMemoryId:
          memory.scope === 'thread'
            ? (memory.memoryId as Id<'threadMemories'>)
            : undefined,
        projectMemoryId:
          memory.scope === 'project'
            ? (memory.memoryId as Id<'projectMemories'>)
            : undefined,
      })
      await refreshSearchIfNeeded()
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Delete failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SidebarProvider className="h-screen">
      <AppSidebar selectedThreadId={null} />

      <SidebarInset className="overflow-hidden">
        <div className="flex h-full flex-col">
          <header className="h-14 border-b border-border flex items-center bg-background/85 backdrop-blur-sm px-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-foreground hover:bg-muted" />
              <div>
                <h1 className="text-sm font-semibold text-foreground">
                  Memory
                </h1>
                <p className="text-xs text-muted-foreground">
                  Manage user, thread, and project memory.
                </p>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.08),transparent_35%),linear-gradient(to_bottom,hsl(var(--background)),hsl(var(--muted)/0.4))]">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 lg:px-6">
              <Card className="border-border/70">
                <CardHeader>
                  <CardTitle>Create Memory</CardTitle>
                  <CardDescription>
                    Manual memories are deduplicated by normalized content and
                    stored in the user RAG namespace.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Scope</label>
                    <Select
                      value={formScope}
                      onValueChange={(value) =>
                        setFormScope(value as EditableScope)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="thread">Thread</SelectItem>
                        <SelectItem value="project">Project</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formScope === 'thread' ? (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Thread</label>
                      <Select
                        value={formThreadId}
                        onValueChange={setFormThreadId}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select thread" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Select thread</SelectItem>
                          {threads.map((thread: any) => (
                            <SelectItem key={thread._id} value={thread._id}>
                              {thread.title || 'Untitled thread'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}

                  {formScope === 'project' ? (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Project</label>
                      <Select
                        value={formProjectId}
                        onValueChange={setFormProjectId}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Select project</SelectItem>
                          {projects.map((project: any) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">Title</label>
                    <Input
                      value={formTitle}
                      onChange={(event) => setFormTitle(event.target.value)}
                      placeholder="Short title"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">Content</label>
                    <Textarea
                      value={formContent}
                      onChange={(event) => setFormContent(event.target.value)}
                      placeholder="What should the system remember?"
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Category</label>
                    <Input
                      value={formCategory}
                      onChange={(event) => setFormCategory(event.target.value)}
                      placeholder="preference, profile, project..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tags</label>
                    <Input
                      value={formTags}
                      onChange={(event) => setFormTags(event.target.value)}
                      placeholder="comma, separated, tags"
                    />
                  </div>
                </CardContent>
                <CardFooter className="justify-between border-t">
                  <p className="text-sm text-muted-foreground">
                    {formScope === 'user'
                      ? 'Stored for the current user.'
                      : formScope === 'thread'
                        ? 'Stored only for the selected thread.'
                        : 'Stored for the selected project.'}
                  </p>
                  <Button
                    onClick={() => void handleCreateMemory()}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : null}
                    Create
                  </Button>
                </CardFooter>
              </Card>

              <Card className="border-border/70">
                <CardHeader>
                  <CardTitle>Browse Memory</CardTitle>
                  <CardDescription>
                    Semantic search uses Convex RAG. Blank search shows the
                    stored list view.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Scope</label>
                    <Select
                      value={filterScope}
                      onValueChange={(value) =>
                        setFilterScope(value as MemoryScope)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="thread">Thread</SelectItem>
                        <SelectItem value="project">Project</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {filterScope === 'thread' ? (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Thread</label>
                      <Select
                        value={filterThreadId}
                        onValueChange={setFilterThreadId}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All threads</SelectItem>
                          {threads.map((thread: any) => (
                            <SelectItem key={thread._id} value={thread._id}>
                              {thread.title || 'Untitled thread'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}

                  {filterScope === 'project' ? (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Project</label>
                      <Select
                        value={filterProjectId}
                        onValueChange={setFilterProjectId}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All projects</SelectItem>
                          {projects.map((project: any) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Category</label>
                    <Select
                      value={filterCategory}
                      onValueChange={setFilterCategory}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All categories</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">Search</label>
                    <div className="flex gap-2">
                      <Input
                        value={searchInput}
                        onChange={(event) => setSearchInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            void runSearch()
                          }
                        }}
                        placeholder="Ask semantically: prefers dark mode, working on auth..."
                      />
                      <Button
                        onClick={() => void runSearch()}
                        disabled={searching}
                      >
                        {searching ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Search className="size-4" />
                        )}
                      </Button>
                      {searchResults ? (
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSearchInput('')
                            setSearchResults(null)
                          }}
                        >
                          Clear
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {pageError ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {pageError}
                </div>
              ) : null}

              <div className="grid gap-4">
                {visibleMemories.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="py-10 text-center text-sm text-muted-foreground">
                      No memories found for the current filters.
                    </CardContent>
                  </Card>
                ) : null}

                {visibleMemories.map((memory: MemoryItem) => {
                  const isEditing =
                    editingId === memory.memoryId &&
                    editingScope === memory.scope

                  return (
                    <Card
                      key={`${memory.scope}:${memory.memoryId}`}
                      className="border-border/70"
                    >
                      <CardHeader>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-2">
                            {isEditing ? (
                              <Input
                                value={editingTitle}
                                onChange={(event) =>
                                  setEditingTitle(event.target.value)
                                }
                              />
                            ) : (
                              <CardTitle>{memory.title}</CardTitle>
                            )}
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="secondary">{memory.scope}</Badge>
                              <Badge variant="outline">{memory.source}</Badge>
                              {memory.category ? (
                                <Badge variant="outline">
                                  {memory.category}
                                </Badge>
                              ) : null}
                              {(memory.tags ?? []).map((tag: string) => (
                                <Badge key={tag} variant="outline">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            {isEditing ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => void handleSaveEdit()}
                                  disabled={submitting}
                                >
                                  <Save className="mr-2 size-4" />
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={stopEditing}
                                >
                                  <X className="mr-2 size-4" />
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => startEditing(memory)}
                                >
                                  <Pencil className="mr-2 size-4" />
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => void handleDelete(memory)}
                                >
                                  <Trash2 className="mr-2 size-4" />
                                  Delete
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        {isEditing ? (
                          <>
                            <Textarea
                              value={editingContent}
                              onChange={(event) =>
                                setEditingContent(event.target.value)
                              }
                              rows={4}
                            />
                            <div className="grid gap-4 md:grid-cols-2">
                              <Input
                                value={editingCategory}
                                onChange={(event) =>
                                  setEditingCategory(event.target.value)
                                }
                                placeholder="Category"
                              />
                              <Input
                                value={editingTags}
                                onChange={(event) =>
                                  setEditingTags(event.target.value)
                                }
                                placeholder="tag1, tag2"
                              />
                            </div>
                          </>
                        ) : (
                          <p className="whitespace-pre-wrap text-sm leading-6 text-foreground/90">
                            {memory.content}
                          </p>
                        )}
                      </CardContent>

                      <CardFooter className="justify-between border-t text-xs text-muted-foreground">
                        <span>
                          Updated{' '}
                          {formatDistanceToNow(new Date(memory.updatedAt), {
                            addSuffix: true,
                          })}
                        </span>
                        <span>
                          {memory.threadId
                            ? threadLabel(threads, memory.threadId)
                            : memory.projectId
                              ? projectLabel(projects, memory.projectId)
                              : 'User memory'}
                        </span>
                      </CardFooter>
                    </Card>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

function parseTags(input: string) {
  const tags = input
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)

  return tags.length > 0 ? tags : undefined
}

function threadLabel(
  threads: Array<{ _id: string; title?: string }>,
  threadId: string,
) {
  return (
    threads.find((thread) => thread._id === threadId)?.title || 'Thread memory'
  )
}

function projectLabel(
  projects: Array<{ id: string; name: string }>,
  projectId: string,
) {
  return (
    projects.find((project) => project.id === projectId)?.name ||
    'Project memory'
  )
}
