'use client'

import { useState } from 'react'
import {
  AtSign,
  Paperclip,
  Globe,
  ArrowUp,
  ChevronDown,
  Check,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useMutation, useAction } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useConvexAuth } from 'convex/react'

const pages = [
  { icon: '📋', label: 'Meeting Notes' },
  { icon: '📊', label: 'Project Dashboard' },
  { icon: '💡', label: 'Ideas & Brainstorming' },
  { icon: '📅', label: 'Calendar & Events' },
  { icon: '📑', label: 'Documentation' },
  { icon: '🎯', label: 'Goals & Objectives' },
  { icon: '💰', label: 'Budget Planning' },
  { icon: '👥', label: 'Team Directory' },
  { icon: '🔧', label: 'Technical Specs' },
]

type AgentMode = 'auto' | 'agent' | 'plan'

interface AIPromptInputProps {
  selectedThreadId?: string | null
  onThreadIdChange?: (threadId: string) => void
}

export function AIPromptInput({
  selectedThreadId,
  onThreadIdChange,
}: AIPromptInputProps) {
  const [value, setValue] = useState('')
  const [agentMode, setAgentMode] = useState<AgentMode>('auto')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPage, setSelectedPage] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const { isAuthenticated } = useConvexAuth()
  const createThread = useMutation(api.agents.createChatThread)
  const sendMessage = useAction(api.agents.generateMessage)

  const filteredPages = pages.filter((page) =>
    page.label.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const agentModeLabel = {
    auto: 'Auto',
    agent: 'Agent Mode',
    plan: 'Plan Mode',
  }

  const handleSubmit = async () => {
    if (!value.trim() || sending || !isAuthenticated) return

    setSending(true)
    const text = value
    setValue('')

    try {
      let currentThreadId = selectedThreadId

      if (!currentThreadId) {
        const newThreadId = await createThread({ title: text.substring(0, 30) })
        currentThreadId = newThreadId
        onThreadIdChange?.(newThreadId)
      }

      await sendMessage({
        threadId: currentThreadId,
        text,
      })
    } catch (error) {
      console.error('Failed to send message:', error)
      setValue(text)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSubmit()
    }
  }

  return (
    <TooltipProvider>
      <div className="w-full max-w-2xl">
        <div className="rounded-2xl bg-zinc-900 p-4 shadow-lg">
          <div className="mb-3">
            <Popover>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-full bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-700"
                    >
                      <AtSign className="h-4 w-4" />
                      Add context
                    </button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="rounded-lg bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900"
                >
                  Mention a person, page, or date
                </TooltipContent>
              </Tooltip>
              <PopoverContent
                className="w-64 rounded-xl border-zinc-800 bg-zinc-900 p-0"
                align="start"
                sideOffset={8}
              >
                <div className="flex items-center gap-2 border-b border-zinc-800 px-3 py-2">
                  <Search className="h-4 w-4 text-zinc-500" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search pages..."
                    className="h-8 border-0 bg-transparent p-0 text-sm text-zinc-300 placeholder:text-zinc-500 focus-visible:ring-0"
                  />
                </div>
                <div className="p-2">
                  <p className="mb-2 px-2 text-xs font-medium text-zinc-500">
                    Pages
                  </p>
                  <div className="max-h-64 overflow-y-auto">
                    {filteredPages.map((page) => (
                      <button
                        type="button"
                        key={page.label}
                        onClick={() => {
                          setSelectedPage(page.label)
                          setSearchQuery('')
                        }}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-800',
                          selectedPage === page.label && 'bg-zinc-800',
                        )}
                      >
                        <span className="text-base">{page.icon}</span>
                        {page.label}
                      </button>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask, search, or make anything..."
            className="min-h-[60px] w-full resize-none bg-transparent text-lg text-zinc-400 placeholder:text-zinc-500 focus:outline-none"
            rows={2}
          />

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 gap-2 rounded-full px-3 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300"
              >
                <Paperclip className="h-4 w-4" />
              </Button>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 gap-1 rounded-full px-3 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300"
                  >
                    {agentModeLabel[agentMode]}
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-52 rounded-xl border-zinc-800 bg-zinc-900 p-2"
                  align="start"
                  sideOffset={8}
                >
                  <p className="mb-2 px-2 text-sm text-zinc-400">
                    Select Agent Mode
                  </p>
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => setAgentMode('auto')}
                      className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-800"
                    >
                      Auto
                      {agentMode === 'auto' && <Check className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAgentMode('agent')}
                      className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-800"
                    >
                      <span className="flex items-center gap-2">
                        Agent Mode
                        <Badge className="bg-indigo-600 px-1.5 py-0 text-[10px] font-medium text-white hover:bg-indigo-600">
                          Beta
                        </Badge>
                      </span>
                      {agentMode === 'agent' && <Check className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAgentMode('plan')}
                      className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-800"
                    >
                      Plan Mode
                      {agentMode === 'plan' && <Check className="h-4 w-4" />}
                    </button>
                  </div>
                </PopoverContent>
              </Popover>

              <Button
                variant="ghost"
                size="sm"
                className="h-9 gap-2 rounded-full px-3 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300"
              >
                <Globe className="h-4 w-4" />
                All Sources
              </Button>
            </div>

            <Button
              size="icon"
              className="h-10 w-10 rounded-full bg-zinc-200 text-zinc-900 hover:bg-zinc-300"
              disabled={!value.trim() || sending}
              onClick={() => {
                void handleSubmit()
              }}
            >
              {sending ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent" />
              ) : (
                <ArrowUp className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
