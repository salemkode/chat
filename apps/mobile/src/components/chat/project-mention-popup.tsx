import { Icon } from "@/components/icon";
import type { MentionProjectOption } from "@chat/shared/logic/project-mention";
import { AtSign, Folder, Sparkles, X } from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";

import { cn } from "@/utils/tailwind";

import { ComposerFloatingPillSurface } from "./composer-floating-surface";
import { COMPOSER_GLASS_PADDING } from "./composer-layout";

export function ProjectMentionPopup({
  mentionOptions,
  highlightedIndex,
  onSelect,
  onDismiss,
}: {
  mentionOptions: MentionProjectOption[];
  highlightedIndex: number;
  onSelect: (optionId: string) => void;
  onDismiss: () => void;
}) {
  return (
    <ComposerFloatingPillSurface className="absolute bottom-full left-0 right-0 z-50 mb-2">
      <View style={{ padding: COMPOSER_GLASS_PADDING, gap: 8 }}>
        <View className="flex-row items-center gap-2.5 px-0.5">
          <View className="size-7 items-center justify-center rounded-full bg-foreground/8">
            <Icon icon={AtSign} className="size-3.5 text-foreground" />
          </View>
          <Text className="flex-1 text-[15px] font-semibold text-foreground">
            Link to project
          </Text>
          <Pressable
            onPress={onDismiss}
            hitSlop={10}
            accessibilityLabel="Close project suggestions"
            className="size-8 items-center justify-center rounded-full bg-foreground/6 active:bg-foreground/12"
          >
            <Icon icon={X} className="size-3.5 text-muted-foreground" />
          </Pressable>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="always"
          className="max-h-52"
          showsVerticalScrollIndicator={false}
        >
          {mentionOptions.length > 0 ? (
            <View className="gap-1">
              {mentionOptions.map((option, index) => {
                const isHighlighted = index === highlightedIndex;

                return (
                  <Pressable
                    key={option.id}
                    onPress={() => onSelect(option.id)}
                    className={cn(
                      "flex-row items-center gap-3 rounded-[18px] px-3 py-2.5 active:opacity-85",
                      isHighlighted ? "bg-foreground/8" : "bg-transparent",
                    )}
                    style={{ borderCurve: "continuous" }}
                  >
                    <View
                      className={cn(
                        "size-9 items-center justify-center rounded-full",
                        option.kind === "new-project-ai"
                          ? isHighlighted
                            ? "bg-foreground"
                            : "bg-foreground/10"
                          : isHighlighted
                            ? "bg-foreground/12"
                            : "bg-muted",
                      )}
                    >
                      <Icon
                        icon={
                          option.kind === "new-project-ai" ? Sparkles : Folder
                        }
                        className={cn(
                          "size-4",
                          option.kind === "new-project-ai" && isHighlighted
                            ? "text-background"
                            : "text-foreground",
                        )}
                      />
                    </View>
                    <View className="min-w-0 flex-1">
                      <Text
                        className="text-[15px] font-medium text-foreground"
                        numberOfLines={1}
                      >
                        {option.name}
                      </Text>
                      {option.description ? (
                        <Text
                          className="mt-0.5 text-[13px] leading-[17px] text-muted-foreground"
                          numberOfLines={2}
                        >
                          {option.description}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View className="rounded-[18px] bg-foreground/5 px-3 py-4">
              <Text className="text-center text-sm text-muted-foreground">
                No matching projects
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </ComposerFloatingPillSurface>
  );
}
