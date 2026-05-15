import { Check, Copy, ExternalLink, Link2, Smartphone } from '@/lib/icons'
import { useMemo, useState } from 'react'
import { useIsMobile } from '@/hooks/use-mobile'
import { useI18n } from '@/components/i18n-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const SHARE_DESTINATIONS = [
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    shortLabel: 'CG',
    url: 'https://chatgpt.com/',
    description: 'Paste the prompt into a new ChatGPT chat.',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    shortLabel: 'GM',
    url: 'https://gemini.google.com/',
    description: 'Open Gemini in a new tab and drop in the shared link.',
  },
  {
    id: 'claude',
    name: 'Claude',
    shortLabel: 'CL',
    url: 'https://claude.ai/',
    description: 'Use Claude to review the same shared transcript.',
  },
  {
    id: 't3chat',
    name: 'T3 Chat',
    shortLabel: 'T3',
    url: 'https://t3.chat/',
    description: 'Send the transcript into T3 Chat with the copied prompt.',
  },
] as const

interface SharedChatSidebarProps {
  shareTitle: string
  shareUrl: string
  messageCount: number
}

export function SharedChatSidebar({ shareTitle, shareUrl, messageCount }: SharedChatSidebarProps) {
  const { t } = useI18n()
  const isMobile = useIsMobile()
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [isNativeSharing, setIsNativeSharing] = useState(false)

  const prompt = useMemo(
    () =>
      [
        t('share.prompt.readTranscript', { shareUrl }),
        t('share.prompt.title', { shareTitle }),
        t('share.prompt.size', { messageCount }),
        t('share.prompt.step1'),
        t('share.prompt.step2'),
        t('share.prompt.step3'),
      ].join('\n'),
    [messageCount, shareTitle, shareUrl, t],
  )

  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  async function copyText(key: string, value: string) {
    await navigator.clipboard.writeText(value)
    setCopiedKey(key)
    window.setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 2000)
  }

  async function handleNativeShare() {
    if (!canNativeShare) {
      return
    }

    setIsNativeSharing(true)

    try {
      await navigator.share({
        title: t('share.openInOtherApps'),
        text: prompt,
        url: shareUrl,
      })
    } finally {
      setIsNativeSharing(false)
    }
  }

  return (
    <aside className="order-first lg:order-last">
      <div className="space-y-4 lg:sticky lg:top-6">
        <Card className="gap-0 rounded-3xl border-border/70 bg-card/95 shadow-sm">
          <CardHeader className="gap-3">
            <div className="flex items-center justify-between gap-3">
              <Badge variant="outline" className="rounded-full px-3 py-1">
                {t('share.aiHandoff')}
              </Badge>
              <span className="text-xs text-muted-foreground">{messageCount} messages</span>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-lg">{t('share.openInOtherApps')}</CardTitle>
              <CardDescription>{t('share.openInOtherAppsDescription')}</CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-6">
            <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-xl border border-border/70 bg-background p-2 text-muted-foreground">
                  <Link2 className="size-4" />
                </div>
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium">{t('share.transcriptUrl')}</p>
                  <p className="break-all font-mono text-xs text-muted-foreground">{shareUrl}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void copyText('link', shareUrl)}
                >
                  {copiedKey === 'link' ? (
                    <Check className="size-4" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                  <span>{copiedKey === 'link' ? t('share.copiedLink') : t('share.copyLink')}</span>
                </Button>

                {isMobile && canNativeShare ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void handleNativeShare()}
                    disabled={isNativeSharing}
                  >
                    <Smartphone className="size-4" />
                    <span>{isNativeSharing ? t('share.sharing') : t('share.sharePrompt')}</span>
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="space-y-3">
              {SHARE_DESTINATIONS.map((destination) => {
                const promptKey = `prompt-${destination.id}`

                return (
                  <div
                    key={destination.id}
                    className="rounded-2xl border border-border/70 bg-background p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-muted/40 text-sm font-semibold">
                        {destination.shortLabel}
                      </div>
                      <div className="min-w-0 space-y-1">
                        <p className="text-sm font-medium">{destination.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {destination.id === 'chatgpt'
                            ? t('share.destination.chatgpt')
                            : destination.id === 'gemini'
                              ? t('share.destination.gemini')
                              : destination.id === 'claude'
                                ? t('share.destination.claude')
                                : t('share.destination.t3chat')}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void copyText(promptKey, prompt)}
                      >
                        {copiedKey === promptKey ? (
                          <Check className="size-4" />
                        ) : (
                          <Copy className="size-4" />
                        )}
                        <span>
                          {copiedKey === promptKey ? t('share.promptCopied') : t('share.copyPrompt')}
                        </span>
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        onClick={() =>
                          window.open(destination.url, '_blank', 'noopener,noreferrer')
                        }
                      >
                        <ExternalLink className="size-4" />
                        <span>{t('share.openApp')}</span>
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </aside>
  )
}
