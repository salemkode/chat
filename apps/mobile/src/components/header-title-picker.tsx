import { useModel } from "@/components/model-context";
import { Icon } from "@/components/icon";
import { useChatHeaderLabels } from "@/hooks/use-chat-header";
import { useRouter } from "expo-router";
import { ChevronDown } from "lucide-react-native";
import { Pressable, Text, useWindowDimensions, View } from "react-native";

const HEADER_SIDE_CHROME_WIDTH = 168;
const HEADER_TITLE_MAX_WIDTH = 280;
const HEADER_TITLE_MIN_WIDTH = 128;

export function HeaderTitlePicker() {
  const { selectedModel } = useModel();
  const { threadTitle } = useChatHeaderLabels();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const titleWidth = Math.max(
    HEADER_TITLE_MIN_WIDTH,
    Math.min(HEADER_TITLE_MAX_WIDTH, width - HEADER_SIDE_CHROME_WIDTH),
  );

  return (
    <View
      className="items-center self-center px-2 py-1"
      style={{ width: titleWidth }}
    >
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        className="w-full text-center text-[17px] font-semibold text-foreground"
      >
        {threadTitle}
      </Text>
      <Pressable
        onPress={() => router.navigate("/model-picker")}
        className="mt-0.5 flex-row items-center gap-0.5 rounded-full px-1 active:opacity-70"
        style={{ maxWidth: titleWidth - 16 }}
        accessibilityRole="button"
        accessibilityLabel={`Selected model: ${selectedModel}. Tap to change.`}
      >
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          className="text-center text-[12px] text-muted-foreground"
          style={{ maxWidth: titleWidth - 32 }}
        >
          {selectedModel}
        </Text>
        <Icon icon={ChevronDown} className="size-3 text-muted-foreground" />
      </Pressable>
    </View>
  );
}
