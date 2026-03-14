import { createFileRoute } from '@tanstack/react-router'
import { useAuth } from '@clerk/clerk-react'
import { useAction } from 'convex/react'
import { useReducer } from 'react'
import { formatDistanceToNow } from 'date-fns'
import type { Id } from '../../convex/_generated/dataModel'
import { api } from '../../convex/_generated/api'
import { AppSidebar } from '@/components/app-sidebar'
import { AuthRedirect } from '@/components/auth-redirect'
import { useQuery } from '@/lib/convex-query-cache'
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

type StateUpdate<T> = Partial<T> | ((state: T) => T)

type MemoryFilterState = {
  scope: MemoryScope
  category: string
  threadId: string
  projectId: string
}

type MemorySearchState = {
  input: string
  searching: boolean
  results: MemoryItem[] | null
}

type MemoryRequestState = {
  pageError: string | null
  submitting: boolean
}

type MemoryCreateFormState = {
  scope: EditableScope
  threadId: string
  projectId: string
  title: string
  content: string
  category: string
  tags: string
}

type MemoryEditState = {
  id: string | null
  scope: EditableScope | null
  title: string
  content: string
  category: string
  tags: string
}

const initialFilterState: MemoryFilterState = {
  scope: 'all',
  category: 'all',
  threadId: 'all',
  projectId: 'all',
}

const initialSearchState: MemorySearchState = {
  input: '',
  searching: false,
  results: null,
}

const initialRequestState: MemoryRequestState = {
  pageError: null,
  submitting: false,
}

const initialCreateFormState: MemoryCreateFormState = {
  scope: 'user',
  threadId: 'all',
  projectId: 'all',
  title: '',
  content: '',
  category: '',
  tags: '',
}

const initialEditState: MemoryEditState = {
  id: null,
  scope: null,
  title: '',
  content: '',
  category: '',
  tags: '',
}

function mergeReducer<T extends object>(state: T, action: StateUpdate<T>) {
  return typeof action === 'function' ? action(state) : { ...state, ...action }
}

function MemoryPage() {
  "use no memo"

  const { isLoaded, isSignedIn } = useAuth()
  const isAuthenticated = isSignedIn ?? false
  const isLoading = !isLoaded
  const [filters, updateFilters] = useReducer(
    mergeReducer<MemoryFilterState>,
    initialFilterState,
  )
  const [searchState, updateSearchState] = useReducer(
    mergeReducer<MemorySearchState>,
    initialSearchState,
  )
  const [requestState, updateRequestState] = useReducer(
    mergeReducer<MemoryRequestState>,
    initialRequestState,
  )
  const [createForm, updateCreateForm] = useReducer(
    mergeReducer<MemoryCreateFormState>,
    initialCreateFormState,
  )
  const [editState, updateEditState] = useReducer(
    mergeReducer<MemoryEditState>,
    initialEditState,
  )

  const threads = useQuery(api.agents.listThreadsWithMetadata) || []
  const projects = useQuery(api.functions.memory.listProjects) || []
  const userMemories = useQuery(api.functions.memory.listUserMemories, {
    paginationOpts: { cursor: null, numItems: 200 },
    category: filters.category === 'all' ? undefined : filters.category,
  })
  const threadMemories = useQuery(api.functions.memory.listThreadMemories, {
    paginationOpts: { cursor: null, numItems: 200 },
    threadId: filters.threadId === 'all' ? undefined : filters.threadId,
    category: filters.category === 'all' ? undefined : filters.category,
  })
  const projectMemories = useQuery(api.functions.memory.listProjectMemories, {
    paginationOpts: { cursor: null, numItems: 200 },
    projectId:
      filters.projectId === 'all'
        ? undefined
        : (filters.projectId as Id<'projects'>),
    category: filters.category === 'all' ? undefined : filters.category,
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
    searchState.results ??
    (filters.scope === 'user'
      ? (userMemories?.page ?? [])
      : filters.scope === 'thread'
        ? (threadMemories?.page ?? [])
        : filters.scope === 'project'
          ? (projectMemories?.page ?? [])
          : allListedMemories)

  const categories = Array.from(
    new Set(
      allListedMemories
        .map((memory) => memory.category)
        .filter((category): category is string => Boolean(category)),
    ),
  ).sort()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <Loader2 className="size-8 animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <AuthRedirect />
  }

  function runSearch() {
    const query = searchState.input.trim()
    if (!query) {
      updateSearchState({ results: null })
      return
    }

    updateSearchState({ searching: true })
    updateRequestState({ pageError: null })

    return searchMemory({
        query,
        scope: filters.scope,
        threadId:
          filters.scope === 'thread' && filters.threadId !== 'all'
            ? filters.threadId
            : undefined,
        projectId:
          filters.scope === 'project' && filters.projectId !== 'all'
            ? (filters.projectId as Id<'projects'>)
            : undefined,
        categories:
          filters.category === 'all' ? undefined : [filters.category],
        maxResults: 20,
      })
      .then((result) => {
        updateSearchState({ results: result.hits as MemoryItem[] })
      })
      .catch((error) => {
        updateRequestState({
          pageError: error instanceof Error ? error.message : 'Search failed',
        })
      })
      .finally(() => {
        updateSearchState({ searching: false })
      })
  }

  async function refreshSearchIfNeeded() {
    if (searchState.input.trim()) {
      await runSearch()
    }
  }

  function resetCreateForm() {
    updateCreateForm((current) => ({
      ...current,
      title: '',
      content: '',
      category: '',
      tags: '',
    }))
  }

  function handleCreateMemory() {
    if (!createForm.title.trim() || !createForm.content.trim()) return

    updateRequestState({ submitting: true, pageError: null })

    const tags = parseTags(createForm.tags)

    if (createForm.scope === 'thread' && createForm.threadId === 'all') {
      updateRequestState({
        pageError: 'Select a thread for thread-scoped memory',
        submitting: false,
      })
      return
    }

    if (createForm.scope === 'project' && createForm.projectId === 'all') {
      updateRequestState({
        pageError: 'Select a project for project-scoped memory',
        submitting: false,
      })
      return
    }

    const request =
      createForm.scope === 'user'
        ? createUserMemory({
            title: createForm.title,
            content: createForm.content,
            category: createForm.category || undefined,
            tags,
          })
        : createForm.scope === 'thread'
          ? createThreadMemory({
              threadId: createForm.threadId,
              title: createForm.title,
              content: createForm.content,
              category: createForm.category || undefined,
              tags,
            })
          : createProjectMemory({
              projectId: createForm.projectId as Id<'projects'>,
              title: createForm.title,
              content: createForm.content,
              category: createForm.category || undefined,
              tags,
            })

    return request
      .then(() => {
        resetCreateForm()
        return refreshSearchIfNeeded()
      })
      .catch((error) => {
        updateRequestState({
          pageError: error instanceof Error ? error.message : 'Create failed',
        })
      })
      .finally(() => {
        updateRequestState({ submitting: false })
      })
  }

  function startEditing(memory: MemoryItem) {
    updateEditState({
      id: memory.memoryId,
      scope: memory.scope,
      title: memory.title,
      content: memory.content,
      category: memory.category ?? '',
      tags: (memory.tags ?? []).join(', '),
    })
  }

  function stopEditing() {
    updateEditState(initialEditState)
  }

  function handleSaveEdit() {
    if (!editState.id || !editState.scope) return

    updateRequestState({ submitting: true, pageError: null })

    return updateMemory({
        scope: editState.scope,
        userMemoryId:
          editState.scope === 'user'
            ? (editState.id as Id<'userMemories'>)
            : undefined,
        threadMemoryId:
          editState.scope === 'thread'
            ? (editState.id as Id<'threadMemories'>)
            : undefined,
        projectMemoryId:
          editState.scope === 'project'
            ? (editState.id as Id<'projectMemories'>)
            : undefined,
        title: editState.title,
        content: editState.content,
        category: editState.category || undefined,
        tags: parseTags(editState.tags),
      })
      .then(() => {
        stopEditing()
        return refreshSearchIfNeeded()
      })
      .catch((error) => {
        updateRequestState({
          pageError: error instanceof Error ? error.message : 'Update failed',
        })
      })
      .finally(() => {
        updateRequestState({ submitting: false })
      })
  }

  function handleDelete(memory: MemoryItem) {
    if (!confirm(`Delete "${memory.title}"?`)) return

    updateRequestState({ submitting: true, pageError: null })

    return deleteMemory({
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
      .then(() => refreshSearchIfNeeded())
      .catch((error) => {
        updateRequestState({
          pageError: error instanceof Error ? error.message : 'Delete failed',
        })
      })
      .finally(() => {
        updateRequestState({ submitting: false })
      })
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
                      value={createForm.scope}
                      onValueChange={(value) =>
                        updateCreateForm({ scope: value as EditableScope })
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

                  {createForm.scope === 'thread' ? (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Thread</label>
                      <Select
                        value={createForm.threadId}
                        onValueChange={(threadId) =>
                          updateCreateForm({ threadId })
                        }
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

                  {createForm.scope === 'project' ? (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Project</label>
                      <Select
                        value={createForm.projectId}
                        onValueChange={(projectId) =>
                          updateCreateForm({ projectId })
                        }
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
                      value={createForm.title}
                      onChange={(event) =>
                        updateCreateForm({ title: event.target.value })
                      }
                      placeholder="Short title"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">Content</label>
                    <Textarea
                      value={createForm.content}
                      onChange={(event) =>
                        updateCreateForm({ content: event.target.value })
                      }
                      placeholder="What should the system remember?"
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Category</label>
                    <Input
                      value={createForm.category}
                      onChange={(event) =>
                        updateCreateForm({ category: event.target.value })
                      }
                      placeholder="preference, profile, project..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tags</label>
                    <Input
                      value={createForm.tags}
                      onChange={(event) =>
                        updateCreateForm({ tags: event.target.value })
                      }
                      placeholder="comma, separated, tags"
                    />
                  </div>
                </CardContent>
                <CardFooter className="justify-between border-t">
                  <p className="text-sm text-muted-foreground">
                    {createForm.scope === 'user'
                      ? 'Stored for the current user.'
                      : createForm.scope === 'thread'
                        ? 'Stored only for the selected thread.'
                        : 'Stored for the selected project.'}
                  </p>
                  <Button
                    onClick={() => void handleCreateMemory()}
                    disabled={requestState.submitting}
                  >
                    {requestState.submitting ? (
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
                      value={filters.scope}
                      onValueChange={(value) =>
                        updateFilters({ scope: value as MemoryScope })
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

                  {filters.scope === 'thread' ? (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Thread</label>
                      <Select
                        value={filters.threadId}
                        onValueChange={(threadId) =>
                          updateFilters({ threadId })
                        }
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

                  {filters.scope === 'project' ? (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Project</label>
                      <Select
                        value={filters.projectId}
                        onValueChange={(projectId) =>
                          updateFilters({ projectId })
                        }
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
                      value={filters.category}
                      onValueChange={(category) =>
                        updateFilters({ category })
                      }
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
                        value={searchState.input}
                        onChange={(event) => {
                          const nextValue = event.target.value
                          updateSearchState({ input: nextValue })
                          if (!nextValue.trim()) {
                            updateSearchState({
                              searching: false,
                              results: null,
                            })
                          }
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            void runSearch()
                          }
                        }}
                        placeholder="Ask semantically: prefers dark mode, working on auth..."
                      />
                      <Button
                        onClick={() => void runSearch()}
                        disabled={searchState.searching}
                      >
                        {searchState.searching ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Search className="size-4" />
                        )}
                      </Button>
                      {searchState.results ? (
                        <Button
                          variant="outline"
                          onClick={() => {
                            updateSearchState({
                              input: '',
                              results: null,
                              searching: false,
                            })
                          }}
                        >
                          Clear
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {requestState.pageError ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {requestState.pageError}
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
                    editState.id === memory.memoryId &&
                    editState.scope === memory.scope

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
                                value={editState.title}
                                onChange={(event) =>
                                  updateEditState({
                                    title: event.target.value,
                                  })
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
                                  disabled={requestState.submitting}
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
                              value={editState.content}
                              onChange={(event) =>
                                updateEditState({
                                  content: event.target.value,
                                })
                              }
                              rows={4}
                            />
                            <div className="grid gap-4 md:grid-cols-2">
                              <Input
                                value={editState.category}
                                onChange={(event) =>
                                  updateEditState({
                                    category: event.target.value,
                                  })
                                }
                                placeholder="Category"
                              />
                              <Input
                                value={editState.tags}
                                onChange={(event) =>
                                  updateEditState({ tags: event.target.value })
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
