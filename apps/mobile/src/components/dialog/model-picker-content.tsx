import { AndroidGrabber } from "@/components/grabber";
import { InfiniteScrollFooter } from "@/components/infinite-scroll-footer";
import { Icon } from "@/components/icon";
import type { Model, ModelCollection } from "@/components/model-context";
import type { Id } from "@convex/_generated/dataModel";
import { LegendList } from "@legendapp/list/react-native";
import { Sparkles } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ModelPickerContentProps = {
  models: Model[];
  collections: ModelCollection[];
  selectedModelId: Id<"models"> | undefined;
  onSelectModel: (modelId: Id<"models">) => void;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
};

function ModelRow({
  label,
  icon,
  iconType,
  iconUrl,
  selected,
  onPress,
}: {
  label: string;
  icon?: string;
  iconType?: Model["iconType"];
  iconUrl?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-3 px-5 py-3 active:bg-muted ${
        selected ? "bg-muted" : ""
      }`}
    >
      <View className="size-8 items-center justify-center rounded-full border border-border bg-card">
        {iconType === "upload" && iconUrl ? (
          <Image source={{ uri: iconUrl }} className="size-8 rounded-full" />
        ) : iconType === "emoji" && icon ? (
          <Text className="text-[17px]">{icon}</Text>
        ) : (
          <Icon icon={Sparkles} className="size-4 text-muted-foreground" />
        )}
      </View>
      <View className="flex-1">
        <Text className="text-[17px] text-foreground" numberOfLines={1}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

export function ModelPickerContent({
  models,
  collections,
  selectedModelId,
  onSelectModel,
  hasMore,
  isLoadingMore,
  onLoadMore,
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
    <LegendList
      className="flex-1"
      data={visibleModels}
      keyExtractor={(item) => item.id}
      estimatedItemSize={58}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        paddingBottom: process.env.EXPO_OS === "android" ? insets.bottom : undefined,
      }}
      onEndReached={hasMore && !isLoadingMore ? onLoadMore : undefined}
      onEndReachedThreshold={0.35}
      renderItem={({ item }) => (
        <ModelRow
          label={item.label}
          icon={item.icon}
          iconType={item.iconType}
          iconUrl={item.iconUrl}
          selected={item.id === selectedModelId}
          onPress={() => onSelectModel(item.id)}
        />
      )}
      ListHeaderComponent={
        <>
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

          <View className="pt-2" />
        </>
      }
      ListEmptyComponent={
        <Text className="px-5 py-6 text-[13px] text-muted-foreground">No models in this category.</Text>
      }
      ListFooterComponent={
        <InfiniteScrollFooter
          isLoadingMore={isLoadingMore}
          label="Loading more models..."
        />
      }
    />
  );
}
