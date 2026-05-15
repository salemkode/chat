import { useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Check, Copy, ExternalLink, Loader2, Share2 } from '@/lib/icons'
import { useMemo, useState } from 'react'
import { useI18n } from '@/components/i18n-provider'
import { useHotkeyAction } from '@/components/hotkeys-provider'
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

export function ShareChatDialog({ threadId, threadTitle }: ShareChatDialogProps) {
  const { t } = useI18n()
  const createOrUpdateChatShare = useMutation(api.shares.createOrUpdateChatShare)
  const [open, setOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [shareToken, setShareToken] = useState<string | null>(null)
  const [messageCount, setMessageCount] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useHotkeyAction('shareChat', () => {
    handleOpenChange(true)
  })

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
      setError(shareError instanceof Error ? shareError.message : t('share.createError'))
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
      <Button variant="outline" size="sm" onClick={() => handleOpenChange(true)}>
        <Share2 className="size-4" />
        <span>{t('common.share')}</span>
      </Button>

      <ResponsiveModalContent size="small">
        <DialogHeader>
          <ResponsiveModalTitle>{t('share.title')}</ResponsiveModalTitle>
          <ResponsiveModalDescription>{t('share.description', { threadTitle })}</ResponsiveModalDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
            {isCreating ? (
              <div className="flex items-center gap-2 text-foreground">
                <Loader2 className="size-4 animate-spin" />
                <span>{t('share.preparing')}</span>
              </div>
            ) : error ? (
              <div className="space-y-3">
                <p className="text-destructive">{error}</p>
                <Button variant="outline" size="sm" onClick={() => void generateShare()}>
                  {t('share.tryAgain')}
                </Button>
              </div>
            ) : shareUrl ? (
              <div className="space-y-3">
                <p>
                  {typeof messageCount === 'number'
                    ? t('share.snapshotWithCount', { count: messageCount })
                    : t('share.snapshotWithoutCount')}
                </p>
                <p>{t('share.handoff')}</p>
                <div className="flex gap-2">
                  <Input value={shareUrl} readOnly aria-label={t('share.urlAria')} />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => void handleCopy()}
                  >
                    {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                    <span className="sr-only">{t('share.copy')}</span>
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{t('share.snapshotNotice')}</p>

            {shareUrl ? (
              <Button
                type="button"
                onClick={() => window.open(shareUrl, '_blank', 'noopener,noreferrer')}
              >
                <ExternalLink className="size-4" />
                <span>{t('share.open')}</span>
              </Button>
            ) : null}
          </div>
        </div>
      </ResponsiveModalContent>
    </ResponsiveModal>
  )
}
