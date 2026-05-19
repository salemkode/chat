import React, { createContext, use, useCallback, useEffect, useMemo, useState } from "react";
import { useModels } from "@/hooks/use-models";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Id } from "@convex/_generated/dataModel";
import {
  mediaTypeMatchesPattern,
  resolveModelAttachmentMediaTypes,
  type ModelAttachmentValidationStatus,
} from "@chat/shared";

const LAST_USED_MODEL_KEY = "last-used-model-id";

export type Model = {
  id: Id<"models">;
  label: string;
  subtitle?: string;
  attachmentValidationStatus?: ModelAttachmentValidationStatus;
  capabilities?: string[];
  providerType?: string | null;
  supportedAttachmentMediaTypes?: string[];
};

export type ModelCollection = {
  id: string;
  name: string;
  modelIds: Id<"models">[];
};

type ModelContextValue = {
  models: Model[];
  collections: ModelCollection[];
  selectedModel: string;
  selectedModelId: Id<"models"> | undefined;
  attachmentMediaTypes: string[];
  attachmentsSupported: boolean;
  imageAttachmentsSupported: boolean;
  setSelectedModel: (modelId: Id<"models">) => void;
};

const ModelContext = createContext<ModelContextValue | null>(null);

export function ModelProvider({ children }: { children: React.ReactNode }) {
  const { models: apiModels, collections: apiCollections } = useModels();
  const [selectedModelId, setSelectedModelIdState] = useState<Id<"models"> | undefined>(
    undefined,
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(LAST_USED_MODEL_KEY).then((stored) => {
      if (!stored) {
        setHydrated(true);
        return;
      }
      const existing = apiModels.find((model) => model._id === stored);
      if (existing) {
        setSelectedModelIdState(existing._id);
      } else {
        const legacyModel = apiModels.find((model) => model.modelId === stored);
        if (legacyModel) {
          setSelectedModelIdState(legacyModel._id);
          AsyncStorage.setItem(LAST_USED_MODEL_KEY, legacyModel._id);
        }
      }
      setHydrated(true);
    });
  }, [apiModels]);

  useEffect(() => {
    if (!hydrated || apiModels.length === 0) return;
    if (selectedModelId) {
      const exists = apiModels.some((m) => m._id === selectedModelId);
      if (exists) return;
    }
    const fallback = apiModels[0]?._id;
    if (fallback) {
      setSelectedModelIdState(fallback);
      AsyncStorage.setItem(LAST_USED_MODEL_KEY, fallback);
    }
  }, [hydrated, apiModels, selectedModelId]);

  const setSelectedModel = useCallback((modelId: Id<"models">) => {
    setSelectedModelIdState(modelId);
    AsyncStorage.setItem(LAST_USED_MODEL_KEY, modelId);
  }, []);

  const models = useMemo<Model[]>(
    () =>
      apiModels.map((m) => ({
        id: m._id,
        label: m.displayName,
        subtitle: m.description,
        attachmentValidationStatus: m.attachmentValidationStatus,
        capabilities: m.capabilities,
        providerType: m.provider?.providerType ?? null,
        supportedAttachmentMediaTypes: m.supportedAttachmentMediaTypes,
      })),
    [apiModels],
  );
  const collections = useMemo<ModelCollection[]>(
    () =>
      apiCollections.map((collection) => ({
        id: collection._id,
        name: collection.name,
        modelIds: collection.modelIds,
      })),
    [apiCollections],
  );

  const selectedModel =
    apiModels.find((m) => m._id === selectedModelId)?.displayName ?? "Auto";
  const selectedModelInfo = apiModels.find((model) => model._id === selectedModelId);
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
        collections,
        selectedModel,
        selectedModelId,
        attachmentMediaTypes,
        attachmentsSupported,
        imageAttachmentsSupported,
        setSelectedModel,
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
