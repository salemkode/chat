/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- Convex hooks */
import { useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { AdminOutletContext } from '@/components/admin/admin-outlet-context'
import type { AdminModelCollection } from '@/components/admin/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type AdminCollectionsPanelProps = Pick<
  AdminOutletContext,
  'dashboard' | 'onOpenCollectionDialog'
>

export function AdminCollectionsPanel({
  dashboard,
  onOpenCollectionDialog,
}: AdminCollectionsPanelProps) {
  const deleteModelCollection = useMutation(api.admin.deleteModelCollection)
  const collections = dashboard.collections

  return (
    <div className="grid gap-4">
      <Card className="border-border bg-card shadow-[0_18px_50px_rgba(15,23,42,0.08)] dark:shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
        <CardHeader>
          <CardTitle>Collections</CardTitle>
          <CardDescription>
            Curate reusable groups of existing models without duplicating their
            configuration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Collection</TableHead>
                <TableHead>Models</TableHead>
                <TableHead>Sort</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {collections.length > 0 ? (
                collections.map((collection: AdminModelCollection) => {
                  const hiddenModels = collection.models.filter(
                    (model: AdminModelCollection['models'][number]) =>
                      !model.isEnabled,
                  ).length

                  return (
                    <TableRow key={collection._id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{collection.name}</p>
                            <Badge variant="secondary">
                              {collection.modelCount} models
                            </Badge>
                          </div>
                          {collection.description ? (
                            <p className="max-w-xl text-sm text-muted-foreground">
                              {collection.description}
                            </p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {collection.models
                            .slice(0, 4)
                            .map(
                              (
                                model: AdminModelCollection['models'][number],
                              ) => (
                                <Badge
                                  key={model._id}
                                  variant="outline"
                                  className="gap-1.5"
                                >
                                  <span>{model.displayName}</span>
                                  <span className="text-muted-foreground">
                                    ({model.providerName})
                                  </span>
                                </Badge>
                              ),
                            )}
                          {collection.modelCount > 4 ? (
                            <Badge variant="outline">
                              +{collection.modelCount - 4} more
                            </Badge>
                          ) : null}
                          {hiddenModels > 0 ? (
                            <Badge variant="secondary">
                              {hiddenModels} hidden
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>{collection.sortOrder}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              onOpenCollectionDialog(collection)
                            }
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() =>
                              void deleteModelCollection({ id: collection._id })
                            }
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    No collections yet. Create one from the current model
                    catalog.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
