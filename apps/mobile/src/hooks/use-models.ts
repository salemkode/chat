import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useCallback, useMemo } from "react";
import type { FunctionReturnType } from "convex/server";
import type { Id } from "@convex/_generated/dataModel";

type ModelsWithProviders = FunctionReturnType<typeof api.admin.listModelsWithProviders>;

export function useModels() {
  const data = useQuery(api.admin.listModelsWithProviders) as ModelsWithProviders | undefined;
  const setFavoriteModel = useMutation(api.admin.setFavoriteModel);

  const models = useMemo(
    () => (Array.isArray(data?.models) ? data.models : []),
    [data?.models],
  );
  const collections = useMemo(
    () => (Array.isArray(data?.collections) ? data.collections : []),
    [data?.collections],
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
    autoModelAvailable: data?.autoModelAvailable ?? false,
  };
}
