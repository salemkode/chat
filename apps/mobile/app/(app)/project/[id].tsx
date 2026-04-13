import { Ionicons } from '@expo/vector-icons'
import { FlashList } from '@shopify/flash-list'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery } from 'convex/react'
import { Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { OfflineBanner } from '../../../src/components/offline-banner'
import { useProjects } from '../../../src/mobile-data/use-projects'
import { useSendMessage } from '../../../src/mobile-data/use-send-message'
import type { MobileOfflineProjectRecord } from '../../../src/offline/types'
import { useNetworkStatus } from '../../../src/utils/network-status'
import { api, type Id } from '../../../src/lib/convexApi'

type ProjectThreadListItem = {
  _id: string
  title?: string
}

export default function ProjectDetailScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { isOnline } = useNetworkStatus()
  const { projects, deleteProject } = useProjects()
  const { createThread } = useSendMessage()
  const threadsQuery = useQuery(
    api.projects.listThreadsByProject as never,
    id ? ({ projectId: id as Id<'projects'> } as never) : 'skip',
  )
  const threads: ProjectThreadListItem[] = Array.isArray(threadsQuery) ? threadsQuery : []
  const projectContextApi = (
    api as typeof api & {
      projectContext: {
        listProjectArtifacts: unknown
      }
    }
  ).projectContext
  const artifacts = (useQuery(
    projectContextApi.listProjectArtifacts as never,
    id ? ({ projectId: id as Id<'projects'> } as never) : 'skip',
  ) ?? []) as Array<{
    id: string
    title: string
    kind: string
    status: string
  }>
  const project = projects.find((item: MobileOfflineProjectRecord) => item.id === id)

  if (!id || !project) {
    return (
      <SafeAreaView className="flex-1 bg-background p-4">
        <Text className="font-sans text-foreground">Project not found.</Text>
      </SafeAreaView>
    )
  }

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
        <View className="min-w-0 flex-1 px-2">
          <Text
            numberOfLines={1}
            className="text-center text-[17px] text-foreground"
            style={{ fontFamily: 'Inter_600SemiBold' }}
          >
            {project.name}
          </Text>
        </View>
        <View className="size-10" />
      </View>

      <View className="flex-1 px-4 pt-4">
        <Text className="font-sans text-[15px] text-foreground-secondary">
          {project.description || 'No description'}
        </Text>
        <Text className="mt-1 font-sans text-[14px] text-foreground-secondary">
          {project.threadCount} chats
        </Text>
        <OfflineBanner visible={!isOnline} />

        <View className="mt-4 flex-row flex-wrap gap-3">
          <Pressable
            disabled={!isOnline}
            onPress={async () => {
              const threadId = await createThread('New chat', project.id)
              if (threadId) {
                router.push(`/chat/${threadId}`)
              }
            }}
            className={`rounded-full px-5 py-2.5 ${isOnline ? 'bg-white' : 'bg-send-disabled'}`}
          >
            <Text
              className={`text-[15px] ${isOnline ? 'text-black' : 'text-icon-disabled'}`}
              style={{ fontFamily: 'Inter_600SemiBold' }}
            >
              New chat
            </Text>
          </Pressable>
          <Pressable
            disabled={!isOnline}
            onPress={async () => {
              await deleteProject(project.id)
              router.back()
            }}
            className="rounded-full border border-border bg-danger-surface px-5 py-2.5 active:opacity-90"
          >
            <Text
              className={`text-[15px] ${isOnline ? 'text-danger' : 'text-icon-disabled'}`}
              style={{ fontFamily: 'Inter_600SemiBold' }}
            >
              Delete project
            </Text>
          </Pressable>
        </View>

        <Text
          className="mb-2 mt-6 text-[13px] uppercase tracking-wide text-foreground-secondary"
          style={{ fontFamily: 'Inter_500Medium' }}
        >
          Chats in project
        </Text>
        <View className="min-h-0 flex-1">
          <FlashList
            className="flex-1"
            data={threads}
            keyExtractor={(item) => item._id}
            ListEmptyComponent={
              <Text className="py-4 font-sans text-[15px] text-foreground-secondary">
                No chats yet. Start with New chat.
              </Text>
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => router.push(`/chat/${item._id}`)}
                className="mb-2 rounded-2xl border border-border bg-card px-4 py-3.5 active:bg-elevated"
              >
                <Text
                  className="text-[16px] text-foreground"
                  style={{ fontFamily: 'Inter_500Medium' }}
                >
                  {item.title || 'Untitled chat'}
                </Text>
              </Pressable>
            )}
          />
        </View>

        <Text
          className="mb-2 mt-6 text-[13px] uppercase tracking-wide text-foreground-secondary"
          style={{ fontFamily: 'Inter_500Medium' }}
        >
          Recent artifacts
        </Text>
        {artifacts.length === 0 ? (
          <Text className="py-2 font-sans text-[14px] text-foreground-secondary">
            No project artifacts yet.
          </Text>
        ) : (
          artifacts.slice(0, 6).map((artifact) => (
            <View
              key={artifact.id}
              className="mb-2 rounded-2xl border border-border bg-card px-4 py-3"
            >
              <Text
                className="text-[15px] text-foreground"
                style={{ fontFamily: 'Inter_500Medium' }}
              >
                {artifact.title}
              </Text>
              <Text className="mt-1 text-[12px] text-foreground-secondary">
                {artifact.kind} • {artifact.status}
              </Text>
            </View>
          ))
        )}
      </View>
    </SafeAreaView>
  )
}
