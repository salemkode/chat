import { Ionicons } from '@expo/vector-icons'
import { Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

type ModelItem = {
  id: string
  modelId: string
  displayName: string
  description?: string
  isFavorite: boolean
}

type Props = {
  visible: boolean
  models: ModelItem[]
  selectedModelId: string | null
  onClose: () => void
  onSelect: (modelId: string) => void
  onToggleFavorite: (modelId: string, isFavorite: boolean) => void
  offline: boolean
}

export function ModelPickerModal({
  visible,
  models,
  selectedModelId,
  onClose,
  onSelect,
  onToggleFavorite,
  offline,
}: Props) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
        <View className="flex-row items-center justify-between border-b border-border-subtle px-4 py-3">
          <Text
            className="text-[20px] text-foreground"
            style={{ fontFamily: 'Inter_600SemiBold' }}
          >
            Models
          </Text>
          <Pressable
            onPress={onClose}
            className="rounded-full bg-elevated px-4 py-2 active:opacity-80"
          >
            <Text
              className="text-[16px] text-primary"
              style={{ fontFamily: 'Inter_600SemiBold' }}
            >
              Done
            </Text>
          </Pressable>
        </View>
        <ScrollView
          className="flex-1 px-4 pt-3"
          contentContainerClassName="pb-6"
          showsVerticalScrollIndicator={false}
        >
          {models.map((model) => {
            const selected = model.modelId === selectedModelId
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
                    </View>
                    {selected ? (
                      <Ionicons name="checkmark-circle" size={22} color="#4a9cff" />
                    ) : null}
                  </View>
                </Pressable>
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
              </View>
            )
          })}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}
