import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useCallback, useMemo } from "react";
import type { FunctionReturnType } from "convex/server";
import type { Id } from "@convex/_generated/dataModel";

type ModelRecord = FunctionReturnType<typeof api.admin.listModelsForBrowser>["page"][number];

export function useModels() {
  const metadata = useQuery(api.admin.getModelBrowserMetadata, {});
  const paginatedModels = usePaginatedQuery(
    api.admin.listModelsForBrowser,
    {},
    { initialNumItems: 40 },
  );
  const setFavoriteModel = useMutation(api.admin.setFavoriteModel);

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
    hasMore: paginatedModels.status === "CanLoadMore" || paginatedModels.status === "LoadingMore",
    isLoadingMore: paginatedModels.status === "LoadingMore",
    loadMore: (numItems = 40) => paginatedModels.loadMore(numItems),
  };
}
