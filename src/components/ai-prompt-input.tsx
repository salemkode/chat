'use client'

import { useState, useRef, useEffect } from 'react'
import { AlertCircle, ArrowUp, Globe, Paperclip } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ModelSelector } from './model-selector'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'

interface AIPromptInputProps {
  onSubmit?: (
    value: string,
    opts: { searchEnabled: boolean },
  ) => Promise<void> | void
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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchEnabled, setSearchEnabled] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const value = controlledValue ?? internalValue

  const setValue = (nextValue: string) => {
    setSubmitError(null)

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

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!value.trim() || !onSubmit || disabled || isSubmitting) {
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      await onSubmit(value, { searchEnabled })
      setValue('')
    } catch (error) {
      setSubmitError(getComposerErrorMessage(error))
    } finally {
      setIsSubmitting(false)
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
              disabled={disabled || isSubmitting || !value.trim()}
              aria-label={
                isSubmitting
                  ? 'Sending message'
                  : value.trim()
                    ? 'Send message'
                    : 'Message requires text'
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
      {submitError ? (
        <Alert variant="destructive" className="mt-2 border-destructive/40">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Message failed</AlertTitle>
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      ) : null}
      {footerText ? (
        <p className="mt-2 px-1 text-xs text-muted-foreground">{footerText}</p>
      ) : null}
    </div>
  )
}

function getComposerErrorMessage(error: unknown): string {
  const fallback = 'Unable to send the message right now.'

  if (typeof error === 'string') {
    return sanitizeErrorMessage(error) || fallback
  }

  if (error instanceof Error) {
    return sanitizeErrorMessage(error.message) || fallback
  }

  if (error && typeof error === 'object') {
    const value = error as {
      message?: unknown
      data?: unknown
    }

    if (typeof value.data === 'string') {
      return sanitizeErrorMessage(value.data) || fallback
    }

    if (
      value.data &&
      typeof value.data === 'object' &&
      'message' in value.data &&
      typeof value.data.message === 'string'
    ) {
      return sanitizeErrorMessage(value.data.message) || fallback
    }

    if (typeof value.message === 'string') {
      return sanitizeErrorMessage(value.message) || fallback
    }
  }

  return fallback
}

function sanitizeErrorMessage(message: string): string {
  const cleaned = message
    .replace(/\s*\[Request ID:[^\]]+\]\s*/g, ' ')
    .replace(/^Error:\s*/i, '')
    .trim()

  if (!cleaned || cleaned === 'Server Error') {
    return ''
  }

  if (cleaned === 'No model selected') {
    return 'Select a model before sending your message.'
  }

  return cleaned
}
