import { useEffect, useRef, useState } from 'react'
import hljs from 'highlight.js'
import { cn } from '@/lib/utils'
import { Copy, Check } from 'lucide-react'

interface CodeBlockProps {
  code: string
  language?: string
  className?: string
}

export function CodeBlock({ code, language, className }: CodeBlockProps) {
  const codeRef = useRef<HTMLElement>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (codeRef.current) {
      hljs.highlightElement(codeRef.current)
    }
  }, [code, language])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Detect language from code content if not provided
  const detectedLanguage = language || detectLanguage(code)

  return (
    <div
      className={cn(
        'not-prose relative overflow-hidden rounded-[1.25rem] border border-border/60 bg-sidebar/85 shadow-sm backdrop-blur',
        className,
      )}
      dir="ltr"
    >
      <div className="flex h-10 items-center justify-between border-b border-border/60 bg-sidebar px-4">
        <span className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground lowercase">
          {detectedLanguage || 'text'}
        </span>
        <div className="rounded-md border border-border/60 bg-background/80 px-2 backdrop-blur-sm">
          <button
            onClick={handleCopy}
            className="flex h-7 items-center gap-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            aria-label={copied ? 'Code copied' : 'Copy code'}
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy code</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto px-4 py-4">
        <pre className="my-0! overflow-visible! bg-transparent! p-0!">
          <code
            ref={codeRef}
            className={cn(
              'code-block-syntax hljs! block! min-w-full bg-transparent! p-0! text-[13px] leading-6 font-mono text-foreground not-prose whitespace-pre',
              detectedLanguage && `language-${detectedLanguage}`,
            )}
          >
            {code}
          </code>
        </pre>
      </div>
    </div>
  )
}

// Simple language detection based on common patterns
function detectLanguage(code: string): string | undefined {
  const trimmed = code.trim().toLowerCase()

  // Check for common language indicators
  if (trimmed.startsWith('<?php')) return 'php'
  if (trimmed.startsWith('<!doctype html') || trimmed.startsWith('<html'))
    return 'html'
  if (trimmed.startsWith('import ') && trimmed.includes('from ')) {
    if (trimmed.includes('react')) return 'tsx'
    return 'typescript'
  }
  if (
    trimmed.startsWith('const ') ||
    trimmed.startsWith('let ') ||
    trimmed.startsWith('var ')
  ) {
    if (trimmed.includes(':') || trimmed.includes('interface '))
      return 'typescript'
    return 'javascript'
  }
  if (trimmed.startsWith('def ') || trimmed.includes('print(')) return 'python'
  if (trimmed.startsWith('func ') || trimmed.startsWith('package ')) return 'go'
  if (trimmed.startsWith('using ') || trimmed.includes('namespace '))
    return 'csharp'
  if (trimmed.startsWith('#include')) return 'cpp'
  if (trimmed.startsWith('<?xml')) return 'xml'
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json'
  if (
    trimmed.startsWith('select ') ||
    trimmed.startsWith('insert ') ||
    trimmed.startsWith('create ')
  )
    return 'sql'
  if (
    trimmed.startsWith('css') ||
    (trimmed.includes('{') &&
      trimmed.includes(':') &&
      !trimmed.includes('function'))
  )
    return 'css'

  return undefined
}

// Inline code component
interface InlineCodeProps {
  children: React.ReactNode
  className?: string
}

export function InlineCode({ children, className }: InlineCodeProps) {
  return (
    <code
      className={cn(
        'rounded bg-muted px-1.5 py-0.5 text-sm font-mono text-foreground before:content-none after:content-none',
        className,
      )}
    >
      {children}
    </code>
  )
}
