'use client'

import { useState } from 'react'
import { Paperclip, Globe, ArrowUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ContextPopover } from './ContextPopover'
import { AgentModeSelector } from './AgentModeSelector'

type AgentMode = 'auto' | 'agent' | 'plan'

interface AIPromptInputProps {
  selectedModel?: string
  onModelChange?: (modelId: string) => void
  onSubmit?: (text: string) => void
  disabled?: boolean
}

export function AIPromptInput({
  selectedModel,
  onModelChange,
  onSubmit,
  disabled = false,
}: AIPromptInputProps) {
  const [value, setValue] = useState('')
  const [agentMode, setAgentMode] = useState<AgentMode>('auto')

  const handleSubmit = async () => {
    if (!value.trim() || disabled) return

    const text = value
    setValue('')

    // Use onSubmit callback provided by parent
    if (onSubmit) {
      onSubmit(text)
      return
    }

    // Legacy mode for backward compatibility
    console.warn('AIPromptInput should use onSubmit prop for message sending')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="w-full max-w-2xl">
      <div className="rounded-2xl bg-zinc-900 p-4 shadow-lg">
        <div className="mb-3">
          <ContextPopover />
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

            <AgentModeSelector
              agentMode={agentMode}
              onAgentModeChange={setAgentMode}
              selectedModel={selectedModel}
              onModelChange={onModelChange}
            />

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
            disabled={!value.trim() || disabled}
            onClick={handleSubmit}
          >
            <ArrowUp className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
