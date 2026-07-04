import { AppHeader } from '@/components/app-header'
import { ModelPickerContent } from '@/components/dialog/model-picker-content'
import { useModel } from '@/components/model-context'
import { useRouter } from 'expo-router'
import { View } from 'react-native'

export default function ModelPickerSheet() {
  const { selectedModelKey, setSelectedModelKey } = useModel()
  const router = useRouter()

  const selectModelAndClose = (modelKey: string) => {
    setSelectedModelKey(modelKey)
    router.back()
  }

  return (
    <View className="flex-1 bg-background">
      <AppHeader title="Model" showCloseButton />
      <ModelPickerContent
        selectedModelKey={selectedModelKey}
        onSelectModelKey={selectModelAndClose}
      />
    </View>
  )
}
