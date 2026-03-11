'use client'

import * as React from 'react'
import { useClerk, useUser } from '@clerk/clerk-react'
import { useNavigate } from '@tanstack/react-router'
import {
  Plus,
  Search,
  Pin,
  X,
  LogIn,
  LogOut,
  User,
  Settings,
  Database,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
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
  useOfflineStatus,
  useSyncController,
  useThreads,
  useViewer,
} from '@/offline/repositories'

interface Thread {
  id: string
  title?: string
  createdAt: number
  lastMessageAt: number
  pinned: boolean
  metadata?: {
    emoji: string
    sortOrder: number
  }
}

interface AppSidebarProps {
  selectedThreadId?: string | null
  className?: string
}

export function AppSidebar({ selectedThreadId, className }: AppSidebarProps) {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = React.useState('')
  const [settingsOpen, setSettingsOpen] = React.useState(false)

  const { threads, setPinned, deleteThread } = useThreads()
  const viewer = useViewer()
  const { isAuthenticatedOrOffline } = useOfflineStatus()
  const { clearOfflineData } = useSyncController()
  const { user: clerkUser } = useUser()
  const { signOut } = useClerk()

  const typedThreads = React.useMemo<Thread[]>(
    () =>
      threads.map((thread) => ({
        id: thread.id,
        title: thread.title,
        createdAt: thread.createdAt,
        lastMessageAt: thread.lastMessageAt,
        pinned: thread.pinned,
        metadata: {
          emoji: thread.emoji,
          sortOrder: thread.pinned ? 1 : 0,
        },
      })),
    [threads],
  )

  const filteredThreads = React.useMemo(() => {
    if (!searchQuery.trim()) return typedThreads

    return typedThreads.filter((thread) =>
      thread.title?.toLowerCase().includes(searchQuery.toLowerCase()),
    )
  }, [searchQuery, typedThreads])

  const groupedThreads = React.useMemo(() => {
    const now = Date.now()
    const oneDay = 24 * 60 * 60 * 1000

    const pinned: Thread[] = []
    const today: Thread[] = []
    const yesterday: Thread[] = []
    const last7Days: Thread[] = []
    const last30Days: Thread[] = []
    const older: Thread[] = []

    filteredThreads.forEach((thread) => {
      if (thread.pinned) {
        pinned.push(thread)
        return
      }

      const age = now - (thread.lastMessageAt || thread.createdAt)
      if (age < oneDay) {
        today.push(thread)
      } else if (age < 2 * oneDay) {
        yesterday.push(thread)
      } else if (age < 7 * oneDay) {
        last7Days.push(thread)
      } else if (age < 30 * oneDay) {
        last30Days.push(thread)
      } else {
        older.push(thread)
      }
    })

    return { pinned, today, yesterday, last7Days, last30Days, older }
  }, [filteredThreads])

  const handleNewChat = () => {
    navigate({ to: '/' })
  }

  const handlePinThread = async (threadId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      const current = typedThreads.find((thread) => thread.id === threadId)
      await setPinned(threadId, !(current?.pinned ?? false))
    } catch (error) {
      console.error('Failed to pin thread:', error)
    }
  }

  const handleDeleteThread = async (threadId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await deleteThread(threadId)
      if (selectedThreadId === threadId) {
        navigate({ to: '/' })
      }
    } catch (error) {
      console.error('Failed to delete thread:', error)
    }
  }

  const renderThreadGroup = (
    group: Thread[],
    label: string,
    showPinButton = true,
  ) => {
    if (group.length === 0) return null

    return (
      <>
        <SidebarGroupLabel className="text-primary font-semibold text-xs uppercase tracking-wider mt-2 first:mt-0">
          {label}
        </SidebarGroupLabel>
        {group.map((thread) => (
          <ThreadItem
            key={thread.id}
            thread={thread}
            isActive={selectedThreadId === thread.id}
            onPin={handlePinThread}
            onDelete={handleDeleteThread}
            showPinButton={showPinButton}
            isPinned={thread.pinned}
          />
        ))}
      </>
    )
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
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>

        <Button
          variant="outline"
          className="w-full mt-2 justify-start"
          onClick={() => navigate({ to: '/memory' })}
        >
          <Database className="h-4 w-4 mr-2" />
          Memory
        </Button>

        {/* Search */}
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sidebar-foreground/60" />
          <Input
            placeholder="Search threads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background"
          />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {renderThreadGroup(groupedThreads.pinned, 'Pinned', true)}
              {renderThreadGroup(groupedThreads.today, 'Today', true)}
              {renderThreadGroup(groupedThreads.yesterday, 'Yesterday', true)}
              {renderThreadGroup(groupedThreads.last7Days, 'Last 7 Days', true)}
              {renderThreadGroup(
                groupedThreads.last30Days,
                'Last 30 Days',
                true,
              )}
              {renderThreadGroup(groupedThreads.older, 'Older', true)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />

        {isAuthenticatedOrOffline ? (
          <>
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg p-3 text-muted-foreground',
                      'select-none hover:bg-sidebar-accent transition-colors',
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
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
                        {viewer?.name ? (
                          viewer.name
                            .split(' ')
                            .map((part) => part[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2)
                        ) : (
                          <User className="size-4" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start flex-1 min-w-0 text-left">
                      <span className="text-sm font-medium text-foreground truncate">
                        {viewer?.name || clerkUser?.fullName || 'User'}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
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
                void (async () => {
                  await clearOfflineData()
                  await signOut()
                })()
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
            onClick={() => navigate({ to: '/login' })}
          >
            <LogIn className="h-4 w-4" />
            Login
          </Button>
        )}
      </SidebarFooter>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </Sidebar>
  )
}

interface ThreadItemProps {
  thread: Thread
  isActive?: boolean
  onPin: (threadId: string, e: React.MouseEvent) => void
  onDelete: (threadId: string, e: React.MouseEvent) => void
  showPinButton?: boolean
  isPinned?: boolean
}

function ThreadItem({
  thread,
  isActive,
  onPin,
  onDelete,
  showPinButton = true,
  isPinned = false,
}: ThreadItemProps) {
  const [isHovered, setIsHovered] = React.useState(false)
  const navigate = useNavigate()

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <SidebarMenuItem
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <SidebarMenuButton
              asChild
              isActive={isActive}
              className={cn(
                'w-full relative pr-16',
                isActive && 'bg-sidebar-accent text-sidebar-accent-foreground',
                isPinned && 'font-medium',
              )}
            >
              <button
                type="button"
                className="flex w-full items-center gap-2 text-left"
                onClick={() =>
                  navigate({ to: '/$chatId', params: { chatId: thread.id } })
                }
              >
                <span className="truncate text-sm">
                  {thread.metadata?.emoji || '💬'} {thread.title || 'Untitled'}
                </span>
              </button>
            </SidebarMenuButton>

            <div
              className={cn(
                'absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1 transition-opacity duration-200 z-10 bg-sidebar rounded-md p-0.5',
                isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none',
              )}
            >
              {showPinButton && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'h-6 w-6',
                    isPinned
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    onPin(thread.id, e)
                  }}
                >
                  <Pin className={cn('h-3 w-3', isPinned && 'fill-current')} />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(thread.id, e)
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </SidebarMenuItem>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>{thread.title || 'Untitled Chat'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
