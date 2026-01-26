'use client'

import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import {
  ChevronDown,
  ChevronRight,
  Home,
  Inbox,
  MessageCircleQuestion,
  Plus,
  Settings2,
  Sparkles,
} from 'lucide-react'

import { NavMain } from '@/components/nav-main'
import { NavSecondary } from '@/components/nav-secondary'
import logo from '@/assets/logo.svg'
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

interface Section {
  _id: Id<'sections'>
  name: string
  emoji: string
  sortOrder: number
  userId: string
  isExpanded: boolean
}

interface ThreadMetadata {
  _id: Id<'threadMetadata'>
  threadId: string
  emoji: string
  sectionId?: Id<'sections'>
  userId: string
}

interface Thread {
  _id: string
  title?: string
  metadata?: ThreadMetadata
}

const data = {
  navMain: [
    {
      title: 'Ask AI',
      url: '#',
      icon: Sparkles,
    },
    {
      title: 'Home',
      url: '#',
      icon: Home,
      isActive: true,
    },
    {
      title: 'Inbox',
      url: '#',
      icon: Inbox,
    },
  ],
  navSecondary: [
    {
      title: 'Settings',
      url: '#',
      icon: Settings2,
    },
    {
      title: 'Help',
      url: '#',
      icon: MessageCircleQuestion,
    },
  ],
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  selectedThreadId?: string | null
  onSelectThread?: (threadId: string) => void
}

export function AppSidebar({
  selectedThreadId,
  onSelectThread: _onSelectThread,
  ...props
}: AppSidebarProps) {
  const navigate = useNavigate()
  const sections = useQuery(api.sections.listSections) || []
  const threads = useQuery(api.agents.listThreadsWithMetadata) || []
  const toggleSection = useMutation(api.sections.toggleSection)

  const handleThreadClick = (threadId: string) => {
    void navigate({ to: `/chat/${threadId}` })
  }

  const handleNewChat = () => {
    void navigate({ to: '/chat' })
  }

  const handleSectionToggle = async (
    sectionId: Id<'sections'>,
    e: React.MouseEvent,
  ) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await toggleSection({ id: sectionId })
    } catch (error) {
      console.error('Failed to toggle section:', error)
    }
  }

  return (
    <Sidebar className="border-r-0" {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2 p-2">
          <img src={logo} alt="Salemkode Chat" className="h-8 w-8" />
          <span className="font-semibold">Salemkode Chat</span>
        </div>
        <NavMain items={data.navMain} />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleNewChat}>
                  <Plus className="h-4 w-4" />
                  <span>New Chat</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {sections.map((section: Section) => {
          const sectionThreads = threads.filter(
            (thread: Thread) => thread.metadata?.sectionId === section._id,
          )

          return (
            <SidebarGroup key={section._id}>
              <SidebarGroupLabel
                className="cursor-pointer flex items-center justify-between hover:bg-accent/50 rounded-md px-2 py-1.5 transition-colors"
                onClick={(e) => {
                  void handleSectionToggle(section._id, e)
                }}
              >
                {section.name}
                <span className="flex items-center gap-2">
                  {section.isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </span>
              </SidebarGroupLabel>
              {section.isExpanded && (
                <SidebarGroupContent>
                  <SidebarMenu>
                    {sectionThreads.map((thread: Thread) => (
                      <SidebarMenuItem key={thread._id}>
                        <SidebarMenuButton
                          onClick={() => handleThreadClick(thread._id)}
                          isActive={selectedThreadId === thread._id}
                        >
                          <span>{thread.metadata?.emoji || '💬'}</span>
                          <span>{thread.title || 'Untitled Chat'}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              )}
            </SidebarGroup>
          )
        })}

        {threads.filter((thread: Thread) => !thread.metadata?.sectionId)
          .length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Chats</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {threads
                  .filter((thread: Thread) => !thread.metadata?.sectionId)
                  .map((thread: Thread) => (
                    <SidebarMenuItem key={thread._id}>
                      <SidebarMenuButton
                        onClick={() => handleThreadClick(thread._id)}
                        isActive={selectedThreadId === thread._id}
                      >
                        <span>{thread.metadata?.emoji || '💬'}</span>
                        <span>{thread.title || 'Untitled Chat'}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
