/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, no-underscore-dangle -- Convex hooks */
import { useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { AdminOutletContext } from '@/components/admin/admin-outlet-context'
import { AdminCollectionAiDialog } from '@/components/admin/admin-collection-ai-dialog'
import { EntityIcon } from '@/components/admin/entity-icon'
import {
  AdminEmptyState,
  AdminRecord,
  AdminSectionCard,
  AdminStatPill,
} from '@/components/admin/admin-surface'
import type { AdminModelCollection, IconType } from '@/components/admin/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { InfiniteScrollTrigger } from '@/components/infinite-scroll-trigger'
import { usePaginatedQuery } from '@/lib/convex-query-cache'

function normalizeIconType(value: string | undefined): IconType {
  if (value === 'emoji' || value === 'phosphor' || value === 'upload') {
    return value
  }
  return undefined
}

type AdminCollectionsPanelProps = Pick<
  AdminOutletContext,
  'dashboard' | 'onOpenCollectionDialog' | 'onOpenCollectionDraft'
>

export function AdminCollectionsPanel({
  dashboard,
  onOpenCollectionDialog,
  onOpenCollectionDraft,
}: AdminCollectionsPanelProps) {
  const deleteModelCollection = useMutation(api.admin.deleteModelCollection)
  const collectionsQuery = usePaginatedQuery(api.admin.listAdminCollections, {}, { initialNumItems: 50 })
  const collections = collectionsQuery.results ?? []

  return (
    <AdminSectionCard
      eyebrow="Collections"
      title="Curated bundles"
      description="Collections use the same compact structure as the rest of admin: identity first, quick counts in the middle, and editing actions kept to the edge."
      action={
        <AdminCollectionAiDialog
          models={dashboard.models}
          defaultAuxiliaryModelId={dashboard.settings.defaultAuxiliaryModelId}
          onOpenCollectionDraft={onOpenCollectionDraft}
        />
      }
    >
      {collectionsQuery.results === undefined ? (
        <div className="flex justify-center py-12 text-sm text-muted-foreground">
          Loading collections...
        </div>
      ) : collections.length > 0 ? (
        <div className="grid gap-3">
          {collections.map((collection: AdminModelCollection) => {
            const hiddenModels = collection.models.filter(
              (model: AdminModelCollection['models'][number]) => !model.isEnabled,
            ).length

            return (
              <AdminRecord
                key={collection._id}
                icon={
                  <EntityIcon
                    icon={collection.icon}
                    iconType={normalizeIconType(collection.iconType)}
                    iconUrl={collection.iconUrl}
                    className="size-5"
                  />
                }
                title={collection.name}
                subtitle={collection.description || 'No description yet.'}
                badges={
                  <>
                    <Badge variant="secondary">{collection.modelCount} models</Badge>
                    {hiddenModels > 0 ? <Badge variant="outline">{hiddenModels} hidden</Badge> : null}
                  </>
                }
                summary={
                  <div className="flex flex-wrap gap-2">
                    {collection.models
                      .slice(0, 4)
                      .map((model: AdminModelCollection['models'][number]) => (
                        <Badge key={model._id} variant="outline" className="gap-1.5">
                          <span>{model.displayName}</span>
                          <span className="text-muted-foreground">({model.providerName})</span>
                        </Badge>
                      ))}
                    {collection.modelCount > 4 ? (
                      <Badge variant="outline">+{collection.modelCount - 4} more</Badge>
                    ) : null}
                  </div>
                }
                metrics={
                  <>
                    <AdminStatPill label="Sort order" value={String(collection.sortOrder)} />
                    <AdminStatPill
                      label="Visible"
                      value={String(collection.modelCount - hiddenModels)}
                    />
                    <AdminStatPill label="Hidden" value={String(hiddenModels)} />
                  </>
                }
                actions={
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onOpenCollectionDialog(collection)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => void deleteModelCollection({ id: collection._id })}
                    >
                      Delete
                    </Button>
                  </div>
                }
              />
            )
          })}
          <InfiniteScrollTrigger
            hasMore={
              collectionsQuery.status === 'CanLoadMore' ||
              collectionsQuery.status === 'LoadingMore'
            }
            isLoadingMore={collectionsQuery.status === 'LoadingMore'}
            onLoadMore={() => collectionsQuery.loadMore(50)}
            loadingLabel="Loading more collections..."
          />
        </div>
      ) : (
        <AdminEmptyState
          title="No collections yet"
          description="Create a collection from the active catalog to group models for common workflows or merchandising themes."
        />
      )}
    </AdminSectionCard>
  )
}
