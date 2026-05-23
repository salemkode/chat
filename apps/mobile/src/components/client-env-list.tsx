import { getClientEnvEntries } from "@/lib/client-env";
import { ScrollView, Text, View } from "react-native";

export function ClientEnvList() {
  const entries = getClientEnvEntries();

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 16 }}
      showsVerticalScrollIndicator={false}
    >
      {entries.map(({ key, value }) => {
        const missing = value === "(not set)";

        return (
          <View
            key={key}
            className="mb-3 rounded-xl border border-border bg-card px-3 py-2.5"
          >
            <Text className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
              {key}
            </Text>
            <Text
              selectable
              className={
                missing
                  ? "text-[14px] italic text-muted-foreground"
                  : "text-[14px] text-foreground"
              }
            >
              {value}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}
