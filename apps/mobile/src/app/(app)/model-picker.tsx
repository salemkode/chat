import { ModelPickerContent } from "@/components/dialog/model-picker-content";
import { useModel } from "@/components/model-context";
import { useRouter } from "expo-router";

export default function ModelPickerSheet() {
  const { selectedModelKey, setSelectedModelKey } = useModel();
  const router = useRouter();

  const selectModelAndClose = (modelKey: string) => {
    setSelectedModelKey(modelKey);
    router.back();
  };

  return (
    <ModelPickerContent
      selectedModelKey={selectedModelKey}
      onSelectModelKey={selectModelAndClose}
    />
  );
}
