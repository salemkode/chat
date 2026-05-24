import { ActivityIndicator, Text, View } from "react-native";

export function InfiniteScrollFooter({
  isLoadingMore,
  label = "Loading...",
}: {
  isLoadingMore: boolean;
  label?: string;
}) {
  if (!isLoadingMore) {
    return null;
  }

  return (
    <View className="flex-row items-center justify-center gap-2 py-4">
      <ActivityIndicator size="small" />
      <Text className="text-[13px] text-muted-foreground">{label}</Text>
    </View>
  );
}
