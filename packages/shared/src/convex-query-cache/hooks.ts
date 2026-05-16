import type {
  OptionalRestArgsOrSkip,
  PaginatedQueryArgs,
  PaginatedQueryReference,
  RequestForQueries,
  UsePaginatedQueryReturnType,
} from 'convex/react'
import { useConvex, useQueries as useQueriesCore } from 'convex/react'
import type {
  FunctionArgs,
  FunctionReference,
  FunctionReturnType,
  PaginationResult,
} from 'convex/server'
import { getFunctionName, paginationOptsValidator } from 'convex/server'
import { useContext, useEffect, useMemo, useState } from 'react'
import { ConvexQueryCacheContext } from './provider'
import {
  ConvexError,
  convexToJson,
  type Infer,
  type Value,
} from 'convex/values'

const uuid =
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID.bind(crypto)
    : () =>
        Math.random().toString(36).substring(2) +
        Math.random().toString(36).substring(2)

/**
 * Load a variable number of reactive Convex queries, utilizing
 * the query cache.
 *
 * This hook accepts an object whose keys are identifiers for each query and the
 * values are objects of `{ query: FunctionReference, args: Record<string, Value> }`.
 *
 * @public
 */
export function useQueries(
  queries: RequestForQueries,
): Record<string, undefined | Error | any> {
  const { registry } = useContext(ConvexQueryCacheContext)
  if (registry === null) {
    throw new Error(
      'Could not find `ConvexQueryCacheContext`! This `useQuery` implementation must be used in the React component ' +
        'tree under `ConvexQueryCacheProvider`. Did you forget it? ',
    )
  }
  const queryKeys: Record<string, string> = {}
  for (const [key, { query, args }] of Object.entries(queries)) {
    queryKeys[key] = createQueryKey(query, args)
  }

  useEffect(
    () => {
      const ids: string[] = []
      for (const [key, { query, args }] of Object.entries(queries)) {
        const id = uuid()
        registry.start(id, queryKeys[key]!, query, args)
        ids.push(id)
      }
      return () => {
        for (const id of ids) {
          registry.end(id)
        }
      }
    },
    // Safe to ignore query and args since queryKey is derived from them
    [registry, JSON.stringify(queryKeys)],
  )
  const memoizedQueries = useMemo(() => queries, [JSON.stringify(queryKeys)])
  return useQueriesCore(memoizedQueries)
}

/**
 * Load a reactive query within a React component (cache-aware).
 *
 * @public
 */
export function useQuery<Query extends FunctionReference<'query'>>(
  query: Query,
  ...queryArgs: OptionalRestArgsOrSkip<Query>
): FunctionReturnType<Query> | undefined {
  const args = queryArgs[0] ?? {}
  const results = useQueries(
    args === 'skip'
      ? {}
      : {
          _default: { query, args },
        },
  )

  const result = results._default
  if (result instanceof Error) {
    throw result
  }
  return result
}

function createQueryKey<Query extends FunctionReference<'query'>>(
  query: Query,
  args: FunctionArgs<Query>,
): string {
  const queryString = getFunctionName(query)
  const key = [queryString, convexToJson(args)]
  return JSON.stringify(key)
}

// NOTE: We use the same ID so it's always cached, but it can mean a split is
// required off the bat if it's an old stale query result.
function nextPaginationId(): number {
  return 0
}

// NOTE: Adapted from convex-helpers react/cache, using cached useQueries.

type QueryPageKey = number

type UsePaginatedQueryState = {
  query: FunctionReference<'query'>
  args: Record<string, Value>
  id: number
  nextPageKey: QueryPageKey
  pageKeys: QueryPageKey[]
  queries: Record<
    QueryPageKey,
    {
      query: FunctionReference<'query'>
      args: { paginationOpts: Infer<typeof paginationOptsValidator> }
    }
  >
  ongoingSplits: Record<QueryPageKey, [QueryPageKey, QueryPageKey]>
  skip: boolean
}

const splitQuery =
  (key: QueryPageKey, splitCursor: string, continueCursor: string) =>
  (prevState: UsePaginatedQueryState) => {
    const queries = { ...prevState.queries }
    const splitKey1 = prevState.nextPageKey
    const splitKey2 = prevState.nextPageKey + 1
    const nextPageKey = prevState.nextPageKey + 2
    queries[splitKey1] = {
      query: prevState.query,
      args: {
        ...prevState.args,
        paginationOpts: {
          ...prevState.queries[key]!.args.paginationOpts,
          endCursor: splitCursor,
        },
      },
    }
    queries[splitKey2] = {
      query: prevState.query,
      args: {
        ...prevState.args,
        paginationOpts: {
          ...prevState.queries[key]!.args.paginationOpts,
          cursor: splitCursor,
          endCursor: continueCursor,
        },
      },
    }
    const ongoingSplits = { ...prevState.ongoingSplits }
    ongoingSplits[key] = [splitKey1, splitKey2]
    return {
      ...prevState,
      nextPageKey,
      queries,
      ongoingSplits,
    }
  }

const completeSplitQuery =
  (key: QueryPageKey) => (prevState: UsePaginatedQueryState) => {
    const completedSplit = prevState.ongoingSplits[key]
    if (completedSplit === undefined) {
      return prevState
    }
    const queries = { ...prevState.queries }
    delete queries[key]
    const ongoingSplits = { ...prevState.ongoingSplits }
    delete ongoingSplits[key]
    let pageKeys = prevState.pageKeys.slice()
    const pageIndex = prevState.pageKeys.findIndex((v) => v === key)
    if (pageIndex >= 0) {
      pageKeys = [
        ...prevState.pageKeys.slice(0, pageIndex),
        ...completedSplit,
        ...prevState.pageKeys.slice(pageIndex + 1),
      ]
    }
    return {
      ...prevState,
      queries,
      pageKeys,
      ongoingSplits,
    }
  }

/**
 * Paginated query hook that uses the query cache (convex-helpers-style).
 *
 * @public
 */
export function usePaginatedQuery<Query extends PaginatedQueryReference>(
  query: Query,
  args: PaginatedQueryArgs<Query> | 'skip',
  options: {
    initialNumItems: number
    /**
     * Set this to true if you are using the `stream` or `paginator` helpers.
     */
    customPagination?: boolean
  },
): UsePaginatedQueryReturnType<Query> {
  if (
    typeof options?.initialNumItems !== 'number' ||
    options.initialNumItems <= 0
  ) {
    throw new Error(
      `\`options.initialNumItems\` must be a positive number. Received \`${options?.initialNumItems}\`.`,
    )
  }
  const skip = args === 'skip'
  const argsObject = skip ? {} : args
  const queryName = getFunctionName(query)
  const createInitialState = useMemo(() => {
    return () => {
      const id = nextPaginationId()
      return {
        query,
        args: argsObject as Record<string, Value>,
        id,
        nextPageKey: 1,
        pageKeys: skip ? [] : [0],
        queries: skip
          ? ({} as UsePaginatedQueryState['queries'])
          : {
              0: {
                query,
                args: {
                  ...argsObject,
                  paginationOpts: {
                    numItems: options.initialNumItems,
                    cursor: null,
                    id,
                  },
                },
              },
            },
        ongoingSplits: {},
        skip,
      }
    }
  }, [
    JSON.stringify(convexToJson(argsObject as Value)),
    queryName,
    options.initialNumItems,
    skip,
  ])

  const [state, setState] =
    useState<UsePaginatedQueryState>(createInitialState)

  let currState = state
  if (
    skip !== state.skip ||
    getFunctionName(query) !== getFunctionName(state.query) ||
    JSON.stringify(convexToJson(argsObject as Value)) !==
      JSON.stringify(convexToJson(state.args))
  ) {
    currState = createInitialState()
    setState(currState)
  }
  const convexClient = useConvex()
  const logger = convexClient.logger

  const resultsObject = useQueries(currState.queries)

  const [results, maybeLastResult]: [
    Value[],
    undefined | PaginationResult<Value>,
  ] = useMemo(() => {
    let currResult: PaginationResult<Value> | undefined = undefined

    const allItems: Value[] = []
    for (const pageKey of currState.pageKeys) {
      const entry = resultsObject[pageKey]
      if (entry === undefined) {
        break
      }

      if (entry instanceof Error) {
        if (
          entry.message.includes('InvalidCursor') ||
          (entry instanceof ConvexError &&
            typeof entry.data === 'object' &&
            entry.data !== null &&
            'isConvexSystemError' in entry.data &&
            Reflect.get(entry.data, 'isConvexSystemError') === true &&
            'paginationError' in entry.data &&
            Reflect.get(entry.data, 'paginationError') === 'InvalidCursor')
        ) {
          logger.warn(
            'usePaginatedQuery hit error, resetting pagination state: ' +
              entry.message,
          )
          setState(createInitialState)
          return [[], undefined]
        } else {
          throw entry
        }
      }
      const pageResult: PaginationResult<Value> = entry
      currResult = pageResult
      const ongoingSplit = currState.ongoingSplits[pageKey]
      if (ongoingSplit !== undefined) {
        if (
          resultsObject[ongoingSplit[0]] !== undefined &&
          resultsObject[ongoingSplit[1]] !== undefined
        ) {
          setState(completeSplitQuery(pageKey))
        }
      } else if (
        pageResult.splitCursor &&
        (pageResult.pageStatus === 'SplitRecommended' ||
          pageResult.pageStatus === 'SplitRequired' ||
          (options.customPagination
            ? pageResult.page.length > options.initialNumItems
            : pageResult.page.length > options.initialNumItems * 2))
      ) {
        setState(
          splitQuery(
            pageKey,
            pageResult.splitCursor,
            pageResult.continueCursor,
          ),
        )
      }
      if (pageResult.pageStatus === 'SplitRequired') {
        return [allItems, undefined]
      }
      allItems.push(...pageResult.page)
    }
    return [allItems, currResult]
  }, [
    resultsObject,
    currState.pageKeys,
    currState.ongoingSplits,
    options.initialNumItems,
    options.customPagination,
    createInitialState,
    logger,
  ])

  const statusObject = useMemo(() => {
    if (maybeLastResult === undefined && currState.pageKeys.length <= 1) {
      return {
        status: 'LoadingFirstPage',
        isLoading: true,
        loadMore: (_numItems: number) => {
          // Intentional noop.
        },
      } as const
    } else if (
      maybeLastResult === undefined ||
      (options.customPagination &&
        currState.ongoingSplits[currState.pageKeys.at(-1)!] !== undefined)
    ) {
      return {
        status: 'LoadingMore',
        isLoading: true,
        loadMore: (_numItems: number) => {
          // Intentional noop.
        },
      } as const
    }
    if (maybeLastResult.isDone) {
      return {
        status: 'Exhausted',
        isLoading: false,
        loadMore: (_numItems: number) => {
          // Intentional noop.
        },
      } as const
    }
    const continueCursor = maybeLastResult.continueCursor
    let alreadyLoadingMore = false
    return {
      status: 'CanLoadMore',
      isLoading: false,
      loadMore: (numItems: number) => {
        if (!alreadyLoadingMore) {
          alreadyLoadingMore = true
          setState((prevState) => {
            let nextPageKey = prevState.nextPageKey
            const queries = { ...prevState.queries }
            let ongoingSplits = prevState.ongoingSplits
            let pageKeys = prevState.pageKeys
            if (options.customPagination) {
              const lastPageKey = prevState.pageKeys.at(-1)!
              const boundLastPageKey = nextPageKey
              queries[boundLastPageKey] = {
                query: prevState.query,
                args: {
                  ...prevState.args,
                  paginationOpts: {
                    ...queries[lastPageKey]!.args.paginationOpts,
                    endCursor: continueCursor,
                  },
                },
              }
              nextPageKey++
              ongoingSplits = {
                ...ongoingSplits,
                [lastPageKey]: [boundLastPageKey, nextPageKey],
              }
            } else {
              pageKeys = [...prevState.pageKeys, nextPageKey]
            }
            queries[nextPageKey] = {
              query: prevState.query,
              args: {
                ...prevState.args,
                paginationOpts: {
                  numItems,
                  cursor: continueCursor,
                  id: prevState.id,
                },
              },
            }
            nextPageKey++
            return {
              ...prevState,
              pageKeys,
              nextPageKey,
              queries,
              ongoingSplits,
            }
          })
        }
      },
    } as const
  }, [
    maybeLastResult,
    currState.pageKeys,
    currState.nextPageKey,
    options.customPagination,
  ])

  return {
    results,
    ...statusObject,
  }
}
