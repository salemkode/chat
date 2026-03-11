'use client'

import { useState, useRef, useEffect } from 'react'
import { ArrowUp, Globe, Paperclip } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ModelSelector } from './model-selector'

interface AIPromptInputProps {
  onSubmit?: (value: string) => void
  disabled?: boolean
  selectedModel?: string
  onModelChange?: (modelId: string) => void
  value?: string
  onValueChange?: (value: string) => void
  footerText?: string
}

export function AIPromptInput({
  onSubmit,
  disabled = false,
  selectedModel,
  onModelChange,
  value: controlledValue,
  onValueChange,
  footerText,
}: AIPromptInputProps) {
  const [internalValue, setInternalValue] = useState('')
  const [searchEnabled, setSearchEnabled] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const value = controlledValue ?? internalValue

  const setValue = (nextValue: string) => {
    if (controlledValue !== undefined) {
      onValueChange?.(nextValue)
      return
    }

    setInternalValue(nextValue)
    onValueChange?.(nextValue)
  }

  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = '48px'
      const scrollHeight = textarea.scrollHeight
      textarea.style.height = `${Math.min(scrollHeight, 200)}px`
    }
  }, [value])

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (value.trim() && onSubmit && !disabled) {
      onSubmit(value)
      setValue('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="pointer-events-auto w-full">
      <form
        onSubmit={handleSubmit}
        className="pointer-events-auto relative flex w-full min-w-0 flex-col items-stretch rounded-t-xl border border-border bg-linear-to-b from-background/95 to-background/90 p-3 sm:p-4 text-secondary-foreground bg-muted/80 backdrop-blur-2xl sm:max-w-3xl"
      >
        <div className="flex min-w-0 grow flex-row items-start">
          <textarea
            ref={textareaRef}
            name="input"
            placeholder="Type your message here..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className="w-full min-w-0 resize-none bg-transparent text-base leading-6 text-foreground outline-none placeholder:text-muted-foreground/60 disabled:opacity-50"
            aria-label="Message input"
            autoComplete="off"
            style={{ height: '48px' }}
          />
        </div>

        <div className="flex w-full min-w-0 flex-row-reverse justify-between items-center">
          <div className="flex shrink-0 items-center justify-center">
            <button
              type="submit"
              disabled={disabled || !value.trim()}
              aria-label={
                value.trim() ? 'Send message' : 'Message requires text'
              }
              className="inline-flex items-center justify-center bg-primary font-semibold text-primary-foreground transition-colors hover:bg-primary/90 active:bg-primary disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-primary disabled:active:bg-primary size-9 rounded-lg p-2 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-hidden [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
            >
              <ArrowUp className="size-5" aria-hidden="true" />
            </button>
          </div>

          <div className="flex min-w-0 items-center gap-2">
            <ModelSelector
              selectedModel={selectedModel}
              onModelChange={onModelChange}
            />

            <button
              type="button"
              onClick={() => setSearchEnabled(!searchEnabled)}
              aria-label={searchEnabled ? 'Disable search' : 'Enable search'}
              className={cn(
                'inline-flex items-center justify-center h-8 rounded-lg px-2.5 text-xs font-medium transition-colors hover:bg-muted/60 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
                searchEnabled
                  ? 'text-foreground bg-muted/60'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Globe className="size-4" />
            </button>

            <label
              className="inline-flex h-8 cursor-pointer items-center rounded-lg px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-hidden [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
              aria-label="Attach a file"
            >
              <input multiple className="sr-only" type="file" />
              <Paperclip className="size-4" aria-hidden="true" />
            </label>
          </div>
        </div>
      </form>
      {footerText ? (
        <p className="mt-2 px-1 text-xs text-muted-foreground">{footerText}</p>
      ) : null}
    </div>
  )
}
