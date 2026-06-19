import React, { createContext, use, useCallback, useEffect, useMemo, useState } from "react";
import { useModels, type ModelRecord } from "@/hooks/use-models";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Id } from "@convex/_generated/dataModel";
import {
  mediaTypeMatchesPattern,
  resolveModelAttachmentMediaTypes,
  type ModelAttachmentValidationStatus,
} from "@chat/core";
import {
  AUTO_MODEL_ID,
  encodeAutoModelCollectionSelection,
  isAutoModelSelection,
  parseAutoModelCollectionSelection,
} from "@chat/core";
import type { IconType } from "@chat/core/admin-types";

const LAST_USED_MODEL_KEY = "last-used-model-id";

export type Model = {
  id: Id<"models">;
  modelId: string;
  label: string;
  description?: string;
  icon?: string;
  iconType?: IconType;
  iconUrl?: string;
  attachmentValidationStatus?: ModelAttachmentValidationStatus;
  capabilities?: string[];
  providerType?: string | null;
  supportedAttachmentMediaTypes?: string[];
  sortOrder: number;
  isFavorite: boolean;
};

export type ModelCollection = {
  id: Id<"modelCollections">;
  name: string;
  description?: string;
  icon?: string;
  iconType?: IconType;
  iconUrl?: string;
  sortOrder: number;
  modelIds: Id<"models">[];
};

type ModelContextValue = {
  models: Model[];
  catalogModels: ModelRecord[];
  collections: ModelCollection[];
  selectedModelKey: string | undefined;
  selectedModel: string;
  selectedModelDocId: Id<"models"> | undefined;
  autoModelAllowedModelDocIds: Id<"models">[] | undefined;
  attachmentMediaTypes: string[];
  attachmentsSupported: boolean;
  imageAttachmentsSupported: boolean;
  setSelectedModelKey: (modelKey: string) => void;
  autoModelAvailable: boolean;
  setFavorite: (modelId: Id<"models">, isFavorite: boolean) => Promise<void>;
  catalogHasMore: boolean;
  catalogIsLoadingMore: boolean;
  catalogLoadMore: (numItems?: number) => void;
};

const ModelContext = createContext<ModelContextValue | null>(null);

function resolveStoredModelKey(
  stored: string | null,
  models: Array<{ _id: Id<"models">; modelId: string }>,
) {
  if (!stored) {
    return undefined;
  }

  if (isAutoModelSelection(stored)) {
    return stored;
  }

  const byDocId = models.find((model) => model._id === stored);
  if (byDocId) {
    return byDocId.modelId;
  }

  const byModelId = models.find((model) => model.modelId === stored);
  if (byModelId) {
    return byModelId.modelId;
  }

  return undefined;
}

export function ModelProvider({ children }: { children: React.ReactNode }) {
  const {
    models: apiModels,
    collections: apiCollections,
    setFavorite,
    autoModelAvailable,
    hasMore: catalogHasMore,
    isLoadingMore: catalogIsLoadingMore,
    loadMore: catalogLoadMore,
  } = useModels({ prefetchAll: true });
  const [selectedModelKey, setSelectedModelKeyState] = useState<string | undefined>(
    undefined,
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(LAST_USED_MODEL_KEY).then((stored) => {
      const resolved = resolveStoredModelKey(stored, apiModels);
      if (resolved) {
        setSelectedModelKeyState(resolved);
      }
      setHydrated(true);
    });
  }, [apiModels]);

  useEffect(() => {
    if (!hydrated || apiModels.length === 0) {
      return;
    }

    const hasSelectedModel =
      apiModels.some((model) => model.modelId === selectedModelKey) ||
      (autoModelAvailable && isAutoModelSelection(selectedModelKey));

    if (hasSelectedModel) {
      return;
    }

    const fallback =
      (autoModelAvailable ? AUTO_MODEL_ID : undefined) ?? apiModels[0]?.modelId;

    if (!fallback) {
      return;
    }

    setSelectedModelKeyState(fallback);
    void AsyncStorage.setItem(LAST_USED_MODEL_KEY, fallback);
  }, [apiModels, autoModelAvailable, hydrated, selectedModelKey]);

  const setSelectedModelKey = useCallback((modelKey: string) => {
    setSelectedModelKeyState(modelKey);
    void AsyncStorage.setItem(LAST_USED_MODEL_KEY, modelKey);
  }, []);

  const models = useMemo<Model[]>(
    () =>
      apiModels.map((model) => ({
        id: model._id,
        modelId: model.modelId,
        label: model.displayName,
        description: model.description,
        icon: model.icon || model.provider?.icon,
        iconType: model.iconType || model.provider?.iconType,
        iconUrl: model.iconUrl || model.provider?.iconUrl,
        attachmentValidationStatus: model.attachmentValidationStatus,
        capabilities: model.capabilities,
        providerType: model.provider?.providerType ?? null,
        supportedAttachmentMediaTypes: model.supportedAttachmentMediaTypes,
        sortOrder: model.sortOrder,
        isFavorite: model.isFavorite,
      })),
    [apiModels],
  );

  const collections = useMemo<ModelCollection[]>(
    () =>
      apiCollections.map((collection) => ({
        id: collection._id,
        name: collection.name,
        description: collection.description,
        icon: collection.icon,
        iconType: collection.iconType,
        iconUrl: collection.iconUrl,
        sortOrder: collection.sortOrder,
        modelIds: collection.modelIds,
      })),
    [apiCollections],
  );

  const selectedModelDocId = useMemo(() => {
    if (isAutoModelSelection(selectedModelKey)) {
      return undefined;
    }
    return apiModels.find((model) => model.modelId === selectedModelKey)?._id;
  }, [apiModels, selectedModelKey]);

  const autoModelAllowedModelDocIds = useMemo(() => {
    const collectionId = parseAutoModelCollectionSelection(selectedModelKey);
    if (!collectionId) {
      return undefined;
    }
    const collection = collections.find((candidate) => candidate.id === collectionId);
    if (!collection || collection.modelIds.length === 0) {
      return undefined;
    }
    return collection.modelIds;
  }, [collections, selectedModelKey]);

  const selectedModel = useMemo(() => {
    if (selectedModelKey === AUTO_MODEL_ID) {
      return "Auto";
    }
    const collectionId = parseAutoModelCollectionSelection(selectedModelKey);
    if (collectionId) {
      const collection = collections.find((candidate) => candidate.id === collectionId);
      return collection ? `Auto (${collection.name})` : "Auto";
    }
    return apiModels.find((model) => model.modelId === selectedModelKey)?.displayName ?? "Model";
  }, [apiModels, collections, selectedModelKey]);

  const selectedModelInfo = useMemo(
    () => apiModels.find((model) => model.modelId === selectedModelKey),
    [apiModels, selectedModelKey],
  );

  const attachmentMediaTypes = useMemo(
    () =>
      selectedModelInfo
        ? resolveModelAttachmentMediaTypes({
            providerType: selectedModelInfo.provider?.providerType,
            capabilities: selectedModelInfo.capabilities,
            supportedAttachmentMediaTypes:
              selectedModelInfo.supportedAttachmentMediaTypes,
            attachmentValidationStatus:
              selectedModelInfo.attachmentValidationStatus,
          })
        : [],
    [selectedModelInfo],
  );

  const attachmentsSupported = attachmentMediaTypes.length > 0;
  const imageAttachmentsSupported = attachmentMediaTypes.some((pattern) =>
    mediaTypeMatchesPattern("image/jpeg", pattern),
  );

  return (
    <ModelContext
      value={{
        models,
        catalogModels: apiModels,
        collections,
        selectedModelKey,
        selectedModel,
        selectedModelDocId,
        autoModelAllowedModelDocIds,
        attachmentMediaTypes,
        attachmentsSupported,
        imageAttachmentsSupported,
        setSelectedModelKey,
        autoModelAvailable,
        setFavorite,
        catalogHasMore,
        catalogIsLoadingMore,
        catalogLoadMore,
      }}
    >
      {children}
    </ModelContext>
  );
}

export function useModel() {
  const context = use(ModelContext);
  if (!context) {
    throw new Error("useModel must be used within a ModelProvider");
  }
  return context;
}

export { AUTO_MODEL_ID, encodeAutoModelCollectionSelection, isAutoModelSelection };
