import { Icon } from "@/components/icon";
import type { MentionProjectOption } from "@chat/shared/logic/project-mention";
import { Folder, Sparkles } from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";

import { cn } from "@/utils/tailwind";

import { ComposerFloatingLeftGutter } from "./composer-floating-lane";
import { ComposerFloatingPillSurface } from "./composer-floating-surface";

export function ProjectMentionPopup({
  mentionOptions,
  highlightedIndex,
  onSelect,
  onDismiss: _onDismiss,
}: {
  mentionOptions: MentionProjectOption[];
  highlightedIndex: number;
  onSelect: (optionId: string) => void;
  onDismiss: () => void;
}) {
  return (
    <View
      pointerEvents="box-none"
      className="absolute bottom-full left-0 right-0 z-50 mb-1.5 flex-row"
    >
      <ComposerFloatingLeftGutter />
      <View className="w-fit max-w-44 shrink">
        <ComposerFloatingPillSurface tone="white" compact>
          <ScrollView
            keyboardShouldPersistTaps="always"
            className="max-h-36"
            showsVerticalScrollIndicator={false}
            contentContainerClassName="p-1.5 gap-0.5"
          >
            {mentionOptions.length > 0 ? (
              mentionOptions.map((option, index) => {
                const isHighlighted = index === highlightedIndex;

                return (
                  <Pressable
                    key={option.id}
                    onPress={() => onSelect(option.id)}
                    className={cn(
                      "flex-row items-center gap-2 rounded-xl px-2 py-1.5 active:opacity-80",
                      isHighlighted ? "bg-black/6" : "bg-transparent",
                    )}
                  >
                    <Icon
                      icon={
                        option.kind === "new-project-ai" ? Sparkles : Folder
                      }
                      className="size-3.5 shrink-0 text-foreground"
                    />
                    <Text
                      className="shrink text-[13px] text-foreground"
                      numberOfLines={1}
                    >
                      {option.name}
                    </Text>
                  </Pressable>
                );
              })
            ) : (
              <View className="px-2 py-2">
                <Text className="text-center text-xs text-muted-foreground">
                  No matches
                </Text>
              </View>
            )}
          </ScrollView>
        </ComposerFloatingPillSurface>
      </View>
    </View>
  );
}
