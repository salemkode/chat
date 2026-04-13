'use client'

import * as React from 'react'
import { useUser } from '@clerk/react-router'
import { generatePath, useNavigate } from 'react-router'
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  LogIn,
  Plus,
  Settings,
  User,
} from '@/lib/icons'
import { cn } from '@/lib/utils'
import { groupThreadsByProject } from '@/lib/project-sidebar'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { SettingsDialog } from '@/components/settings-dialog'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { useProjects, useThreads, useViewer } from '@/hooks/use-chat-data'
import { writePendingNewChatProjectId } from '@/lib/project-selection'
import { SidebarSearchDialog } from '@/components/sidebar/sidebar-search-dialog'
import { AnimatedThreadList, ThreadRow } from '@/components/sidebar/thread-list'
import { useHotkeyAction } from '@/components/hotkeys-provider'
import {
  ProjectCreateDialog,
  ProjectDraftState,
  RemoveFromProjectDialog,
  RemoveFromProjectState,
} from '@/components/sidebar/project-dialogs'
import { consumeSettingsTabIntent, type SettingsTab } from '@/lib/settings-navigation'

interface AppSidebarProps {
  selectedThreadId?: string | null
  className?: string
}

export function AppSidebar({ selectedThreadId, className }: AppSidebarProps) {
  const navigate = useNavigate()
  const [settingsOpen, setSettingsOpen] = React.useState(false)
  const [settingsTab, setSettingsTab] = React.useState<SettingsTab>('general')
  const [projectDialog, setProjectDialog] = React.useState<ProjectDraftState | null>(null)
  const [removeFromProjectDialog, setRemoveFromProjectDialog] =
    React.useState<RemoveFromProjectState | null>(null)
  const [expandedProjectIds, setExpandedProjectIds] = React.useState<Record<string, boolean>>({})

  const { threads, setPinned } = useThreads()
  const { projects, createProject, removeThreadFromProject } = useProjects()
  const viewer = useViewer()
  const { user: clerkUser } = useUser()
  const { isOnline } = useOnlineStatus()

  React.useEffect(() => {
    const requestedTab = consumeSettingsTabIntent()
    if (!requestedTab) {
      return
    }

    setSettingsTab(requestedTab)
    setSettingsOpen(true)
  }, [])

  const { projectThreads: threadsByProjectId, unfiledThreads } = React.useMemo(
    () => groupThreadsByProject(threads),
    [threads],
  )

  const orderedThreadIds = React.useMemo(
    () => threads.filter((thread) => !thread.isOptimistic).map((thread) => thread.id),
    [threads],
  )

  const handleNewChat = React.useCallback(() => {
    writePendingNewChatProjectId(undefined)
    navigate('/')
  }, [navigate])

  const handleNavigateRelative = React.useCallback(
    (direction: -1 | 1) => {
      if (orderedThreadIds.length === 0) {
        return
      }

      const currentIndex = selectedThreadId ? orderedThreadIds.indexOf(selectedThreadId) : -1

      const nextIndex =
        currentIndex < 0
          ? direction > 0
            ? 0
            : orderedThreadIds.length - 1
          : Math.max(0, Math.min(orderedThreadIds.length - 1, currentIndex + direction))

      const nextThreadId = orderedThreadIds[nextIndex]
      if (!nextThreadId || nextThreadId === selectedThreadId) {
        return
      }

      navigate(generatePath('/:chatId', { chatId: nextThreadId }))
    },
    [navigate, orderedThreadIds, selectedThreadId],
  )

  const handleNewChatInProject = React.useCallback(
    (projectId: string) => {
      writePendingNewChatProjectId(projectId)
      navigate('/')
    },
    [navigate],
  )

  const handleOpenProjectWorkspace = React.useCallback(
    (projectId: string) => {
      navigate(generatePath('/projects/:projectId', { projectId }))
    },
    [navigate],
  )

  const handlePinThread = React.useCallback(
    async (threadId: string, pinned: boolean) => {
      const current = threads.find((thread) => thread.id === threadId)
      if (!current?.serverId) {
        return
      }

      await setPinned(current.serverId, pinned)
    },
    [setPinned, threads],
  )

  const toggleProjectExpanded = React.useCallback((projectId: string) => {
    setExpandedProjectIds((current) => ({
      ...current,
      [projectId]: !(current[projectId] ?? true),
    }))
  }, [])

  async function handleSaveProject() {
    if (!projectDialog?.name.trim()) {
      return
    }

    await createProject({
      name: projectDialog.name,
      description: projectDialog.description || undefined,
    })

    setProjectDialog(null)
  }

  async function handleConfirmRemoveFromProject() {
    if (!removeFromProjectDialog) {
      return
    }

    await removeThreadFromProject(removeFromProjectDialog.threadId)
    setRemoveFromProjectDialog(null)
  }

  useHotkeyAction('newChat', handleNewChat)
  useHotkeyAction('openSettings', () => {
    setSettingsTab('general')
    setSettingsOpen(true)
  })
  useHotkeyAction(
    'nextChat',
    () => {
      handleNavigateRelative(1)
    },
    orderedThreadIds.length > 0,
  )
  useHotkeyAction(
    'previousChat',
    () => {
      handleNavigateRelative(-1)
    },
    orderedThreadIds.length > 0,
  )

  return (
    <Sidebar className={cn('border-r border-sidebar-border', className)}>
      <SidebarHeader className="relative pb-2">
        <div className="flex items-center justify-center py-3">
          <h1 className="text-lg font-semibold text-sidebar-foreground">Chat</h1>
        </div>

        <Button onClick={handleNewChat} className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          New Chat
        </Button>

        <div className="mt-2 flex gap-2">
          <Button
            variant="outline"
            className="flex-1 justify-start"
            disabled={!isOnline}
            onClick={() =>
              setProjectDialog({
                name: '',
                description: '',
              })
            }
          >
            <Folder className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>

        <SidebarSearchDialog isOnline={isOnline} />
      </SidebarHeader>

      <SidebarContent>
        {projects.length > 0 ? (
          <SidebarGroup>
            <SidebarGroupLabel>Projects</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {projects.map((project) => {
                  const projectThreads = threadsByProjectId.get(project.id) ?? []
                  const expanded = expandedProjectIds[project.id] ?? true

                  return (
                    <React.Fragment key={project.id}>
                      <SidebarMenuItem className="group/project">
                        <SidebarMenuButton asChild className="w-full justify-between">
                          <div>
                            <button
                              type="button"
                              className="flex shrink-0 items-center"
                              onClick={() => toggleProjectExpanded(project.id)}
                              aria-label={
                                expanded ? `Collapse ${project.name}` : `Expand ${project.name}`
                              }
                            >
                              {expanded ? (
                                <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                              )}
                            </button>
                            <button
                              type="button"
                              className="flex min-w-0 flex-1 items-center gap-2 text-left"
                              onClick={() => handleOpenProjectWorkspace(project.id)}
                            >
                              {expanded ? (
                                <FolderOpen className="size-4 shrink-0 text-primary" />
                              ) : (
                                <Folder className="size-4 shrink-0 text-primary" />
                              )}
                              <span className="truncate">
                                {project.name}
                                <span className="ml-2 text-xs text-muted-foreground">
                                  {projectThreads.length}
                                </span>
                              </span>
                            </button>
                            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover/project:opacity-100">
                              <IconActionButton
                                label="New chat in project"
                                onClick={() => handleNewChatInProject(project.id)}
                                icon={<Plus className="size-3.5" />}
                              />
                            </div>
                          </div>
                        </SidebarMenuButton>
                      </SidebarMenuItem>

                      {expanded && projectThreads.length > 0 ? (
                        <AnimatedThreadList
                          className="ml-7"
                          threads={projectThreads}
                          renderThread={(thread) => (
                            <ThreadRow
                              thread={thread}
                              isActive={selectedThreadId === thread.id}
                              onOpen={() => {
                                if (thread.isOptimistic) {
                                  return
                                }
                                navigate(generatePath('/:chatId', { chatId: thread.id }))
                              }}
                              onTogglePinned={() => {
                                if (thread.isOptimistic) {
                                  return
                                }
                                void handlePinThread(thread.id, !thread.pinned)
                              }}
                              onRemoveFromProject={
                                thread.serverId && !thread.isOptimistic
                                  ? () =>
                                      setRemoveFromProjectDialog({
                                        projectName: project.name,
                                        threadId: thread.serverId!,
                                        threadTitle: thread.title || 'Untitled chat',
                                      })
                                  : undefined
                              }
                            />
                          )}
                        />
                      ) : null}
                    </React.Fragment>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}

        <SidebarGroup>
          <SidebarGroupLabel>Unfiled</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              <AnimatedThreadList
                threads={unfiledThreads}
                renderThread={(thread) => (
                  <ThreadRow
                    thread={thread}
                    isActive={selectedThreadId === thread.id}
                    onOpen={() => {
                      if (thread.isOptimistic) {
                        return
                      }
                      navigate(generatePath('/:chatId', { chatId: thread.id }))
                    }}
                    onTogglePinned={() => {
                      if (thread.isOptimistic) {
                        return
                      }
                      void handlePinThread(thread.id, !thread.pinned)
                    }}
                  />
                )}
              />
              {unfiledThreads.length === 0 ? (
                <div className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
                  No unfiled chats.
                </div>
              ) : null}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />

        {viewer || clerkUser ? (
          <>
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg p-3 text-muted-foreground',
                      'select-none transition-colors hover:bg-sidebar-accent',
                      '[&_svg]:size-4',
                    )}
                    onClick={() => {
                      setSettingsTab('general')
                      setSettingsOpen(true)
                    }}
                  >
                    <Avatar className="size-8 shrink-0">
                      <AvatarImage
                        src={viewer?.image || clerkUser?.imageUrl || undefined}
                        alt={viewer?.name || clerkUser?.fullName || 'User'}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-primary text-xs font-medium text-primary-foreground">
                        {viewer?.name ? (
                          viewer.name
                            .split(' ')
                            .map((part: string) => part[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2)
                        ) : (
                          <User className="size-4" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 text-left">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {viewer?.name || clerkUser?.fullName || 'User'}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {viewer?.email || clerkUser?.primaryEmailAddress?.emailAddress || ''}
                      </span>
                    </div>
                    <Settings className="size-4 text-sidebar-foreground/70" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Settings</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </>
        ) : (
          <Button
            variant="ghost"
            className="w-full justify-start gap-3"
            onClick={() => navigate('/login')}
          >
            <LogIn className="h-4 w-4" />
            Login
          </Button>
        )}
      </SidebarFooter>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} initialTab={settingsTab} />

      <ProjectCreateDialog
        open={projectDialog !== null}
        isOnline={isOnline}
        draft={projectDialog}
        onOpenChange={(open) => {
          if (!open) {
            setProjectDialog(null)
          }
        }}
        onDraftChange={setProjectDialog}
        onSave={() => void handleSaveProject()}
      />

      <RemoveFromProjectDialog
        state={removeFromProjectDialog}
        onOpenChange={(open) => {
          if (!open) {
            setRemoveFromProjectDialog(null)
          }
        }}
        onConfirm={() => void handleConfirmRemoveFromProject()}
      />
    </Sidebar>
  )
}

function IconActionButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
      aria-label={label}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onClick()
      }}
    >
      {icon}
    </button>
  )
}
