export type ModelBrowserQueryOptions = {
  collectionId?: string
  favoritesOnly?: boolean
  searchQuery?: string
}

export const MODEL_BROWSER_INITIAL_NUM_ITEMS = 60
export const MODEL_BROWSER_LOAD_MORE_NUM_ITEMS = 60
export const MODEL_BROWSER_PREFETCH_NUM_ITEMS = 100

export function buildModelBrowserQueryArgs(options: ModelBrowserQueryOptions = {}) {
  const args: {
    collectionId?: string
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

export function hasModelBrowserQueryFilters(options: ModelBrowserQueryOptions = {}) {
  return Boolean(
    options.collectionId || options.favoritesOnly || options.searchQuery?.trim(),
  )
}
