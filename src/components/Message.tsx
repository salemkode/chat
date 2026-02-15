import { useSmoothText } from '@convex-dev/agent/react'
import { FunctionReturnType } from 'convex/server'
import { api } from 'convex/_generated/api'
import { CopyButton } from './CopyButton'
import { MarkdownContent } from './MarkdownContent'
import { ThinkingProcess } from './ThinkingProcess'
import { RefreshCw } from 'lucide-react'

interface MessageProps {
  message: FunctionReturnType<typeof api.chat.listMessages>['page'][number]
  modelName?: string
}

export function Message({ message, modelName }: MessageProps) {
  const [visibleText] = useSmoothText(message.text, {
    startStreaming: message.status === 'streaming',
  })

  // Check if thinking content exists (type assertion for thinking field)
  const thinking = message.parts.find((part) => part.type === 'reasoning')
  const isFailed = message.status === 'failed'

  if (message.status === 'failed') {
    return (
      <div className="w-full max-w-3xl mx-auto">
        <div className="p-4 rounded-lg bg-red-600/20 border border-red-600 text-red-700">
          <strong className="font-medium">Error:</strong>{' '}
          {visibleText || 'An error occurred while generating the message.'}
        </div>
      </div>
    )
  }
  if (message.role === 'assistant') {
    return (
      <div className="w-full max-w-3xl mx-auto">
        {/* Thinking Section */}
        {thinking && (
          <ThinkingProcess
            text={thinking.text}
            isStreaming={message.status === 'streaming'}
          />
        )}

        <div dir="auto">
          <MarkdownContent content={visibleText} />
        </div>

        {/* Bottom bar with model name and actions */}
        <div className="flex items-center gap-2 sm:gap-3 mt-3 sm:mt-4 pt-2 sm:pt-3 border-t border-border/50">
          <CopyButton text={message.text} />
          <button
            className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"
            title="Regenerate"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {modelName && (
            <span className="ml-auto text-xs text-muted-foreground">
              {modelName}
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div key={message.id} className="flex justify-end w-full max-w-3xl mx-auto">
      <div className="rounded-tr-xl rounded-tl-xl rounded-bl-xl bg-secondary text-secondary-foreground px-3 sm:px-4 py-2 sm:py-2.5 max-w-[85%] sm:max-w-[75%] shadow-sm">
        <p className="text-sm leading-relaxed">{visibleText}</p>
      </div>
    </div>
  )
}
