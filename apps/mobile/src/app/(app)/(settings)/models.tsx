import { Icon } from '@/components/icon'
import { SettingsPage, SettingsSection } from '@/components/settings/settings-shell'
import { SettingsSectionDivider, SettingsToggleRow } from '@/components/settings/settings-row'
import { useModels } from '@/hooks/use-models'
import { useSettings } from '@/hooks/use-settings'
import { AUTO_MODEL_ID, isAutoModelSelection } from '@chat/core'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Check } from 'lucide-react-native'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { sortedCopy } from '@/lib/sorted-copy'

const DEFAULT_MODEL_STORAGE_KEY = 'default-model-id'

const ROUTING_PREFERENCE_OPTIONS = [
  { value: 'balanced', label: 'Balanced' },
  { value: 'quality', label: 'Quality' },
  { value: 'speed', label: 'Speed' },
  { value: 'cost', label: 'Cost' },
] as const

type RoutingPreference = (typeof ROUTING_PREFERENCE_OPTIONS)[number]['value']

function isRoutingPreference(value: string): value is RoutingPreference {
  return ROUTING_PREFERENCE_OPTIONS.some((option) => option.value === value)
}

export default function ModelsSettingsScreen() {
  const { models, autoModelAvailable } = useModels({ prefetchAll: true })
  const { settings, updateSettings } = useSettings()
  const [defaultModelId, setDefaultModelId] = useState<string | undefined>()
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    void AsyncStorage.getItem(DEFAULT_MODEL_STORAGE_KEY).then((stored) => {
      setDefaultModelId(stored ?? undefined)
      setHydrated(true)
    })
  }, [])

  const modelOptions = useMemo(() => {
    const sorted = sortedCopy(models, (a, b) => a.displayName.localeCompare(b.displayName))
    const options = sorted.map((model) => ({
      value: model.modelId,
      label: model.displayName,
    }))
    if (autoModelAvailable) {
      return [{ value: AUTO_MODEL_ID, label: 'Auto' }, ...options]
    }
    return options
  }, [autoModelAvailable, models])

  const selectedDefault =
    defaultModelId && modelOptions.some((option) => option.value === defaultModelId)
      ? defaultModelId
      : autoModelAvailable
        ? AUTO_MODEL_ID
        : modelOptions[0]?.value

  const reasoningLevel =
    settings?.reasoningLevel === 'low' ||
    settings?.reasoningLevel === 'medium' ||
    settings?.reasoningLevel === 'high'
      ? settings.reasoningLevel
      : 'medium'
  const routingPreference =
    settings?.routingPreference && isRoutingPreference(settings.routingPreference)
      ? settings.routingPreference
      : 'balanced'

  const setDefaultModel = useCallback(
    async (modelId: string) => {
      if (
        !isAutoModelSelection(modelId) &&
        !modelOptions.some((option) => option.value === modelId)
      ) {
        return
      }
      setDefaultModelId(modelId)
      await AsyncStorage.setItem(DEFAULT_MODEL_STORAGE_KEY, modelId)
    },
    [modelOptions],
  )

  if (!hydrated) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return (
    <SettingsPage title="Models">
      <ScrollView className="flex-1 bg-background" contentContainerClassName="pb-10">
        <SettingsSection
          title="Default model"
          description="Choose a fixed model, or leave it on Auto when routing is available."
        >
          {modelOptions.map((option, index) => {
            const selected = selectedDefault === option.value
            return (
              <View key={option.value}>
                <Pressable
                  onPress={() => void setDefaultModel(option.value)}
                  className="flex-row items-center gap-3 px-4 py-4 active:bg-muted/60"
                >
                  <View className="w-5 items-center">
                    {selected ? <Icon icon={Check} className="w-5 h-5 text-foreground" /> : null}
                  </View>
                  <Text className="text-[16px] font-medium text-foreground">{option.label}</Text>
                </Pressable>
                {index < modelOptions.length - 1 ? <SettingsSectionDivider /> : null}
              </View>
            )
          })}
        </SettingsSection>

        {autoModelAvailable ? (
          <SettingsSection
            title="Routing preference"
            description="Tell Auto whether to lean toward quality, speed, or lower cost."
          >
            {ROUTING_PREFERENCE_OPTIONS.map((option, index) => (
              <View key={option.value}>
                <Pressable
                  onPress={() => void updateSettings({ routingPreference: option.value })}
                  className="flex-row items-center gap-3 px-4 py-4 active:bg-muted/60"
                >
                  <View className="w-5 items-center">
                    {routingPreference === option.value ? (
                      <Icon icon={Check} className="w-5 h-5 text-foreground" />
                    ) : null}
                  </View>
                  <Text className="text-[16px] font-medium text-foreground">{option.label}</Text>
                </Pressable>
                {index < ROUTING_PREFERENCE_OPTIONS.length - 1 ? <SettingsSectionDivider /> : null}
              </View>
            ))}
          </SettingsSection>
        ) : null}

        <SettingsSection
          title="Reasoning"
          description="Enable deeper thinking and choose how much effort supported models should use."
        >
          <SettingsToggleRow
            label="Reasoning"
            description="Extra step-by-step reasoning when the model supports it."
            value={Boolean(settings?.reasoningEnabled)}
            onValueChange={(value) => {
              void updateSettings({ reasoningEnabled: value })
            }}
          />
          <SettingsSectionDivider />
          {(['low', 'medium', 'high'] as const).map((level, index) => (
            <View key={level}>
              <Pressable
                onPress={() => void updateSettings({ reasoningLevel: level })}
                className="flex-row items-center gap-3 px-4 py-4 active:bg-muted/60"
              >
                <View className="w-5 items-center">
                  {reasoningLevel === level ? (
                    <Icon icon={Check} className="w-5 h-5 text-foreground" />
                  ) : null}
                </View>
                <Text className="text-[16px] font-medium capitalize text-foreground">{level}</Text>
              </Pressable>
              {index < 2 ? <SettingsSectionDivider /> : null}
            </View>
          ))}
        </SettingsSection>
      </ScrollView>
    </SettingsPage>
  )
}
