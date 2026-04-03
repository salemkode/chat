import { Ionicons } from '@expo/vector-icons'
import { ActivityIndicator, Image, Pressable, Text, TextInput, View } from 'react-native'
import { getProjectMention } from '@chat/shared/logic/project-mention'
import { CHAT_BG, CHAT_BORDER, CHAT_CARD, CHAT_FG, CHAT_FG_MUTED } from './constants'
import type { LocalAttachment } from './types'
import type { VoiceComposerState, VoiceTranscriptionMode } from '../../lib/voice'

type ProjectItem = { id: string; name: string; description?: string }

type Props = {
  draft: string
  setDraft: (value: string) => void
  attachments: LocalAttachment[]
  setAttachments: (updater: (current: LocalAttachment[]) => LocalAttachment[]) => void
  mentionOpen: boolean
  setMentionOpen: (open: boolean) => void
  mentionProjects: ProjectItem[]
  onMentionPick: (projectId: string) => void
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
  voiceMode: VoiceTranscriptionMode
  voiceState: VoiceComposerState
  voicePreviewText?: string
  voiceErrorText?: string | null
  onToggleVoice: () => Promise<void>
  onCancelVoice: () => Promise<void>
  voiceDisabled: boolean
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
  mentionProjects,
  onMentionPick,
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
  voiceMode,
  voiceState,
  voicePreviewText,
  voiceErrorText,
  onToggleVoice,
  onCancelVoice,
  voiceDisabled,
}: Props) {
  const attachmentsDisabled = voiceState !== 'idle'
  const showVoicePanel = voiceState !== 'idle' || Boolean(voicePreviewText)

  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: CHAT_BORDER,
        backgroundColor: CHAT_BG,
        paddingHorizontal: 12,
        paddingTop: 8,
        paddingBottom: Math.max(bottomInset, 12),
      }}
    >
      {errorText ? (
        <Text style={{ marginBottom: 8, color: '#eaa3af', fontFamily: 'Inter_400Regular' }}>
          {errorText}
        </Text>
      ) : null}
      {voiceErrorText ? (
        <Text style={{ marginBottom: 8, color: '#eaa3af', fontFamily: 'Inter_400Regular' }}>
          {voiceErrorText}
        </Text>
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
          {mentionProjects.length ? (
            mentionProjects.map((project) => (
              <Pressable
                key={project.id}
                onPress={() => onMentionPick(project.id)}
                style={{ borderRadius: 12, paddingHorizontal: 8, paddingVertical: 8 }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    color: CHAT_FG,
                    fontFamily: 'Inter_500Medium',
                  }}
                >
                  {project.name}
                </Text>
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
          disabled={attachmentsDisabled}
          onPress={() => void onPickImage()}
          style={{
            borderRadius: 999,
            backgroundColor: CHAT_CARD,
            padding: 8,
            opacity: attachmentsDisabled ? 0.45 : 1,
          }}
        >
          <Ionicons name="image-outline" size={20} color={CHAT_FG} />
        </Pressable>
        <Pressable
          disabled={attachmentsDisabled}
          onPress={() => void onPickDocument()}
          style={{
            borderRadius: 999,
            backgroundColor: CHAT_CARD,
            padding: 8,
            opacity: attachmentsDisabled ? 0.45 : 1,
          }}
        >
          <Ionicons name="document-attach-outline" size={20} color={CHAT_FG} />
        </Pressable>
      </View>

      {showVoicePanel ? (
        <View
          style={{
            marginBottom: 8,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: CHAT_BORDER,
            backgroundColor: CHAT_CARD,
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              {voiceState === 'transcribing' ? (
                <ActivityIndicator size="small" color="#4a9cff" />
              ) : (
                <Ionicons
                  name={voiceState === 'recording' ? 'mic' : 'sparkles-outline'}
                  size={18}
                  color={voiceState === 'recording' ? '#4a9cff' : CHAT_FG_MUTED}
                />
              )}
              <Text
                style={{
                  color: CHAT_FG,
                  fontSize: 14,
                  fontFamily: 'Inter_500Medium',
                  flexShrink: 1,
                }}
              >
                {voiceState === 'recording'
                  ? voiceMode === 'cloud'
                    ? 'Recording voice'
                    : 'Listening on device'
                  : 'Transcribing voice'}
              </Text>
            </View>
            <Pressable onPress={() => void onCancelVoice()}>
              <Text style={{ color: '#eaa3af', fontSize: 13, fontFamily: 'Inter_500Medium' }}>
                Cancel
              </Text>
            </Pressable>
          </View>
          {voicePreviewText ? (
            <Text
              style={{
                marginTop: 8,
                color: CHAT_FG_MUTED,
                fontSize: 14,
                lineHeight: 20,
                fontFamily: 'Inter_400Regular',
              }}
            >
              {voicePreviewText}
            </Text>
          ) : null}
        </View>
      ) : null}

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
          disabled={voiceState === 'idle' ? voiceDisabled : false}
          onPress={() => void onToggleVoice()}
          style={{
            marginBottom: 2,
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor:
              voiceState === 'recording'
                ? '#4a9cff'
                : voiceState === 'transcribing'
                  ? '#2f3138'
                  : voiceDisabled
                    ? '#4a4c52'
                    : CHAT_CARD,
          }}
        >
          {voiceState === 'transcribing' ? (
            <ActivityIndicator size="small" color={CHAT_FG} />
          ) : (
            <Ionicons
              name={voiceState === 'recording' ? 'stop' : 'mic-outline'}
              size={20}
              color={voiceState === 'recording' ? '#ffffff' : voiceDisabled ? CHAT_FG_MUTED : CHAT_FG}
            />
          )}
        </Pressable>
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
