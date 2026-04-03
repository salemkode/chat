import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Paperclip, Smile } from '@/lib/icons'
import { useState } from 'react'

interface ChatInputProps {
  onSendMessage: (text: string) => Promise<void>
  hasActiveThread: boolean
}

export function ChatInput({ onSendMessage, hasActiveThread }: ChatInputProps) {
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || sending) return

    setSending(true)
    const text = input
    setInput('')

    try {
      await onSendMessage(text)
    } catch (error) {
      console.error('Failed to send message:', error)
      setInput(text)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="p-4 border-t border-border bg-background">
      <div className="max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="relative">
          <Input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={hasActiveThread ? 'Message...' : 'Start a new chat...'}
            className="w-full bg-secondary border border-border rounded-xl pl-12 pr-24 py-3.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <Paperclip className="h-4 w-4" />
            <span className="sr-only">Attach file</span>
          </Button>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <Smile className="h-4 w-4" />
              <span className="sr-only">Add emoji</span>
            </Button>
            <Button
              type="submit"
              size="sm"
              className="h-8 px-3"
              disabled={sending || !input.trim()}
            >
              {sending ? 'Sending...' : <Send className="h-4 w-4" />}
              <span className="sr-only">Send</span>
            </Button>
          </div>
        </form>
        <p className="text-center mt-2 text-[10px] text-muted-foreground">
          AI can make mistakes. Check important info.
        </p>
      </div>
    </div>
  )
}
