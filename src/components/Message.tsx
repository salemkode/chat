import { useSmoothText } from '@convex-dev/agent/react'
import { Clock, Calendar, Copy, Check, Brain } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import React from 'react'
import { FunctionReturnType } from 'convex/server'
import { api } from 'convex/_generated/api'

interface MessageProps {
  message: FunctionReturnType<typeof api.chat.listMessages>['page'][number]
}

export function Message({ message }: MessageProps) {
  console.log(message)
  const [visibleText] = useSmoothText(message.text, {
    startStreaming: message.status === 'streaming',
  })
  const [copied, setCopied] = React.useState(false)

  const handleCopy = async () => {
    const content = message.text
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatTime = (timestamp?: string | number) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (timestamp?: string | number) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const today = new Date()
    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  if (message.role === 'assistant') {
    return (
      <div className="w-full">
        <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
          <span className="font-medium">AI Assistant</span>
          <span>•</span>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatTime(message._creationTime)}
          </div>
          <span>•</span>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDate(message._creationTime)}
          </div>
          {/* 
          {(message.metadata) && (
            <>
              <span>•</span>
              <button
                type="button"
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                <Brain className="h-3 w-3" />
                Thoughts
              </button>
            </>
          )} */}
        </div>
        <div dir="auto">
          <div
            className="prose prose-sm dark:prose-invert max-w-none text-foreground overflow-hidden wrap-anywhere"
            dir="auto"
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => (
                  <p className="mb-4 last:mb-0">{children}</p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc pl-6 mb-4 space-y-1" dir="auto">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal pl-6 mb-4 space-y-1">
                    {children}
                  </ol>
                ),
                li: ({ children }) => <li>{children}</li>,
                code: ({ inline, children, ...props }: any) =>
                  inline ? (
                    <code
                      className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono text-foreground"
                      {...props}
                    >
                      {children}
                    </code>
                  ) : (
                    <code
                      className="block rounded-lg bg-muted p-4 text-sm font-mono overflow-x-auto text-foreground"
                      {...props}
                    >
                      {children}
                    </code>
                  ),
                pre: ({ children }) => (
                  <pre className="mb-4 overflow-x-auto" dir="auto">
                    {children}
                  </pre>
                ),
                h1: ({ children }) => (
                  <h1 className="text-2xl font-bold mb-4" dir="auto">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-xl font-semibold mb-3" dir="auto">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-lg font-medium mb-2" dir="auto">
                    {children}
                  </h3>
                ),
                blockquote: ({ children }) => (
                  <blockquote
                    className="border-l-4 border-muted pl-4 italic text-muted-foreground mb-4"
                    dir="auto"
                  >
                    {children}
                  </blockquote>
                ),
                a: ({ children, href }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline underline-offset-4 hover:text-primary/80"
                  >
                    {children}
                  </a>
                ),
                img: () => <span aria-hidden={true}></span>,
                strong: ({ children }) => (
                  <strong
                    className="font-bold text-muted-foreground"
                    dir="auto"
                  >
                    {children}
                  </strong>
                ),
              }}
            >
              {visibleText}
            </ReactMarkdown>
          </div>
        </div>
        <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border/50">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div key={message.id} className="flex justify-end">
      <div className="rounded-tr-xl rounded-tl-xl rounded-bl-xl bg-secondary px-4 py-2.5 max-w-[75%]">
        <p className="text-sm leading-relaxed">{visibleText}</p>
      </div>
    </div>
  )
}
