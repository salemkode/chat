import type {
  ModelDialogCollection,
  ModelDialogItem,
  ModelSidebarFilter,
  ModelSidebarItem,
} from './model-dialog.types'

function getProviderId(model: ModelDialogItem) {
  return model.provider?._id ?? 'other'
}

function getProviderName(model: ModelDialogItem) {
  return model.provider?.name?.trim() || 'Other providers'
}

export function filtersMatch(
  left: ModelSidebarFilter,
  right: ModelSidebarFilter,
) {
  if (left.kind !== right.kind) {
    return false
  }

  switch (left.kind) {
    case 'favorites':
      return true
    case 'collection':
    case 'provider':
      return 'id' in right && left.id === right.id
  }
}

export function buildModelSidebarItems(
  models: ModelDialogItem[],
  collections: ModelDialogCollection[],
): ModelSidebarItem[] {
  const modelIds = new Set(models.map((model) => model.id))
  const favoritesCount = models.filter((model) => model.isFavorite).length

  const collectionItems = collections
    .map((collection) => {
      const count = collection.modelIds.filter((id) => modelIds.has(id)).length
      return {
        key: `collection:${collection.id}`,
        filter: { kind: 'collection', id: collection.id } as const,
        label: collection.name,
        description: collection.description,
        count,
        iconKind: 'collection' as const,
      }
    })
    .filter((collection) => collection.count > 0)

  const providerMap = new Map<
    string,
    {
      label: string
      count: number
      provider: ModelDialogItem['provider']
      sortOrder: number
    }
  >()

  for (const model of models) {
    const id = getProviderId(model)
    const current = providerMap.get(id)
    if (current) {
      current.count += 1
      continue
    }
    providerMap.set(id, {
      label: getProviderName(model),
      count: 1,
      provider: model.provider,
      sortOrder: model.sortOrder,
    })
  }

  const providerItems = [...providerMap.entries()]
    .map(([id, provider]) => ({
      key: `provider:${id}`,
      filter: { kind: 'provider', id } as const,
      label: provider.label,
      count: provider.count,
      iconKind: 'provider' as const,
      provider: provider.provider,
      sortOrder: provider.sortOrder,
    }))
    .sort((left, right) => {
      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder
      }
      return left.label.localeCompare(right.label)
    })

  return [
    {
      key: 'favorites',
      filter: { kind: 'favorites' },
      label: 'Favorites',
      count: favoritesCount,
      iconKind: 'favorites',
    },
    ...collectionItems,
    ...providerItems,
  ]
}

export function getDefaultModelSidebarFilter(
  items: ModelSidebarItem[],
): ModelSidebarFilter {
  const favoritesItem =
    items.find(
      (item) => item.filter.kind === 'favorites' && item.count > 0,
    )?.filter ?? null
  if (favoritesItem) {
    return favoritesItem
  }

  const collectionItem =
    items.find(
      (item) => item.filter.kind === 'collection' && item.count > 0,
    )?.filter ?? null
  if (collectionItem) {
    return collectionItem
  }

  const providerItem =
    items.find((item) => item.filter.kind === 'provider')?.filter ?? null
  return providerItem ?? { kind: 'favorites' }
}

export function filterModelDialogItems(
  models: ModelDialogItem[],
  collections: ModelDialogCollection[],
  query: string,
  activeFilter: ModelSidebarFilter,
): ModelDialogItem[] {
  let next = models

  if (activeFilter.kind === 'favorites') {
    next = next.filter((model) => model.isFavorite)
  }

  if (activeFilter.kind === 'collection') {
    const collection = collections.find(
      (entry) => entry.id === activeFilter.id,
    )
    const modelIds = new Set(collection?.modelIds ?? [])
    next = next.filter((model) => modelIds.has(model.id))
  }

  if (activeFilter.kind === 'provider') {
    next = next.filter((model) => getProviderId(model) === activeFilter.id)
  }

  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) {
    return next
  }

  return next.filter((model) => {
    if (model.displayName.toLowerCase().includes(normalizedQuery)) return true
    if (model.modelId.toLowerCase().includes(normalizedQuery)) return true
    if (model.description?.toLowerCase().includes(normalizedQuery)) return true
    if (model.provider?.name?.toLowerCase().includes(normalizedQuery)) return true
    return model.capabilities?.some((capability) =>
      capability.toLowerCase().includes(normalizedQuery),
    )
  })
}

export function sortModelDialogItems(
  models: ModelDialogItem[],
  selectedModelId: string | null,
) {
  return [...models].sort((left, right) => {
    const leftSelected = left.modelId === selectedModelId
    const rightSelected = right.modelId === selectedModelId
    if (Number(rightSelected) !== Number(leftSelected)) {
      return Number(rightSelected) - Number(leftSelected)
    }
    if (Number(right.isFavorite) !== Number(left.isFavorite)) {
      return Number(right.isFavorite) - Number(left.isFavorite)
    }
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder
    }
    return left.displayName.localeCompare(right.displayName)
  })
}

export function getModelDialogEmptyText(activeFilter: ModelSidebarFilter) {
  if (activeFilter.kind === 'collection') {
    return 'No models in this collection match.'
  }
  if (activeFilter.kind === 'provider') {
    return 'No models from this provider match.'
  }
  return 'No favorite models match.'
}
