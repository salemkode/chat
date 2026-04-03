import { useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Check, Copy, ExternalLink, Loader2, Share2 } from '@/lib/icons'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { DialogHeader } from '@/components/ui/dialog'
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-overlay'
import { Input } from '@/components/ui/input'

interface ShareChatDialogProps {
  threadId: string
  threadTitle: string
}

export function ShareChatDialog({
  threadId,
  threadTitle,
}: ShareChatDialogProps) {
  const createOrUpdateChatShare = useMutation(
    api.shares.createOrUpdateChatShare,
  )
  const [open, setOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [shareToken, setShareToken] = useState<string | null>(null)
  const [messageCount, setMessageCount] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const shareUrl = useMemo(() => {
    if (!shareToken || typeof window === 'undefined') {
      return ''
    }

    return new URL(`/share/${shareToken}`, window.location.origin).toString()
  }, [shareToken])

  async function generateShare() {
    setIsCreating(true)
    setError(null)

    try {
      const result = await createOrUpdateChatShare({ threadId })
      setShareToken(result.token)
      setMessageCount(result.messageCount)
    } catch (shareError) {
      setError(
        shareError instanceof Error
          ? shareError.message
          : 'Failed to create a share link',
      )
    } finally {
      setIsCreating(false)
    }
  }

  async function handleCopy() {
    if (!shareUrl) {
      return
    }

    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)

    if (!nextOpen) {
      return
    }

    setCopied(false)
    void generateShare()
  }

  return (
    <ResponsiveModal open={open} onOpenChange={handleOpenChange}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleOpenChange(true)}
      >
        <Share2 className="size-4" />
        <span>Share</span>
      </Button>

      <ResponsiveModalContent size="small">
        <DialogHeader>
          <ResponsiveModalTitle>Share chat</ResponsiveModalTitle>
          <ResponsiveModalDescription>
            This link publishes only the chat transcript for{' '}
            <span className="font-medium text-foreground">{threadTitle}</span>.
            It excludes sidebar, projects, models, and other workspace context.
            The shared page is a fixed snapshot of the current chat.
          </ResponsiveModalDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
            {isCreating ? (
              <div className="flex items-center gap-2 text-foreground">
                <Loader2 className="size-4 animate-spin" />
                <span>Preparing your shared transcript...</span>
              </div>
            ) : error ? (
              <div className="space-y-3">
                <p className="text-destructive">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void generateShare()}
                >
                  Try again
                </Button>
              </div>
            ) : shareUrl ? (
              <div className="space-y-3">
                <p>
                  Anyone with this link can view the full shared chat.
                  {typeof messageCount === 'number'
                    ? ` Current snapshot: ${messageCount} messages.`
                    : ''}
                </p>
                <p>
                  The shared page includes a handoff sidebar for ChatGPT,
                  Gemini, Claude, and T3 Chat.
                </p>
                <div className="flex gap-2">
                  <Input value={shareUrl} readOnly aria-label="Share URL" />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => void handleCopy()}
                  >
                    {copied ? (
                      <Check className="size-4" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                    <span className="sr-only">Copy share link</span>
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Later changes to this chat will not appear in this shared link.
              Create a new share if you want an updated snapshot.
            </p>

            {shareUrl ? (
              <Button
                type="button"
                onClick={() =>
                  window.open(shareUrl, '_blank', 'noopener,noreferrer')
                }
              >
                <ExternalLink className="size-4" />
                <span>Open share page</span>
              </Button>
            ) : null}
          </div>
        </div>
      </ResponsiveModalContent>
    </ResponsiveModal>
  )
}
