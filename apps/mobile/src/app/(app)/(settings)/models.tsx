import {
  SettingsSectionDivider,
  SettingsToggleRow,
} from "@/components/settings/settings-row";
import { useModels } from "@/hooks/use-models";
import { useSettings } from "@/hooks/use-settings";
import { AUTO_MODEL_ID, isAutoModelSelection } from "@chat/shared";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Check } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Icon } from "@/components/icon";

const DEFAULT_MODEL_STORAGE_KEY = "default-model-id";

export default function ModelsSettingsScreen() {
  const { models, autoModelAvailable } = useModels();
  const { settings, updateSettings } = useSettings();
  const [defaultModelId, setDefaultModelId] = useState<string | undefined>();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    void AsyncStorage.getItem(DEFAULT_MODEL_STORAGE_KEY).then((stored) => {
      setDefaultModelId(stored ?? undefined);
      setHydrated(true);
    });
  }, []);

  const modelOptions = useMemo(() => {
    const sorted = [...models].sort((a, b) =>
      a.displayName.localeCompare(b.displayName),
    );
    const options = sorted.map((model) => ({
      value: model.modelId,
      label: model.displayName,
    }));
    if (autoModelAvailable) {
      return [{ value: AUTO_MODEL_ID, label: "Auto" }, ...options];
    }
    return options;
  }, [autoModelAvailable, models]);

  const selectedDefault =
    defaultModelId && modelOptions.some((option) => option.value === defaultModelId)
      ? defaultModelId
      : autoModelAvailable
        ? AUTO_MODEL_ID
        : modelOptions[0]?.value;

  const reasoningLevel =
    settings?.reasoningLevel === "low" ||
    settings?.reasoningLevel === "medium" ||
    settings?.reasoningLevel === "high"
      ? settings.reasoningLevel
      : "medium";

  const setDefaultModel = useCallback(async (modelId: string) => {
    if (
      !isAutoModelSelection(modelId) &&
      !modelOptions.some((option) => option.value === modelId)
    ) {
      return;
    }
    setDefaultModelId(modelId);
    await AsyncStorage.setItem(DEFAULT_MODEL_STORAGE_KEY, modelId);
  }, [modelOptions]);

  if (!hydrated) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="pb-10"
    >
      <Text className="text-[13px] text-muted-foreground px-5 pt-6 pb-2">
        Default model
      </Text>
      <Text className="text-[13px] text-muted-foreground px-5 pb-3 leading-relaxed">
        Choose a fixed model or Auto when the admin router has enabled it.
      </Text>
      {modelOptions.map((option) => {
        const selected = selectedDefault === option.value;
        return (
          <Pressable
            key={option.value}
            onPress={() => void setDefaultModel(option.value)}
            className="flex-row items-center px-5 py-3 gap-3 active:bg-muted"
          >
            <View className="w-5 items-center">
              {selected ? (
                <Icon icon={Check} className="w-5 h-5 text-foreground" />
              ) : null}
            </View>
            <Text className="text-[17px] text-foreground">{option.label}</Text>
          </Pressable>
        );
      })}

      <SettingsSectionDivider />

      <SettingsToggleRow
        label="Reasoning"
        description="Extra step-by-step reasoning when the model supports it."
        value={Boolean(settings?.reasoningEnabled)}
        onValueChange={(value) => {
          void updateSettings({ reasoningEnabled: value });
        }}
      />

      <Text className="text-[13px] text-muted-foreground px-5 pt-4 pb-2">
        Reasoning depth
      </Text>
      {(["low", "medium", "high"] as const).map((level) => (
        <Pressable
          key={level}
          onPress={() => void updateSettings({ reasoningLevel: level })}
          className="flex-row items-center px-5 py-3 gap-3 active:bg-muted"
        >
          <View className="w-5 items-center">
            {reasoningLevel === level ? (
              <Icon icon={Check} className="w-5 h-5 text-foreground" />
            ) : null}
          </View>
          <Text className="text-[17px] text-foreground capitalize">{level}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
