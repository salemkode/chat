import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { CodeBlock, InlineCode } from './CodeBlock'

interface MarkdownContentProps {
  className?: string
  content: string
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <div
      className={cn(`prose prose-sm dark:prose-invert max-w-none text-foreground overflow-hidden wrap-anywhere ${className || ''}`)}
      dir="auto"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
          ul: ({ children }) => (
            <ul className="list-disc pl-6 mb-4 space-y-1" dir="auto">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-6 mb-4 space-y-1">{children}</ol>
          ),
          li: ({ children }) => <li>{children}</li>,
          code: ({ inline, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '')
            const language = match ? match[1] : ''
            const code = String(children).replace(/\n$/, '')
            
            if (!className) {
              return <InlineCode>{children}</InlineCode>
            }
            
            return (
              <CodeBlock 
                code={code} 
                language={language || undefined}
              />
            )
          },
          pre: ({ children }) => <>{children}</>,
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
            <strong className="font-bold text-muted-foreground" dir="auto">
              {children}
            </strong>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

