import { Link, createFileRoute } from '@tanstack/react-router'
import { formatDistanceToNow } from 'date-fns'
import { Loader2, MessageSquareText, MoveRight } from '@/lib/icons'
import { useEffect } from 'react'
import { api } from '@convex/_generated/api'
import { SharedChatSidebar } from '@/components/chat/SharedChatSidebar'
import { MarkdownContent } from '@/components/MarkdownContent'
import { Button } from '@/components/ui/button'
import { usePaginatedQuery, useQuery } from '@/lib/convex-query-cache'

export const Route = createFileRoute('/share/$shareId')({
  ssr: false,
  component: SharedChatPage,
})

function SharedChatPage() {
  const { shareId } = Route.useParams()
  const share = useQuery(api.shares.getChatShare, { token: shareId })
  const shareUrl = typeof window === 'undefined' ? '' : window.location.href
  const { results, status, loadMore } = usePaginatedQuery(
    api.shares.listChatShareMessages,
    { token: shareId },
    { initialNumItems: 50 },
  )

  useEffect(() => {
    if (status === 'CanLoadMore') {
      loadMore(50)
    }
  }, [loadMore, status])

  if (share === undefined) {
    return <SharedChatLoadingState />
  }

  if (share === null) {
    return <SharedChatNotFoundState />
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 sm:py-8">
        <header className="flex flex-col gap-4 border-b border-border/70 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-muted/30 px-3 py-1 text-xs font-medium text-muted-foreground">
              <MessageSquareText className="size-3.5" />
              <span>Shared chat</span>
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {share.title}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {share.messageCount} messages shared{' '}
                {formatDistanceToNow(new Date(share.updatedAt), {
                  addSuffix: true,
                })}
              </p>
            </div>
          </div>

          <Button asChild className="self-start sm:self-auto">
            <Link to="/">
              <span>Continue on chat</span>
              <MoveRight className="size-4" />
            </Link>
          </Button>
        </header>

        <section className="flex-1 py-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
            <div className="min-w-0">
              <div className="mx-auto w-full max-w-3xl space-y-6 lg:mx-0 lg:max-w-none">
                {results.map((message) => (
                  <article
                    key={`${message.order}-${message.role}`}
                    className={
                      message.role === 'user'
                        ? 'flex justify-end'
                        : 'flex justify-start'
                    }
                  >
                    {message.role === 'user' ? (
                      <div className="max-w-[85%] rounded-3xl rounded-br-md bg-secondary px-4 py-3 text-sm leading-relaxed text-secondary-foreground shadow-sm sm:max-w-[75%]">
                        <p className="whitespace-pre-wrap break-words">
                          {message.text}
                        </p>
                      </div>
                    ) : (
                      <div className="w-full rounded-3xl border border-border/60 bg-background px-4 py-4 shadow-xs">
                        <MarkdownContent content={message.text} />
                      </div>
                    )}
                  </article>
                ))}

                {status === 'LoadingFirstPage' || status === 'LoadingMore' ? (
                  <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    <span>Loading transcript...</span>
                  </div>
                ) : null}
              </div>
            </div>

            <SharedChatSidebar
              shareTitle={share.title}
              shareUrl={shareUrl}
              messageCount={share.messageCount}
            />
          </div>
        </section>
      </div>
    </main>
  )
}

function SharedChatLoadingState() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-muted/30 px-5 py-4 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        <span>Loading shared chat...</span>
      </div>
    </main>
  )
}

function SharedChatNotFoundState() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div className="w-full max-w-md rounded-3xl border border-border/70 bg-background p-6 text-center shadow-xs">
        <h1 className="text-xl font-semibold">Shared chat not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This link is unavailable or no longer exists.
        </p>
        <Button asChild className="mt-5">
          <Link to="/">
            <span>Continue on chat</span>
            <MoveRight className="size-4" />
          </Link>
        </Button>
      </div>
    </main>
  )
}
