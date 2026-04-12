import { Ionicons } from '@expo/vector-icons'
import type { ChatSuggestion } from '@chat/shared'
import { Image, Platform, Pressable, Text, TextInput, View } from 'react-native'
import { getProjectMention } from '@chat/shared/logic/project-mention'
import { CHAT_BG, CHAT_BORDER, CHAT_CARD, CHAT_FG, CHAT_FG_MUTED } from './constants'
import { ContextMeter } from './ContextMeter'
import { ChatSuggestions } from './ChatSuggestions'
import type { LocalAttachment } from './types'
import type { Id } from '../../lib/convexApi'

type MentionProjectOption =
  | {
      kind: 'new-project-ai'
      id: '__new_project_ai__'
      name: string
      description?: string
    }
  | {
      kind: 'project'
      id: string
      name: string
      description?: string
    }

type PendingProjectDraft = {
  name: string
  description?: string
  loading: boolean
  error?: string | null
}

type Props = {
  draft: string
  setDraft: (value: string) => void
  attachments: LocalAttachment[]
  setAttachments: (updater: (current: LocalAttachment[]) => LocalAttachment[]) => void
  mentionOpen: boolean
  setMentionOpen: (open: boolean) => void
  mentionOptions: MentionProjectOption[]
  onMentionPick: (optionId: string) => void
  pendingProjectDraft?: PendingProjectDraft | null
  onPendingProjectNameChange: (name: string) => void
  onPendingProjectDescriptionChange: (description: string) => void
  onConfirmCreateProject: () => void
  onCancelCreateProject: () => void
  creatingProject?: boolean
  showSuggestions?: boolean
  suggestions?: ChatSuggestion[]
  onSuggestionPick?: (prompt: string) => void
  modelLabel: string
  onOpenModelPicker: () => void
  searchEnabled: boolean
  onToggleSearch: () => void
  onPickImage: () => Promise<void>
  onPickDocument: () => Promise<void>
  onSend: () => Promise<void>
  sendDisabled: boolean
  isOnline: boolean
  bottomInset: number
  errorText?: string | null
  contextThreadId?: string
  contextModelDocId?: Id<'models'>
}

function formatAttachmentSize(sizeBytes?: number) {
  if (!sizeBytes || sizeBytes <= 0) {
    return null
  }
  if (sizeBytes < 1024 * 1024) {
    return `${Math.round(sizeBytes / 1024)} KB`
  }
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ChatComposer({
  draft,
  setDraft,
  attachments,
  setAttachments,
  mentionOpen,
  setMentionOpen,
  mentionOptions,
  onMentionPick,
  pendingProjectDraft,
  onPendingProjectNameChange,
  onPendingProjectDescriptionChange,
  onConfirmCreateProject,
  onCancelCreateProject,
  creatingProject = false,
  showSuggestions = false,
  suggestions = [],
  onSuggestionPick,
  modelLabel,
  onOpenModelPicker,
  searchEnabled,
  onToggleSearch,
  onPickImage,
  onPickDocument,
  onSend,
  sendDisabled,
  isOnline,
  bottomInset,
  errorText,
  contextThreadId,
  contextModelDocId,
}: Props) {
  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: CHAT_BORDER,
        backgroundColor: CHAT_BG,
        paddingHorizontal: 12,
        paddingTop: 8,
        paddingBottom: Math.max(bottomInset, 12) + 10,
      }}
    >
      {errorText ? (
        <Text style={{ marginBottom: 8, color: '#eaa3af', fontFamily: 'Inter_400Regular' }}>
          {errorText}
        </Text>
      ) : null}

      <ContextMeter threadId={contextThreadId} modelDocId={contextModelDocId} />

      {showSuggestions && suggestions.length > 0 && onSuggestionPick ? (
        <ChatSuggestions suggestions={suggestions} onSelect={onSuggestionPick} />
      ) : null}

      {attachments.length > 0 ? (
        <View
          style={{
            marginBottom: 8,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: CHAT_BORDER,
            backgroundColor: CHAT_CARD,
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
        >
          {attachments.map((item) => (
            <View
              key={`${item.name}-${item.uri}`}
              style={{
                marginBottom: 6,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flex: 1, marginRight: 8, flexDirection: 'row', alignItems: 'center' }}>
                {item.mimeType.startsWith('image/') ? (
                  <Image
                    source={{ uri: item.uri }}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      marginRight: 10,
                      backgroundColor: '#1b1d22',
                    }}
                    resizeMode="cover"
                  />
                ) : null}
                <View style={{ flex: 1 }}>
                  <Text
                    numberOfLines={1}
                    style={{
                      fontSize: 14,
                      color: CHAT_FG,
                      fontFamily: 'Inter_400Regular',
                    }}
                  >
                    {item.name}
                  </Text>
                  {formatAttachmentSize(item.sizeBytes) ? (
                    <Text
                      style={{
                        marginTop: 2,
                        fontSize: 12,
                        color: CHAT_FG_MUTED,
                        fontFamily: 'Inter_400Regular',
                      }}
                    >
                      {formatAttachmentSize(item.sizeBytes)}
                    </Text>
                  ) : null}
                </View>
              </View>
              <Pressable
                onPress={() =>
                  setAttachments((current) => current.filter((entry) => entry.uri !== item.uri))
                }
              >
                <Text style={{ fontSize: 14, color: '#eaa3af', fontFamily: 'Inter_400Regular' }}>
                  Remove
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {pendingProjectDraft ? (
        <View
          style={{
            marginBottom: 8,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: CHAT_BORDER,
            backgroundColor: CHAT_CARD,
            paddingHorizontal: 12,
            paddingVertical: 10,
            gap: 8,
          }}
        >
          <Text
            style={{
              fontSize: 14,
              color: CHAT_FG,
              fontFamily: 'Inter_500Medium',
            }}
          >
            New project for this chat
          </Text>
          {pendingProjectDraft.loading ? (
            <Text
              style={{
                fontSize: 12,
                color: CHAT_FG_MUTED,
                fontFamily: 'Inter_400Regular',
              }}
            >
              Generating project suggestion...
            </Text>
          ) : null}
          {pendingProjectDraft.error ? (
            <Text
              style={{
                fontSize: 12,
                color: '#eaa3af',
                fontFamily: 'Inter_400Regular',
              }}
            >
              {pendingProjectDraft.error}
            </Text>
          ) : null}
          <TextInput
            value={pendingProjectDraft.name}
            onChangeText={onPendingProjectNameChange}
            placeholder="Project name"
            placeholderTextColor={CHAT_FG_MUTED}
            editable={!pendingProjectDraft.loading && !creatingProject}
            style={{
              borderWidth: 1,
              borderColor: CHAT_BORDER,
              borderRadius: 12,
              paddingHorizontal: 10,
              paddingVertical: 8,
              fontFamily: 'Inter_400Regular',
              color: CHAT_FG,
              fontSize: 14,
            }}
          />
          <TextInput
            value={pendingProjectDraft.description ?? ''}
            onChangeText={onPendingProjectDescriptionChange}
            placeholder="Project description (optional)"
            placeholderTextColor={CHAT_FG_MUTED}
            editable={!pendingProjectDraft.loading && !creatingProject}
            multiline
            style={{
              borderWidth: 1,
              borderColor: CHAT_BORDER,
              borderRadius: 12,
              paddingHorizontal: 10,
              paddingVertical: 8,
              fontFamily: 'Inter_400Regular',
              color: CHAT_FG,
              fontSize: 13,
              minHeight: 64,
              textAlignVertical: 'top',
            }}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
            <Pressable
              onPress={onCancelCreateProject}
              style={{
                borderWidth: 1,
                borderColor: CHAT_BORDER,
                borderRadius: 10,
                paddingHorizontal: 10,
                paddingVertical: 6,
              }}
            >
              <Text style={{ color: CHAT_FG_MUTED, fontFamily: 'Inter_400Regular' }}>Cancel</Text>
            </Pressable>
            <Pressable
              disabled={
                creatingProject || pendingProjectDraft.loading || !pendingProjectDraft.name.trim()
              }
              onPress={onConfirmCreateProject}
              style={{
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 6,
                backgroundColor:
                  creatingProject || pendingProjectDraft.loading || !pendingProjectDraft.name.trim()
                    ? '#4a4c52'
                    : '#ffffff',
              }}
            >
              <Text
                style={{
                  color:
                    creatingProject ||
                    pendingProjectDraft.loading ||
                    !pendingProjectDraft.name.trim()
                      ? CHAT_FG_MUTED
                      : '#000000',
                  fontFamily: 'Inter_500Medium',
                }}
              >
                {creatingProject ? 'Creating...' : 'Create project'}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {mentionOpen ? (
        <View
          style={{
            marginBottom: 8,
            maxHeight: 128,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: CHAT_BORDER,
            backgroundColor: CHAT_CARD,
            paddingHorizontal: 8,
            paddingVertical: 4,
          }}
        >
          {mentionOptions.length ? (
            mentionOptions.map((option) => (
              <Pressable
                key={option.id}
                onPress={() => onMentionPick(option.id)}
                style={{ borderRadius: 12, paddingHorizontal: 8, paddingVertical: 8 }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    color: CHAT_FG,
                    fontFamily: 'Inter_500Medium',
                  }}
                >
                  {option.name}
                </Text>
                {option.description ? (
                  <Text
                    style={{
                      marginTop: 2,
                      fontSize: 12,
                      color: CHAT_FG_MUTED,
                      fontFamily: 'Inter_400Regular',
                    }}
                  >
                    {option.description}
                  </Text>
                ) : null}
              </Pressable>
            ))
          ) : (
            <Text
              style={{
                paddingHorizontal: 8,
                paddingVertical: 8,
                fontSize: 14,
                color: CHAT_FG_MUTED,
                fontFamily: 'Inter_400Regular',
              }}
            >
              No matching projects
            </Text>
          )}
        </View>
      ) : null}

      <View
        style={{
          marginBottom: 8,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 4,
        }}
      >
        <Pressable
          onPress={onOpenModelPicker}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            borderRadius: 999,
            backgroundColor: CHAT_CARD,
            paddingHorizontal: 10,
            paddingVertical: 8,
            maxWidth: 140,
          }}
        >
          <Ionicons name="hardware-chip-outline" size={18} color={CHAT_FG_MUTED} />
          <Text
            numberOfLines={1}
            style={{
              fontSize: 13,
              color: CHAT_FG_MUTED,
              fontFamily: 'Inter_400Regular',
              flexShrink: 1,
            }}
          >
            {modelLabel}
          </Text>
        </Pressable>
        <Pressable
          onPress={onToggleSearch}
          style={{
            borderRadius: 999,
            paddingHorizontal: 10,
            paddingVertical: 8,
            backgroundColor: searchEnabled ? '#22232a' : CHAT_CARD,
          }}
        >
          <Ionicons name="search" size={18} color={searchEnabled ? '#4a9cff' : CHAT_FG_MUTED} />
        </Pressable>
        <Pressable
          onPress={() => void onPickImage()}
          style={{ borderRadius: 999, backgroundColor: CHAT_CARD, padding: 8 }}
        >
          <Ionicons name="image-outline" size={20} color={CHAT_FG} />
        </Pressable>
        <Pressable
          onPress={() => void onPickDocument()}
          style={{ borderRadius: 999, backgroundColor: CHAT_CARD, padding: 8 }}
        >
          <Ionicons name="document-attach-outline" size={20} color={CHAT_FG} />
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
        <View
          style={{
            minHeight: 48,
            flex: 1,
            borderRadius: 26,
            backgroundColor: CHAT_CARD,
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}
        >
          <TextInput
            value={draft}
            onChangeText={(value) => {
              setDraft(value)
              const nextMention = getProjectMention(value, value.length)
              setMentionOpen(Boolean(nextMention))
            }}
            {...(Platform.OS === 'web'
              ? ({
                  onKeyDown: (e: {
                    key: string
                    shiftKey: boolean
                    preventDefault: () => void
                  }) => {
                    if (e.key === 'Enter' && e.shiftKey && !sendDisabled && isOnline) {
                      e.preventDefault()
                      void onSend()
                    }
                  },
                } as Record<string, unknown>)
              : {})}
            placeholder="Message…"
            placeholderTextColor={CHAT_FG_MUTED}
            selectionColor="#4a9cff"
            multiline
            style={{
              fontFamily: 'Inter_400Regular',
              fontSize: 17,
              lineHeight: 24,
              color: CHAT_FG,
              maxHeight: 112,
              minHeight: 24,
              padding: 0,
            }}
          />
        </View>
        <Pressable
          disabled={sendDisabled || !isOnline}
          onPress={() => void onSend()}
          style={{
            marginBottom: 2,
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: !sendDisabled && isOnline ? '#ffffff' : '#4a4c52',
          }}
        >
          <Ionicons
            name="arrow-up"
            size={22}
            color={!sendDisabled && isOnline ? '#000000' : CHAT_FG_MUTED}
          />
        </Pressable>
      </View>
    </View>
  )
}
