import React, { createContext, use, useCallback, useEffect, useMemo, useState } from "react";
import { useModels } from "@/hooks/use-models";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Id } from "@convex/_generated/dataModel";

const LAST_USED_MODEL_KEY = "last-used-model-id";

export type Model = {
  id: string;
  label: string;
  subtitle?: string;
};

type ModelContextValue = {
  models: Model[];
  selectedModel: string;
  selectedModelId: string | undefined;
  extendedThinking: boolean;
  setExtendedThinking: (value: boolean) => void;
  setSelectedModel: (modelId: string) => void;
};

const ModelContext = createContext<ModelContextValue | null>(null);

export function ModelProvider({ children }: { children: React.ReactNode }) {
  const { models: apiModels } = useModels();
  const [selectedModelId, setSelectedModelIdState] = useState<string | undefined>(undefined);
  const [extendedThinking, setExtendedThinking] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(LAST_USED_MODEL_KEY).then((stored) => {
      if (stored) setSelectedModelIdState(stored);
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated || apiModels.length === 0) return;
    if (selectedModelId) {
      const exists = apiModels.some((m) => m.modelId === selectedModelId);
      if (exists) return;
    }
    const fallback = apiModels[0]?.modelId;
    if (fallback) {
      setSelectedModelIdState(fallback);
      AsyncStorage.setItem(LAST_USED_MODEL_KEY, fallback);
    }
  }, [hydrated, apiModels, selectedModelId]);

  const setSelectedModel = useCallback((modelId: string) => {
    setSelectedModelIdState(modelId);
    AsyncStorage.setItem(LAST_USED_MODEL_KEY, modelId);
  }, []);

  const models = useMemo<Model[]>(
    () =>
      apiModels.map((m) => ({
        id: m.modelId,
        label: m.displayName,
        subtitle: m.description,
      })),
    [apiModels],
  );

  const selectedModel =
    apiModels.find((m) => m.modelId === selectedModelId)?.displayName ?? "Auto";

  return (
    <ModelContext
      value={{
        models,
        selectedModel,
        selectedModelId: selectedModelId as Id<"models"> | undefined,
        extendedThinking,
        setExtendedThinking,
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
