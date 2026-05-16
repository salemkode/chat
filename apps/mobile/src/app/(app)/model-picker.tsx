import { ModelPickerContent } from "@/components/dialog/model-picker-content";
import { useModel } from "@/components/model-context";
import type { Id } from "@convex/_generated/dataModel";
import { useRouter } from "expo-router";

export default function ModelPickerSheet() {
  const {
    models,
    collections,
    selectedModelId,
    setSelectedModel,
    extendedThinking,
    setExtendedThinking,
  } = useModel();
  const router = useRouter();

  const selectModelAndClose = (modelId: Id<"models">) => {
    setSelectedModel(modelId);
    router.back();
  };

  return (
    <ModelPickerContent
      models={models}
      collections={collections}
      selectedModelId={selectedModelId}
      onSelectModel={selectModelAndClose}
      extendedThinking={extendedThinking}
      onExtendedThinkingChange={setExtendedThinking}
    />
  );
}
