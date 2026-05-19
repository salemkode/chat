import { Icon } from "@/components/icon";
import { useThemePreference } from "@/hooks/use-theme-preference";
import type { ThemeMode } from "@/lib/theme-preference";
import { Monitor, Moon, Sun } from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";

const THEME_OPTIONS: Array<{
  id: ThemeMode;
  label: string;
  description: string;
}> = [
  {
    id: "light",
    label: "Light",
    description: "Bright neutral surfaces for daytime use.",
  },
  {
    id: "dark",
    label: "Dark",
    description: "A darker workspace for low-light environments.",
  },
  {
    id: "system",
    label: "System",
    description: "Matches your device appearance automatically.",
  },
];

export default function AppearanceScreen() {
  const { settings, setMode } = useThemePreference();

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="px-5 pb-10"
    >
      <Text className="text-[15px] font-medium text-muted-foreground mt-6 mb-3">
        Appearance
      </Text>
      <View className="gap-2">
        {THEME_OPTIONS.map((option) => {
          const selected = settings.mode === option.id;
          const optionIcon =
            option.id === "light" ? Sun : option.id === "dark" ? Moon : Monitor;
          return (
            <Pressable
              key={option.id}
              onPress={() => void setMode(option.id)}
              className={`rounded-xl border px-4 py-3 active:bg-muted ${
                selected ? "border-foreground bg-muted/40" : "border-border"
              }`}
              style={{ borderCurve: "continuous" }}
            >
              <View className="flex-row items-center gap-2">
                <Icon icon={optionIcon} className="w-[18px] h-[18px] text-foreground" />
                <Text className="text-[17px] font-medium text-foreground">
                  {option.label}
                </Text>
              </View>
              <Text className="text-[13px] text-muted-foreground mt-1 leading-relaxed">
                {option.description}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}
