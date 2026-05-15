import { Check, Copy } from '@/lib/icons'
import { cn } from '@/lib/utils'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

export function ChatFencedCodeBlock({
  code,
  languageLabel,
  dir,
  contentClassName,
  children,
}: {
  code: string
  languageLabel: string
  dir: 'ltr' | 'rtl'
  /** Merged onto the inner content wrapper (overflow, mermaid tweaks, etc.). */
  contentClassName?: string
  children: ReactNode
}) {
  const [copied, setCopied] = useState(false)
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleCopy = useCallback(() => {
    if (typeof navigator === 'undefined' || navigator.clipboard == null) {
      return
    }
    void navigator.clipboard
      .writeText(code)
      .then(() => {
        if (copiedTimerRef.current != null) {
          clearTimeout(copiedTimerRef.current)
        }
        setCopied(true)
        copiedTimerRef.current = setTimeout(() => {
          setCopied(false)
          copiedTimerRef.current = null
        }, 1200)
      })
      .catch(() => undefined)
  }, [code])

  useEffect(
    () => () => {
      if (copiedTimerRef.current != null) {
        clearTimeout(copiedTimerRef.current)
        copiedTimerRef.current = null
      }
    },
    [],
  )

  return (
    <div
      dir={dir}
      className={cn(
        'chat-markdown-codeblock not-prose group/chat-fenced relative my-3 overflow-hidden rounded-xl border border-border/60 bg-sidebar/85 shadow-sm [unicode-bidi:isolate]',
        dir === 'rtl' ? 'text-right' : 'text-left',
      )}
    >
      <span className="pointer-events-none absolute top-2 left-3 z-10 inline-flex h-6 items-center rounded-md border border-border/60 bg-background/85 px-2 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
        {languageLabel}
      </span>
      <button
        type="button"
        className="chat-markdown-copy-button absolute top-2 right-2 z-10 inline-flex size-8 items-center justify-center rounded-md border border-border/60 bg-background/90 text-muted-foreground opacity-0 transition-colors hover:bg-muted hover:text-foreground group-hover/chat-fenced:opacity-100 group-focus-within/chat-fenced:opacity-100"
        onClick={handleCopy}
        title={copied ? 'Copied' : 'Copy code'}
        aria-label={copied ? 'Copied' : 'Copy code'}
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </button>
      <div
        className={cn(
          'overflow-x-auto pt-10 pb-4 [overflow-wrap:normal]',
          '[&_.shiki]:bg-transparent!',
          '[&_pre]:m-0! [&_pre]:bg-transparent! [&_pre]:px-4! [&_pre]:py-0! [&_pre]:text-[13px]',
          '[&_pre]:whitespace-pre! [&_code]:whitespace-pre!',
          dir === 'rtl' ? '[&_pre]:text-right' : '[&_pre]:text-left',
          contentClassName,
        )}
      >
        {children}
      </div>
    </div>
  )
}
