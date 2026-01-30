'use client'

import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Monitor, Sun, Moon, Plus, Search, Pin, X, LogIn } from 'lucide-react'
import { useTheme } from 'next-themes'
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

interface Thread {
  _id: string
  title?: string
  _creationTime: number
  metadata?: {
    emoji?: string
    sectionId?: string
  }
}

interface AppSidebarProps {
  selectedThreadId?: string | null
  className?: string
}

export function AppSidebar({ selectedThreadId, className }: AppSidebarProps) {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const [searchQuery, setSearchQuery] = React.useState('')
  const [mounted, setMounted] = React.useState(false)

  const threads = useQuery(api.agents.listThreadsWithMetadata) || []
  const togglePinThread = useMutation(api.agents.togglePinThread)
  const deleteThreadMutation = useMutation(api.chat.deleteThread)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Filter threads based on search query
  const filteredThreads = React.useMemo(() => {
    if (!searchQuery.trim()) return threads
    
    return threads.filter((thread: Thread) =>
      thread.title?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [threads, searchQuery])

  // Group threads by date
  const groupedThreads = React.useMemo(() => {
    const now = Date.now()
    const oneDay = 24 * 60 * 60 * 1000
    
    const today: Thread[] = []
    const yesterday: Thread[] = []
    const last7Days: Thread[] = []
    const older: Thread[] = []

    filteredThreads.forEach((thread: Thread) => {
      const age = now - thread._creationTime
      
      if (age < oneDay) {
        today.push(thread)
      } else if (age < 2 * oneDay) {
        yesterday.push(thread)
      } else if (age < 7 * oneDay) {
        last7Days.push(thread)
      } else {
        older.push(thread)
      }
    })

    return { today, yesterday, last7Days, older }
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

  const handleThemeToggle = () => {
    if (theme === 'light') setTheme('dark')
    else if (theme === 'dark') setTheme('system')
    else setTheme('light')
  }

  return (
    <Sidebar className={cn("border-r border-sidebar-border", className)}>
      <SidebarHeader className="relative pb-2">
        {/* Theme Toggle - Mobile only in header */}
        <div className="absolute top-2 right-2 sm:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={handleThemeToggle}
          >
            {mounted && (
              <>
                <Monitor className={cn("h-4 w-4 transition-transform", theme === 'system' ? "scale-100" : "scale-0")} />
                <Sun className={cn("h-4 w-4 transition-transform absolute", theme === 'light' ? "scale-100" : "scale-0")} />
                <Moon className={cn("h-4 w-4 transition-transform absolute", theme === 'dark' ? "scale-100" : "scale-0")} />
              </>
            )}
            {!mounted && <Monitor className="h-4 w-4" />}
          </Button>
        </div>

        {/* Logo */}
        <div className="flex items-center justify-center py-3">
          <h1 className="text-lg font-semibold text-sidebar-foreground">Chat</h1>
        </div>

        {/* New Chat Button */}
        <Button
          onClick={handleNewChat}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>

        {/* Search */}
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
            <SidebarMenu>
              {/* Today */}
              {groupedThreads.today.length > 0 && (
                <>
                  <SidebarGroupLabel>Today</SidebarGroupLabel>
                  {groupedThreads.today.map((thread: Thread) => (
                    <ThreadItem
                      key={thread._id}
                      thread={thread}
                      isActive={selectedThreadId === thread._id}
                      onPin={handlePinThread}
                      onDelete={handleDeleteThread}
                    />
                  ))}
                </>
              )}

              {/* Yesterday */}
              {groupedThreads.yesterday.length > 0 && (
                <>
                  <SidebarGroupLabel>Yesterday</SidebarGroupLabel>
                  {groupedThreads.yesterday.map((thread: Thread) => (
                    <ThreadItem
                      key={thread._id}
                      thread={thread}
                      isActive={selectedThreadId === thread._id}
                      onPin={handlePinThread}
                      onDelete={handleDeleteThread}
                    />
                  ))}
                </>
              )}

              {/* Last 7 Days */}
              {groupedThreads.last7Days.length > 0 && (
                <>
                  <SidebarGroupLabel>Last 7 Days</SidebarGroupLabel>
                  {groupedThreads.last7Days.map((thread: Thread) => (
                    <ThreadItem
                      key={thread._id}
                      thread={thread}
                      isActive={selectedThreadId === thread._id}
                      onPin={handlePinThread}
                      onDelete={handleDeleteThread}
                    />
                  ))}
                </>
              )}

              {/* Older */}
              {groupedThreads.older.length > 0 && (
                <>
                  <SidebarGroupLabel>Older</SidebarGroupLabel>
                  {groupedThreads.older.map((thread: Thread) => (
                    <ThreadItem
                      key={thread._id}
                      thread={thread}
                      isActive={selectedThreadId === thread._id}
                      onPin={handlePinThread}
                      onDelete={handleDeleteThread}
                    />
                  ))}
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />
        
        {/* Login Button */}
        <Button
          variant="ghost"
          className="w-full justify-start gap-3"
          onClick={() => navigate({ to: '/auth/login' })}
        >
          <LogIn className="h-4 w-4" />
          Login
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}

interface ThreadItemProps {
  thread: Thread
  isActive?: boolean
  onPin: (threadId: string, e: React.MouseEvent) => void
  onDelete: (threadId: string, e: React.MouseEvent) => void
}

function ThreadItem({ thread, isActive, onPin, onDelete }: ThreadItemProps) {
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
                "w-full",
                isActive && "bg-sidebar-accent text-sidebar-accent-foreground"
              )}
            >
              <button
                className="flex w-full items-center gap-2"
                onClick={() => navigate({ to: `/chat/${thread._id}` })}
              >
                <span className="truncate">
                  {thread.metadata?.emoji || '💬'} {thread.title || 'Untitled'}
                </span>
              </button>
            </SidebarMenuButton>
            
            {/* Hover Actions */}
            <div 
              className={cn(
                "absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1 transition-opacity duration-200 z-10 bg-sidebar rounded-md p-0.5",
                isHovered ? "opacity-100" : "opacity-0 pointer-events-none"
              )}
            >
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 bg-background"
                onClick={(e) => {
                  e.stopPropagation()
                  onPin(thread._id, e)
                }}
              >
                <Pin className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10 bg-background"
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
