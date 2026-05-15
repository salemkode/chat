import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useCallback, useMemo } from "react";
import type { Id } from "@convex/_generated/dataModel";

type ModelRecord = {
  _id: string;
  modelId: string;
  displayName: string;
  description?: string;
  capabilities?: string[];
  supportedAttachmentMediaTypes?: string[];
  supportsReasoning?: boolean;
  reasoningLevels?: Array<"low" | "medium" | "high">;
  defaultReasoningLevel?: "off" | "low" | "medium" | "high";
  sortOrder: number;
  isFavorite: boolean;
  isFree: boolean;
  icon?: string;
  iconType?: string;
  iconUrl?: string;
  provider?: {
    _id: string;
    name: string;
    icon?: string;
    iconType?: string;
    iconUrl?: string;
  };
};

export function useModels() {
  const data = useQuery(api.admin.listModelsWithProviders) as
    | (ModelRecord[] & { autoModelAvailable?: boolean })
    | undefined;
  const setFavoriteModel = useMutation(api.admin.setFavoriteModel);

  const models = useMemo(
    () => (Array.isArray(data) ? data : []),
    [data],
  );

  const setFavorite = useCallback(
    async (modelId: string, isFavorite: boolean) => {
      await setFavoriteModel({ modelId: modelId as Id<"models">, isFavorite });
    },
    [setFavoriteModel],
  );

  return {
    models,
    setFavorite,
    autoModelAvailable:
      (data as unknown as { autoModelAvailable?: boolean })
        ?.autoModelAvailable ?? false,
  };
}
