import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useCallback, useEffect, useMemo } from "react";
import type { FunctionReturnType } from "convex/server";
import type { Id } from "@convex/_generated/dataModel";
import {
  MODEL_BROWSER_INITIAL_NUM_ITEMS,
  MODEL_BROWSER_LOAD_MORE_NUM_ITEMS,
  MODEL_BROWSER_PREFETCH_NUM_ITEMS,
  type ModelBrowserQueryOptions,
} from "@chat/shared";

export type ModelRecord = FunctionReturnType<
  typeof api.admin.listModelsForBrowser
>["page"][number];

export type ModelCollectionRecord = FunctionReturnType<
  typeof api.admin.getModelBrowserMetadata
>["collections"][number];

export type UseModelsOptions = ModelBrowserQueryOptions & {
  collectionId?: Id<"modelCollections">;
  prefetchAll?: boolean;
};

export function useModels(options: UseModelsOptions = {}) {
  const queryArgs = useMemo(() => {
    const args: {
      collectionId?: Id<"modelCollections">;
      favoritesOnly?: boolean;
      query?: string;
    } = {};

    if (options.collectionId) {
      args.collectionId = options.collectionId;
    }
    if (options.favoritesOnly) {
      args.favoritesOnly = true;
    }
    if (options.searchQuery?.trim()) {
      args.query = options.searchQuery.trim();
    }

    return args;
  }, [options.collectionId, options.favoritesOnly, options.searchQuery]);

  const metadata = useQuery(api.admin.getModelBrowserMetadata, {});
  const paginatedModels = usePaginatedQuery(
    api.admin.listModelsForBrowser,
    queryArgs,
    { initialNumItems: MODEL_BROWSER_INITIAL_NUM_ITEMS },
  );
  const setFavoriteModel = useMutation(api.admin.setFavoriteModel);

  useEffect(() => {
    if (!options.prefetchAll) {
      return;
    }
    if (paginatedModels.status === "CanLoadMore") {
      void paginatedModels.loadMore(MODEL_BROWSER_PREFETCH_NUM_ITEMS);
    }
  }, [
    options.prefetchAll,
    paginatedModels.loadMore,
    paginatedModels.results?.length,
    paginatedModels.status,
  ]);

  const models = useMemo(
    () =>
      Array.isArray(paginatedModels.results)
        ? (paginatedModels.results as ModelRecord[])
        : [],
    [paginatedModels.results],
  );
  const collections = useMemo(
    () => (Array.isArray(metadata?.collections) ? metadata.collections : []),
    [metadata?.collections],
  );

  const setFavorite = useCallback(
    async (modelId: Id<"models">, isFavorite: boolean) => {
      await setFavoriteModel({ modelId, isFavorite });
    },
    [setFavoriteModel],
  );

  return {
    models,
    collections,
    setFavorite,
    autoModelAvailable: metadata?.autoModelAvailable ?? false,
    hasMore:
      paginatedModels.status === "CanLoadMore" ||
      paginatedModels.status === "LoadingMore",
    isLoadingMore: paginatedModels.status === "LoadingMore",
    loadMore: (numItems = MODEL_BROWSER_LOAD_MORE_NUM_ITEMS) =>
      paginatedModels.loadMore(numItems),
  };
}
