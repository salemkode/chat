import { AndroidGrabber } from "@/components/grabber";
import { Icon } from "@/components/icon";
import type { Model, ModelCollection } from "@/components/model-context";
import type { Id } from "@convex/_generated/dataModel";
import { Check, Sparkles } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ModelPickerContentProps = {
  models: Model[];
  collections: ModelCollection[];
  selectedModelId: Id<"models"> | undefined;
  onSelectModel: (modelId: Id<"models">) => void;
  extendedThinking: boolean;
  onExtendedThinkingChange: (value: boolean) => void;
};

function ModelRow({
  label,
  subtitle,
  selected,
  onPress,
}: {
  label: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center px-5 py-3 gap-3 active:bg-muted"
    >
      <View className="w-5 items-center">
        {selected && <Icon icon={Check} className="w-5 h-5 text-foreground" />}
      </View>
      <View className="flex-1">
        <Text className="text-[17px] text-foreground">{label}</Text>
        {subtitle && <Text className="text-[13px] text-muted-foreground">{subtitle}</Text>}
      </View>
    </Pressable>
  );
}

export function ModelPickerContent({
  models,
  collections,
  selectedModelId,
  onSelectModel,
  extendedThinking,
  onExtendedThinkingChange,
}: ModelPickerContentProps) {
  const insets = useSafeAreaInsets();
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("all");

  const activeCollection = useMemo(
    () => collections.find((collection) => collection.id === selectedCollectionId),
    [collections, selectedCollectionId],
  );

  const visibleModels = useMemo(() => {
    if (!activeCollection) {
      return models;
    }
    const allowedModelIds = new Set(activeCollection.modelIds);
    return models.filter((model) => allowedModelIds.has(model.id));
  }, [activeCollection, models]);

  return (
    <ScrollView
      className="flex-1"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        paddingBottom: process.env.EXPO_OS === "android" ? insets.bottom : undefined,
      }}
    >
      <AndroidGrabber />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, gap: 8 }}
      >
        <Pressable
          onPress={() => setSelectedCollectionId("all")}
          className={`rounded-full border px-3 py-1.5 ${
            selectedCollectionId === "all" ? "bg-foreground border-foreground" : "bg-card border-border"
          }`}
        >
          <Text
            className={`text-[13px] ${selectedCollectionId === "all" ? "text-background" : "text-foreground"}`}
          >
            All
          </Text>
        </Pressable>
        {collections.map((collection) => {
          const active = collection.id === selectedCollectionId;
          return (
            <Pressable
              key={collection.id}
              onPress={() => setSelectedCollectionId(collection.id)}
              className={`rounded-full border px-3 py-1.5 ${
                active ? "bg-foreground border-foreground" : "bg-card border-border"
              }`}
            >
              <Text className={`text-[13px] ${active ? "text-background" : "text-foreground"}`}>
                {collection.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View className="pt-2">
        {visibleModels.map((model) => (
          <ModelRow
            key={model.id}
            label={model.label}
            subtitle={model.subtitle}
            selected={model.id === selectedModelId}
            onPress={() => onSelectModel(model.id)}
          />
        ))}
        {visibleModels.length === 0 ? (
          <Text className="px-5 py-6 text-[13px] text-muted-foreground">No models in this category.</Text>
        ) : null}
      </View>

      <View className="h-px bg-border mx-5 my-1" />

      <View className="flex-row items-center px-5 py-3 gap-3.5">
        <Icon icon={Sparkles} className="w-5 h-5 text-foreground" />
        <View className="flex-1">
          <Text className="text-[17px] text-foreground">Extended thinking</Text>
          <Text className="text-[13px] text-muted-foreground">Think longer for complex tasks</Text>
        </View>
        <Switch value={extendedThinking} onValueChange={onExtendedThinkingChange} />
      </View>
    </ScrollView>
  );
}
