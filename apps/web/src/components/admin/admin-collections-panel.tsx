/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, no-underscore-dangle -- Convex hooks */
import { useMutation } from 'convex/react'
import { normalizeIconType } from '@chat/core/admin-types'
import { api } from '@convex/_generated/api'
import type { AdminOutletContext } from '@/components/admin/admin-outlet-context'
import { AdminCollectionAiDialog } from '@/components/admin/admin-collection-ai-dialog'
import { EntityIcon } from '@/components/admin/entity-icon'
import { Plus } from '@/lib/icons'
import {
  AdminEmptyState,
  AdminRecord,
  AdminSectionCard,
  AdminStatPill,
} from '@/components/admin/admin-surface'
import type { AdminModelCollection } from '@/components/admin/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { InfiniteScrollTrigger } from '@/components/infinite-scroll-trigger'
import { usePaginatedQuery } from '@/lib/convex-query-cache'

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
  const collectionsQuery = usePaginatedQuery(
    api.admin.listAdminCollections,
    {},
    { initialNumItems: 50 },
  )
  const collections = collectionsQuery.results ?? []

  return (
    <AdminSectionCard
      eyebrow="Collections"
      title="Curated bundles"
      description="Create collections manually from the unassigned catalog, or let AI draft a set first and approve only the ones you want to keep."
      action={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => onOpenCollectionDialog()}>
            <Plus className="mr-2 size-4" />
            Add manually
          </Button>
          <AdminCollectionAiDialog
            models={dashboard.models}
            defaultAuxiliaryModelId={dashboard.settings.defaultAuxiliaryModelId}
            onOpenCollectionDraft={onOpenCollectionDraft}
          />
        </div>
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
                    {hiddenModels > 0 ? (
                      <Badge variant="outline">{hiddenModels} hidden</Badge>
                    ) : null}
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
              collectionsQuery.status === 'CanLoadMore' || collectionsQuery.status === 'LoadingMore'
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
