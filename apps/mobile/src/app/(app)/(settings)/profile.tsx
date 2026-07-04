import { SettingsPage } from '@/components/settings/settings-shell'
import { useViewer } from '@/hooks/use-viewer'
import { useSettings } from '@/hooks/use-settings'
import { pickOneImage } from '@/lib/image-picker'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'

export default function ProfileScreen() {
  const viewer = useViewer()
  const { settings, updateSettings } = useSettings()
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (viewer) {
      setDisplayName(viewer.name || '')
      setImageUri(viewer.image || null)
    }
  }, [viewer])

  useEffect(() => {
    if (settings) {
      setBio(settings.bio || '')
      if (settings.image) {
        setImageUri(settings.image)
      }
    }
  }, [settings])

  if (!viewer) {
    return (
      <SettingsPage title="Profile">
        <View className="flex-1 items-center justify-center bg-background">
          <ActivityIndicator size="large" />
        </View>
      </SettingsPage>
    )
  }

  const initials = (displayName || viewer.name || 'U')
    .split(' ')
    .map((part: string) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const handlePickImage = async () => {
    const image = await pickOneImage()
    if (image) {
      setImageUri(image.uri)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateSettings({
        displayName: displayName.trim() || undefined,
        bio: bio.trim() || undefined,
        image: imageUri || undefined,
      })
    } catch (err) {
      console.error('Failed to save:', err)
      Alert.alert('Error', 'Could not save your account settings.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SettingsPage title="Profile">
      <ScrollView
        className="flex-1 bg-background text-foreground"
        contentContainerClassName="px-5 pb-10"
        keyboardDismissMode="interactive"
      >
        <Pressable
          onPress={() => void handlePickImage()}
          className="mt-6 self-center active:opacity-80"
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} className="h-20 w-20 rounded-full bg-muted" />
          ) : (
            <View className="h-20 w-20 items-center justify-center rounded-full bg-foreground">
              <Text className="text-xl font-semibold text-background">{initials}</Text>
            </View>
          )}
        </Pressable>
        <Text className="mt-2 text-center text-[13px] text-muted-foreground">
          Tap to upload a new photo
        </Text>

        <Text className="mb-2 mt-8 text-[13px] font-medium text-muted-foreground">
          Display name
        </Text>
        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          className="rounded-xl bg-muted px-4 py-3 text-[17px] text-foreground"
          style={{ borderCurve: 'continuous' }}
          placeholderTextColor="#999"
        />

        <Text className="mb-2 mt-6 text-[13px] font-medium text-muted-foreground">Email</Text>
        <TextInput
          value={viewer.email ?? ''}
          editable={false}
          className="rounded-xl bg-muted px-4 py-3 text-[17px] text-muted-foreground"
          style={{ borderCurve: 'continuous' }}
        />

        <Text className="mb-2 mt-6 text-[13px] font-medium text-muted-foreground">Bio</Text>
        <TextInput
          value={bio}
          onChangeText={setBio}
          multiline
          className="min-h-[120px] rounded-xl bg-muted px-4 py-3 text-[15px] leading-relaxed text-foreground"
          style={{ borderCurve: 'continuous', textAlignVertical: 'top' }}
          placeholderTextColor="#999"
        />

        <Pressable
          className="mt-8 items-center rounded-xl bg-foreground py-3.5 active:opacity-80"
          style={{ borderCurve: 'continuous' }}
          onPress={() => void handleSave()}
          disabled={saving}
        >
          <Text className="text-[17px] font-semibold text-background">
            {saving ? 'Saving…' : 'Save changes'}
          </Text>
        </Pressable>
      </ScrollView>
    </SettingsPage>
  )
}
