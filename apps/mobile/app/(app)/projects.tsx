import { Ionicons } from '@expo/vector-icons'
import { FlashList } from '@shopify/flash-list'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Modal, Pressable, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { OfflineBanner } from '../../src/components/offline-banner'
import type { MobileOfflineProjectRecord } from '../../src/offline/types'
import { useProjects } from '../../src/mobile-data/use-projects'
import { useNetworkStatus } from '../../src/utils/network-status'

export default function ProjectsTabScreen() {
  const router = useRouter()
  const { isOnline } = useNetworkStatus()
  const { projects, createProject, updateProject, deleteProject } = useProjects()
  const [createOpen, setCreateOpen] = useState(false)
  const [editProjectId, setEditProjectId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const editProject = projects.find((item) => item.id === editProjectId)

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <View className="flex-row items-center border-b border-border-subtle px-2 py-2">
        <Pressable
          onPress={() => router.back()}
          className="size-10 items-center justify-center rounded-full active:bg-card"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={26} color="#f5f5f5" />
        </Pressable>
        <Text
          className="flex-1 text-center text-[17px] text-foreground"
          style={{ fontFamily: 'Inter_600SemiBold' }}
        >
          Projects
        </Text>
        <Pressable
          onPress={() => setCreateOpen(true)}
          disabled={!isOnline}
          className="size-10 items-center justify-center rounded-full active:bg-card"
        >
          <Ionicons name="add" size={28} color={isOnline ? '#f5f5f5' : '#5b5d63'} />
        </Pressable>
      </View>

      <View className="min-h-0 flex-1 px-4 pt-3">
        <OfflineBanner visible={!isOnline} />
        <FlashList<MobileOfflineProjectRecord>
          className="flex-1"
          data={projects}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <Text className="py-8 text-center font-sans text-[15px] text-foreground-secondary">
              No projects yet. Tap + to create one.
            </Text>
          }
          renderItem={({ item }) => (
            <View className="mb-3 overflow-hidden rounded-2xl border border-border bg-card">
              <Pressable
                onPress={() => router.push(`/project/${item.id}`)}
                className="px-4 py-4 active:bg-elevated"
              >
                <Text
                  className="text-[18px] text-foreground"
                  style={{ fontFamily: 'Inter_600SemiBold' }}
                >
                  {item.name}
                </Text>
                <Text className="mt-1 font-sans text-[14px] text-foreground-secondary">
                  {item.description || 'No description'}
                </Text>
                <Text className="mt-2 font-sans text-[13px] text-foreground-secondary">
                  {item.threadCount} chats
                </Text>
              </Pressable>
              <View className="flex-row gap-2 border-t border-border-subtle px-3 py-2">
                <Pressable
                  disabled={!isOnline}
                  onPress={() => {
                    setEditProjectId(item.id)
                    setName(item.name)
                    setDescription(item.description || '')
                  }}
                  className="rounded-xl px-3 py-2 active:bg-elevated"
                >
                  <Text
                    className={`font-sans text-[15px] ${isOnline ? 'text-primary' : 'text-icon-disabled'}`}
                  >
                    Edit
                  </Text>
                </Pressable>
                <Pressable
                  disabled={!isOnline}
                  onPress={() => void deleteProject(item.id)}
                  className="rounded-xl px-3 py-2 active:bg-elevated"
                >
                  <Text
                    className={`font-sans text-[15px] ${isOnline ? 'text-danger' : 'text-icon-disabled'}`}
                  >
                    Delete
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      </View>

      <Modal visible={createOpen} animationType="slide" onRequestClose={() => setCreateOpen(false)}>
        <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
          <View className="flex-row items-center border-b border-border-subtle px-4 py-3">
            <Pressable onPress={() => setCreateOpen(false)} className="mr-2 p-2 active:opacity-80">
              <Text className="font-sans text-[17px] text-primary">Cancel</Text>
            </Pressable>
            <Text
              className="flex-1 text-center text-[17px] text-foreground"
              style={{ fontFamily: 'Inter_600SemiBold' }}
            >
              New project
            </Text>
            <View className="w-16" />
          </View>
          <View className="gap-4 p-4">
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Name"
              placeholderTextColorClassName="accent-foreground-secondary"
              selectionColorClassName="accent-primary"
              className="rounded-2xl border border-border bg-card px-4 py-3.5 font-sans text-[17px] text-foreground"
            />
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Description"
              placeholderTextColorClassName="accent-foreground-secondary"
              selectionColorClassName="accent-primary"
              multiline
              className="min-h-[120px] rounded-2xl border border-border bg-card px-4 py-3.5 font-sans text-[17px] text-foreground"
            />
            <Pressable
              onPress={async () => {
                if (!name.trim()) return
                await createProject({
                  name: name.trim(),
                  description: description.trim() || undefined,
                })
                setName('')
                setDescription('')
                setCreateOpen(false)
              }}
              className="rounded-full bg-white py-4 active:opacity-90"
            >
              <Text
                className="text-center text-[17px] text-black"
                style={{ fontFamily: 'Inter_600SemiBold' }}
              >
                Create
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={Boolean(editProject)}
        animationType="slide"
        onRequestClose={() => setEditProjectId(null)}
      >
        <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
          <View className="flex-row items-center border-b border-border-subtle px-4 py-3">
            <Pressable
              onPress={() => setEditProjectId(null)}
              className="mr-2 p-2 active:opacity-80"
            >
              <Text className="font-sans text-[17px] text-primary">Cancel</Text>
            </Pressable>
            <Text
              className="flex-1 text-center text-[17px] text-foreground"
              style={{ fontFamily: 'Inter_600SemiBold' }}
            >
              Edit project
            </Text>
            <View className="w-16" />
          </View>
          <View className="gap-4 p-4">
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Name"
              placeholderTextColorClassName="accent-foreground-secondary"
              selectionColorClassName="accent-primary"
              className="rounded-2xl border border-border bg-card px-4 py-3.5 font-sans text-[17px] text-foreground"
            />
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Description"
              placeholderTextColorClassName="accent-foreground-secondary"
              selectionColorClassName="accent-primary"
              multiline
              className="min-h-[120px] rounded-2xl border border-border bg-card px-4 py-3.5 font-sans text-[17px] text-foreground"
            />
            <Pressable
              onPress={async () => {
                if (!editProjectId || !name.trim()) return
                await updateProject({
                  projectId: editProjectId,
                  name: name.trim(),
                  description: description.trim() || undefined,
                })
                setEditProjectId(null)
              }}
              className="rounded-full bg-white py-4 active:opacity-90"
            >
              <Text
                className="text-center text-[17px] text-black"
                style={{ fontFamily: 'Inter_600SemiBold' }}
              >
                Save
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}
