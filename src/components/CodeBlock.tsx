import { useEffect, useRef, useState } from 'react'
import hljs from 'highlight.js'
import 'highlight.js/styles/tomorrow-night-blue.css'
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
      className={cn('relative rounded-lg overflow-hidden hidden', className)}
      dir="ltr"
    >
      {/* Header with language and copy button */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border">
        <span className="text-xs text-muted-foreground uppercase">
          {detectedLanguage || 'text'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors rounded hover:bg-muted"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code content */}
      <div className="m-0">
        <pre className="my-0! p-0! rounded-t-none!">
          <code
            ref={codeRef}
            className={cn(
              'hljs text-sm font-mono leading-relaxed',
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
