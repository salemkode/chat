import { useModel } from "@/components/model-context";
import { Icon } from "@/components/icon";
import { useChatHeaderLabels } from "@/hooks/use-chat-header";
import { useRouter } from "expo-router";
import { ChevronDown } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

export function HeaderTitlePicker() {
  const { selectedModel } = useModel();
  const { threadTitle } = useChatHeaderLabels();
  const router = useRouter();

  return (
    <View className="max-w-[280px] items-center self-center px-2 py-1">
      <Text
        numberOfLines={1}
        className="text-center text-[17px] font-semibold text-foreground"
      >
        {threadTitle}
      </Text>
      <Pressable
        onPress={() => router.navigate("/model-picker")}
        className="mt-0.5 flex-row items-center gap-0.5 rounded-full px-1 active:opacity-70"
        accessibilityRole="button"
        accessibilityLabel={`Selected model: ${selectedModel}. Tap to change.`}
      >
        <Text
          numberOfLines={1}
          className="max-w-[220px] text-center text-[12px] text-muted-foreground"
        >
          {selectedModel}
        </Text>
        <Icon icon={ChevronDown} className="size-3 text-muted-foreground" />
      </Pressable>
    </View>
  );
}
