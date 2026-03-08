'use client'

import * as React from 'react'
import { useClerk, useUser } from '@clerk/clerk-react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import {
  Plus,
  Search,
  Pin,
  X,
  LogIn,
  User,
  Settings,
  Database,
  LogOut,
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

interface ThreadMetadata {
  _id: string
  threadId: string
  emoji: string
  sectionId?: string
  userId: string
  sortOrder: number // 1 = pinned, 0 = normal
}

interface Thread {
  _id: string
  title?: string
  _creationTime: number
  metadata?: ThreadMetadata
}

interface AppSidebarProps {
  selectedThreadId?: string | null
  className?: string
}

export function AppSidebar({ selectedThreadId, className }: AppSidebarProps) {
  const navigate = useNavigate()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const [searchQuery, setSearchQuery] = React.useState('')
  const [settingsOpen, setSettingsOpen] = React.useState(false)

  const threads = useQuery(api.agents.listThreadsWithMetadata) || []
  const togglePinThread = useMutation(api.agents.togglePinThread)
  const deleteThreadMutation = useMutation(api.chat.deleteThread)
  const viewer = useQuery(api.users.viewer)
  const { user: clerkUser } = useUser()
  const { signOut } = useClerk()

  // Filter threads based on search query
  const filteredThreads = React.useMemo(() => {
    if (!searchQuery.trim()) return threads

    return threads.filter((thread: Thread) =>
      thread.title?.toLowerCase().includes(searchQuery.toLowerCase()),
    )
  }, [threads, searchQuery])

  // Group threads by pinned status and date
  const groupedThreads = React.useMemo(() => {
    const now = Date.now()
    const oneDay = 24 * 60 * 60 * 1000

    const pinned: Thread[] = []
    const today: Thread[] = []
    const yesterday: Thread[] = []
    const last7Days: Thread[] = []
    const last30Days: Thread[] = []
    const older: Thread[] = []

    filteredThreads.forEach((thread: Thread) => {
      // Check if pinned first
      if (thread.metadata?.sortOrder === 1) {
        pinned.push(thread)
        return
      }

      const age = now - thread._creationTime

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
    navigate({ to: '/chat' })
  }

  const handlePinThread = async (threadId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await togglePinThread({ threadId })
    } catch (error) {
      console.error('Failed to pin thread:', error)
    }
  }

  const handleDeleteThread = async (threadId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await deleteThreadMutation({ threadId: threadId as any })
      if (selectedThreadId === threadId) {
        navigate({ to: '/chat' })
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
        {group.map((thread: Thread) => (
          <ThreadItem
            key={thread._id}
            thread={thread}
            isActive={selectedThreadId === thread._id}
            onPin={handlePinThread}
            onDelete={handleDeleteThread}
            showPinButton={showPinButton}
            isPinned={thread.metadata?.sortOrder === 1}
          />
        ))}
      </>
    )
  }

  return (
    <Sidebar className={cn('border-r border-sidebar-border', className)}>
      <SidebarHeader className="relative pb-2">
        {/* Logo */}
        <div className="flex items-center justify-center py-3">
          <h1 className="text-lg font-semibold text-sidebar-foreground">
            Chat
          </h1>
        </div>

        {/* New Chat Button */}
        <Button onClick={handleNewChat} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>

        <Button
          variant={pathname.startsWith('/memory') ? 'secondary' : 'outline'}
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
              {/* Pinned Section */}
              {renderThreadGroup(groupedThreads.pinned, '📌 Pinned', true)}

              {/* Today */}
              {renderThreadGroup(groupedThreads.today, 'Today', true)}

              {/* Yesterday */}
              {renderThreadGroup(groupedThreads.yesterday, 'Yesterday', true)}

              {/* Last 7 Days */}
              {renderThreadGroup(groupedThreads.last7Days, 'Last 7 Days', true)}

              {/* Last 30 Days */}
              {renderThreadGroup(
                groupedThreads.last30Days,
                'Last 30 Days',
                true,
              )}

              {/* Older */}
              {renderThreadGroup(groupedThreads.older, 'Older', true)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />

        {viewer || clerkUser ? (
          <>
            {/* User Profile */}
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
                        src={
                          viewer?.settings?.image ||
                          viewer?.image ||
                          clerkUser?.imageUrl ||
                          undefined
                        }
                        alt={
                          viewer?.settings?.displayName ||
                          viewer?.name ||
                          clerkUser?.fullName ||
                          'User'
                        }
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
                        {(() => {
                          const name =
                            viewer?.settings?.displayName ||
                            viewer?.name ||
                            clerkUser?.fullName
                          return name ? (
                            name
                              .split(' ')
                              .map((n: string) => n[0])
                              .join('')
                              .toUpperCase()
                              .slice(0, 2)
                          ) : (
                            <User className="size-4" />
                          )
                        })()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start flex-1 min-w-0 text-left">
                      <span className="text-sm font-medium text-foreground truncate">
                        {viewer?.settings?.displayName ||
                          viewer?.name ||
                          clerkUser?.fullName ||
                          'User'}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {viewer?.email ||
                          clerkUser?.primaryEmailAddress?.emailAddress ||
                          ''}
                      </span>
                    </div>
                    <Settings className="size-4 text-sidebar-foreground/70 opacity-0 group-hover:opacity-100 transition-opacity" />
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
          /* Login Button */
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

      {/* Settings Dialog */}
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
                onClick={() => navigate({ to: `/chat/${thread._id}` })}
              >
                <span className="truncate text-sm">
                  {thread.metadata?.emoji || '💬'} {thread.title || 'Untitled'}
                </span>
              </button>
            </SidebarMenuButton>

            {/* Hover Actions */}
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
                    onPin(thread._id, e)
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
                  onDelete(thread._id, e)
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
