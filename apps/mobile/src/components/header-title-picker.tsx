import { useModel } from "@/components/model-context";
import { useChatHeaderLabels } from "@/hooks/use-chat-header";
import { Host, Picker } from "@expo/ui";
import { Text, View } from "react-native";

export function HeaderTitlePicker() {
  const { models, selectedModelId, selectedModel, setSelectedModel } = useModel();
  const { threadTitle } = useChatHeaderLabels();
  const activeModelId = selectedModelId ?? models[0]?.id;

  return (
    <View className="max-w-[280px] items-center self-center px-2 py-1">
      <Text
        numberOfLines={1}
        className="text-center text-[17px] font-semibold text-foreground"
      >
        {threadTitle}
      </Text>
      {activeModelId ? (
        <Host
          matchContents={{ vertical: true }}
          style={{
            minWidth: 140,
            marginTop: 2,
          }}
        >
          <Picker selectedValue={activeModelId} onValueChange={setSelectedModel}>
            {models.map((model) => (
              <Picker.Item key={model.id} label={model.label} value={model.id} />
            ))}
          </Picker>
        </Host>
      ) : (
        <Text
          numberOfLines={1}
          className="mt-0.5 text-center text-[12px] text-muted-foreground"
        >
          {selectedModel}
        </Text>
      )}
    </View>
  );
}
