import { Ionicons } from '@expo/vector-icons'
import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { useEffect, useMemo, useRef } from 'react'
import { Dimensions, InteractionManager, Pressable, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AUTO_MODEL_ID } from '@chat/shared'
import type { ModelPickerDialogProps } from './model-dialog.types'
import { getModelCapabilityLabels, sortModelDialogItems } from './model-dialog.utils'

const SHEET_NAME = 'model-picker'

/** TrueSheet can call present() before iOS registers the view (mount vs didMoveToWindow race). */
async function presentSheetSafely(sheet: TrueSheet | null): Promise<void> {
  if (!sheet) return
  const delays = [0, 16, 48] as const
  let lastError: unknown
  for (const ms of delays) {
    if (ms > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, ms))
    }
    try {
      await sheet.present()
      return
    } catch (e) {
      lastError = e
    }
  }
  throw lastError
}

export function ModelPickerDialog({
  visible,
  models,
  selectedModelId,
  onClose,
  onSelect,
  onToggleFavorite,
  offline,
}: ModelPickerDialogProps) {
  const insets = useSafeAreaInsets()
  const sheetRef = useRef<TrueSheet | null>(null)
  const isPresentedRef = useRef(false)
  const maxSheetHeight = Dimensions.get('window').height * 0.92
  const sortedModels = useMemo(() => sortModelDialogItems(models), [models])

  useEffect(() => {
    if (!visible) {
      if (isPresentedRef.current) {
        isPresentedRef.current = false
        void sheetRef.current?.dismiss().catch(() => {})
      }
      return
    }
    const task = InteractionManager.runAfterInteractions(() => {
      void presentSheetSafely(sheetRef.current)
        .then(() => {
          isPresentedRef.current = true
        })
        .catch(() => {})
    })
    return () => task.cancel?.()
  }, [visible])

  const header = (
    <View className="border-b border-border-subtle px-4 pb-3 pt-1">
      <View className="flex-row items-center justify-between">
        <Text className="text-[20px] text-foreground" style={{ fontFamily: 'Inter_600SemiBold' }}>
          Models
        </Text>
        <Pressable
          onPress={onClose}
          className="rounded-full bg-elevated px-4 py-2 active:opacity-80"
          accessibilityRole="button"
          accessibilityLabel="Done"
        >
          <Text className="text-[16px] text-primary" style={{ fontFamily: 'Inter_600SemiBold' }}>
            Done
          </Text>
        </Pressable>
      </View>
    </View>
  )

  return (
    <TrueSheet
      ref={sheetRef}
      name={SHEET_NAME}
      detents={['auto', 1]}
      maxContentHeight={maxSheetHeight}
      backgroundColor="#000000"
      cornerRadius={20}
      grabber
      grabberOptions={{
        color: '#5b5d63',
        width: 40,
        height: 4,
        topMargin: 8,
      }}
      dimmed
      dismissible
      draggable
      scrollable
      insetAdjustment="automatic"
      header={header}
      onDidDismiss={() => {
        isPresentedRef.current = false
        onClose()
      }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom, 16) + 8,
        }}
      >
        {sortedModels.map((model) => {
          const selected = model.modelId === selectedModelId
          const capabilityLabels = getModelCapabilityLabels(model.capabilities)
          const canFavorite = model.modelId !== AUTO_MODEL_ID
          return (
            <View
              key={model.id}
              className={`mb-3 overflow-hidden rounded-2xl border p-4 ${
                selected ? 'border-primary bg-elevated' : 'border-border bg-card'
              }`}
            >
              <Pressable onPress={() => onSelect(model.modelId)} className="active:opacity-90">
                <View className="flex-row items-center justify-between gap-2">
                  <View className="min-w-0 flex-1">
                    <Text
                      className="text-[17px] text-foreground"
                      style={{ fontFamily: 'Inter_600SemiBold' }}
                    >
                      {model.displayName}
                    </Text>
                    {capabilityLabels.length > 0 ? (
                      <View
                        style={{
                          marginTop: 6,
                          flexDirection: 'row',
                          flexWrap: 'wrap',
                          gap: 6,
                        }}
                      >
                        {capabilityLabels.slice(0, 4).map((label) => (
                          <View
                            key={`${model.id}-${label}`}
                            style={{
                              borderWidth: 1,
                              borderColor: '#2f3138',
                              borderRadius: 8,
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              backgroundColor: '#17191e',
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 10,
                                color: '#c5c7cf',
                                fontFamily: 'Inter_500Medium',
                              }}
                            >
                              {label}
                            </Text>
                          </View>
                        ))}
                        {capabilityLabels.length > 4 ? (
                          <Text
                            style={{
                              fontSize: 10,
                              color: '#8d9099',
                              fontFamily: 'Inter_500Medium',
                              paddingHorizontal: 2,
                              paddingVertical: 2,
                            }}
                          >
                            +{capabilityLabels.length - 4}
                          </Text>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                  {selected ? <Ionicons name="checkmark-circle" size={22} color="#4a9cff" /> : null}
                </View>
              </Pressable>
              {canFavorite ? (
                <Pressable
                  disabled={offline}
                  onPress={() => onToggleFavorite(model.id, !model.isFavorite)}
                  className="mt-3 flex-row items-center gap-2 active:opacity-80"
                >
                  <Ionicons
                    name={model.isFavorite ? 'star' : 'star-outline'}
                    size={18}
                    color={offline ? '#5b5d63' : '#4a9cff'}
                  />
                  <Text
                    className={`font-sans text-[15px] ${offline ? 'text-icon-disabled' : 'text-primary'}`}
                  >
                    {model.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          )
        })}
      </ScrollView>
    </TrueSheet>
  )
}
