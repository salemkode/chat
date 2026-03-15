'use client'

import * as React from 'react'
import { useClerk, useUser } from '@clerk/tanstack-react-start'
import { useNavigate } from '@tanstack/react-router'
import {
  CircleDollarSign,
  ChevronDown,
  ChevronRight,
  Database,
  Folder,
  FolderOpen,
  GraduationCap,
  Lightbulb,
  LogIn,
  LogOut,
  NotebookPen,
  Plane,
  Pin,
  Plus,
  Settings,
  User,
  X,
} from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { SettingsDialog } from '@/components/settings-dialog'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { useProjects, useThreads, useViewer } from '@/hooks/use-chat-data'
import { writePendingNewChatProjectId } from '@/lib/project-selection'
import { Textarea } from '@/components/ui/textarea'
import { SidebarSearchDialog } from '@/components/sidebar/SidebarSearchDialog'

interface AppSidebarProps {
  selectedThreadId?: string | null
  className?: string
}

type ProjectDraftState = {
  name: string
  description: string
}

type RemoveFromProjectState = {
  projectName: string
  threadId: string
  threadTitle: string
}

const PROJECT_TEMPLATE_OPTIONS = [
  {
    label: 'Investing',
    icon: CircleDollarSign,
    className: 'text-emerald-300',
  },
  {
    label: 'Homework',
    icon: GraduationCap,
    className: 'text-sky-300',
  },
  {
    label: 'Writing',
    icon: NotebookPen,
    className: 'text-violet-300',
  },
  {
    label: 'Travel',
    icon: Plane,
    className: 'text-amber-300',
  },
] as const

export function AppSidebar({ selectedThreadId, className }: AppSidebarProps) {
  const navigate = useNavigate()
  const [settingsOpen, setSettingsOpen] = React.useState(false)
  const [projectDialog, setProjectDialog] =
    React.useState<ProjectDraftState | null>(null)
  const [removeFromProjectDialog, setRemoveFromProjectDialog] =
    React.useState<RemoveFromProjectState | null>(null)
  const [expandedProjectIds, setExpandedProjectIds] = React.useState<
    Record<string, boolean>
  >({})

  const { threads, setPinned } = useThreads()
  const { projects, createProject, removeThreadFromProject } = useProjects()
  const viewer = useViewer()
  const { user: clerkUser } = useUser()
  const { signOut } = useClerk()
  const { isOnline } = useOnlineStatus()

  const { projectThreads: threadsByProjectId, unfiledThreads } = React.useMemo(
    () => groupThreadsByProject(threads),
    [threads],
  )

  const handleNewChat = React.useCallback(() => {
    writePendingNewChatProjectId(undefined)
    navigate({ to: '/' })
  }, [navigate])

  const handleNewChatInProject = React.useCallback(
    (projectId: string) => {
      writePendingNewChatProjectId(projectId)
      navigate({ to: '/' })
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

  return (
    <Sidebar className={cn('border-r border-sidebar-border', className)}>
      <SidebarHeader className="relative pb-2">
        <div className="flex items-center justify-center py-3">
          <h1 className="text-lg font-semibold text-sidebar-foreground">
            Chat
          </h1>
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
          <Button
            variant="outline"
            className="justify-start"
            disabled={!isOnline}
            onClick={() => navigate({ to: '/memory' })}
          >
            <Database className="h-4 w-4" />
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
                  const projectThreads =
                    threadsByProjectId.get(project.id) ?? []
                  const expanded = expandedProjectIds[project.id] ?? true

                  return (
                    <React.Fragment key={project.id}>
                      <SidebarMenuItem className="group/project">
                        <SidebarMenuButton
                          asChild
                          className="w-full justify-between"
                        >
                          <div>
                            <button
                              type="button"
                              className="flex min-w-0 flex-1 items-center gap-2 text-left"
                              onClick={() => toggleProjectExpanded(project.id)}
                            >
                              {expanded ? (
                                <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                              )}
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
                                onClick={() =>
                                  handleNewChatInProject(project.id)
                                }
                                icon={<Plus className="size-3.5" />}
                              />
                            </div>
                          </div>
                        </SidebarMenuButton>
                      </SidebarMenuItem>

                      {expanded && projectThreads.length > 0 ? (
                        <div className="ml-7 space-y-1">
                          {projectThreads.map((thread) => (
                            <ThreadRow
                              key={thread.id}
                              thread={thread}
                              isActive={selectedThreadId === thread.id}
                              onOpen={() =>
                                navigate({
                                  to: '/$chatId',
                                  params: { chatId: thread.id },
                                })
                              }
                              onTogglePinned={() =>
                                void handlePinThread(thread.id, !thread.pinned)
                              }
                              onRemoveFromProject={
                                thread.serverId
                                  ? () =>
                                      setRemoveFromProjectDialog({
                                        projectName: project.name,
                                        threadId: thread.serverId!,
                                        threadTitle:
                                          thread.title || 'Untitled chat',
                                      })
                                  : undefined
                              }
                            />
                          ))}
                        </div>
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
              {unfiledThreads.map((thread) => (
                <ThreadRow
                  key={thread.id}
                  thread={thread}
                  isActive={selectedThreadId === thread.id}
                  onOpen={() =>
                    navigate({
                      to: '/$chatId',
                      params: { chatId: thread.id },
                    })
                  }
                  onTogglePinned={() =>
                    void handlePinThread(thread.id, !thread.pinned)
                  }
                />
              ))}
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
                    onClick={() => setSettingsOpen(true)}
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
                        {viewer?.email ||
                          clerkUser?.primaryEmailAddress?.emailAddress ||
                          ''}
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

            <Button
              variant="ghost"
              className="w-full justify-start gap-3"
              onClick={() => {
                void signOut()
              }}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            className="w-full justify-start gap-3"
            onClick={() =>
              navigate({
                to: '/login',
                search: { redirect: undefined, redirect_url: undefined },
              })
            }
          >
            <LogIn className="h-4 w-4" />
            Login
          </Button>
        )}
      </SidebarFooter>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />

      <Dialog
        open={projectDialog !== null}
        onOpenChange={(open) => {
          if (!open) {
            setProjectDialog(null)
          }
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="max-w-[34rem] gap-0 overflow-hidden rounded-[1.75rem] border border-border bg-card p-0 text-card-foreground shadow-[0_24px_80px_color-mix(in_srgb,var(--foreground)_18%,transparent)]"
        >
          <DialogHeader className="border-b border-border bg-muted/20 px-6 py-5 text-left">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <DialogTitle className="text-[1.45rem] font-semibold tracking-tight text-foreground">
                  Create project
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Group related chats, files, and instructions in one place.
                </p>
              </div>
              <DialogClose asChild>
                <button
                  type="button"
                  className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Close project dialog"
                >
                  <X className="size-4" />
                </button>
              </DialogClose>
            </div>
          </DialogHeader>
          <div className="space-y-5 px-6 py-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Project name
              </label>
              <div className="relative">
                <Folder className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={projectDialog?.name || ''}
                  onChange={(event) =>
                    setProjectDialog((current) =>
                      current
                        ? {
                            ...current,
                            name: event.target.value,
                          }
                        : current,
                    )
                  }
                  placeholder="Copenhagen Trip"
                  className="h-11 rounded-2xl border-border bg-background pl-10"
                />
              </div>
            </div>

            {projectDialog ? (
              <div className="flex flex-wrap gap-2">
                {PROJECT_TEMPLATE_OPTIONS.map((option) => {
                  const Icon = option.icon

                  return (
                    <button
                      key={option.label}
                      type="button"
                      className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-4 py-2 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                      onClick={() =>
                        setProjectDialog((current) =>
                          current
                            ? {
                                ...current,
                                name: current.name || option.label,
                              }
                            : current,
                        )
                      }
                    >
                      <Icon className={cn('size-4', option.className)} />
                      {option.label}
                    </button>
                  )
                })}
              </div>
            ) : null}

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Description
              </label>
              <Textarea
                value={projectDialog?.description || ''}
                onChange={(event) =>
                  setProjectDialog((current) =>
                    current
                      ? {
                          ...current,
                          description: event.target.value,
                        }
                      : current,
                  )
                }
                placeholder="Add context, instructions, or what this project is for."
                className="min-h-24 rounded-2xl border-border bg-background"
              />
            </div>

            <div className="flex items-start gap-3 rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
              <div className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Lightbulb className="size-4 text-primary" />
              </div>
              <p className="leading-6">
                Projects keep chats, files, and custom instructions in one place
                so long-running work stays organized.
              </p>
            </div>
          </div>
          <div className="flex justify-end border-t border-border bg-muted/20 px-6 py-4">
            <Button
              disabled={!isOnline || !projectDialog?.name.trim()}
              onClick={() => void handleSaveProject()}
              className="h-11 rounded-full px-5 text-sm font-semibold"
            >
              Create project
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={removeFromProjectDialog !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRemoveFromProjectDialog(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove chat from project?</AlertDialogTitle>
            <AlertDialogDescription>
              {removeFromProjectDialog
                ? `"${removeFromProjectDialog.threadTitle}" will be removed from "${removeFromProjectDialog.projectName}", but the chat will still be kept.`
                : 'The chat will be removed from this project, but it will still be kept.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleConfirmRemoveFromProject()}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

function ThreadRow({
  thread,
  isActive,
  onOpen,
  onTogglePinned,
  onRemoveFromProject,
}: {
  thread: {
    id: string
    title?: string
    emoji: string
    pinned: boolean
  }
  isActive?: boolean
  onOpen: () => void
  onTogglePinned: () => void
  onRemoveFromProject?: () => void
}) {
  return (
    <SidebarMenuItem className="group/thread">
      <SidebarMenuButton
        asChild
        isActive={isActive}
        className={cn(
          'w-full justify-between pr-1',
          isActive && 'bg-sidebar-accent text-sidebar-accent-foreground',
        )}
      >
        <div>
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
            onClick={onOpen}
          >
            <span className="shrink-0">{thread.emoji}</span>
            <span className="truncate text-sm">
              {thread.title || 'Untitled chat'}
            </span>
          </button>
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover/thread:opacity-100">
            <IconActionButton
              label={thread.pinned ? 'Unpin chat' : 'Pin chat'}
              onClick={onTogglePinned}
              icon={
                <Pin
                  className={cn('size-3.5', thread.pinned && 'fill-current')}
                />
              }
            />
            {onRemoveFromProject ? (
              <IconActionButton
                label="Remove from project"
                onClick={onRemoveFromProject}
                icon={<X className="size-3.5" />}
              />
            ) : null}
          </div>
        </div>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}
