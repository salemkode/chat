// Generic over the collectionId shape so callers that pass a typed Convex
// `Id<"modelCollections">` keep that type through to the query args (no casts).
export type ModelBrowserQueryOptions<T extends string = string> = {
  collectionId?: T
  favoritesOnly?: boolean
  searchQuery?: string
}

export const MODEL_BROWSER_INITIAL_NUM_ITEMS = 60
export const MODEL_BROWSER_LOAD_MORE_NUM_ITEMS = 60
export const MODEL_BROWSER_PREFETCH_NUM_ITEMS = 100

export function buildModelBrowserQueryArgs<T extends string = string>(
  options: ModelBrowserQueryOptions<T> = {},
) {
  const args: {
    collectionId?: T
    favoritesOnly?: boolean
    query?: string
  } = {}

  if (options.collectionId) {
    args.collectionId = options.collectionId
  }
  if (options.favoritesOnly) {
    args.favoritesOnly = true
  }
  if (options.searchQuery?.trim()) {
    args.query = options.searchQuery.trim()
  }

  return args
}

export function hasModelBrowserQueryFilters<T extends string = string>(
  options: ModelBrowserQueryOptions<T> = {},
) {
  return Boolean(
    options.collectionId || options.favoritesOnly || options.searchQuery?.trim(),
  )
}
