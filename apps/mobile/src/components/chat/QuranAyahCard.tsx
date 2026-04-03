import { useEffect } from 'react'
import { Linking, Pressable, Text, View } from 'react-native'
import type { QuranAyahCardData } from '@chat/shared/quran-ayah'
import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from 'expo-audio'
import { CHAT_BORDER, CHAT_CARD, CHAT_FG_MUTED } from './constants'

function formatProgressTime(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

export function QuranAyahCard({ ayah }: { ayah: QuranAyahCardData }) {
  const player = useAudioPlayer(ayah.audioUrl ?? null, {
    updateInterval: 250,
  })
  const status = useAudioPlayerStatus(player)
  const duration = Number.isFinite(status.duration) ? status.duration : 0
  const currentTime = Number.isFinite(status.currentTime)
    ? status.currentTime
    : 0
  const progress =
    duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0

  useEffect(() => {
    if (!ayah.audioUrl) {
      return
    }

    void setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
    })
  }, [ayah.audioUrl])

  useEffect(
    () => () => {
      player.pause()
    },
    [player],
  )

  const handleTogglePlayback = () => {
    if (!ayah.audioUrl) {
      return
    }

    if (status.playing) {
      player.pause()
      return
    }

    if (duration > 0 && currentTime >= duration - 0.15) {
      player.seekTo(0)
    }

    player.play()
  }

  return (
    <View
      style={{
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#3b3224',
        backgroundColor: '#17130d',
        paddingHorizontal: 14,
        paddingVertical: 14,
        shadowColor: '#000',
        shadowOpacity: 0.22,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <View
          style={{
            borderRadius: 999,
            borderWidth: 1,
            borderColor: '#5d4724',
            backgroundColor: '#211a11',
            paddingHorizontal: 10,
            paddingVertical: 5,
          }}
        >
          <Text
            style={{
              color: '#e8c98f',
              fontSize: 12,
              letterSpacing: 0.5,
              fontFamily: 'Inter_600SemiBold',
            }}
          >
            {ayah.verseKey || 'Aya'}
          </Text>
        </View>

        {ayah.sourceUrl ? (
          <Pressable
            onPress={() => {
              void Linking.openURL(ayah.sourceUrl!)
            }}
            hitSlop={8}
          >
            <Text
              style={{
                color: CHAT_FG_MUTED,
                fontSize: 12,
                fontFamily: 'Inter_500Medium',
              }}
            >
              Open source
            </Text>
          </Pressable>
        ) : null}
      </View>

      <Text
        style={{
          marginTop: 14,
          color: '#f5e7c7',
          fontSize: 24,
          lineHeight: 42,
          textAlign: 'right',
          writingDirection: 'rtl',
        }}
      >
        {ayah.arabic}
      </Text>

      {ayah.audioUrl ? (
        <View
          style={{
            marginTop: 14,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: CHAT_BORDER,
            backgroundColor: CHAT_CARD,
            paddingHorizontal: 12,
            paddingVertical: 12,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <Pressable
              onPress={handleTogglePlayback}
              style={{
                minWidth: 92,
                borderRadius: 999,
                backgroundColor: '#e8c98f',
                paddingHorizontal: 14,
                paddingVertical: 10,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  color: '#22170a',
                  fontSize: 14,
                  fontFamily: 'Inter_600SemiBold',
                }}
              >
                {status.playing ? 'Pause' : 'Play aya'}
              </Text>
            </Pressable>

            <View style={{ flex: 1 }}>
              <View
                style={{
                  height: 6,
                  borderRadius: 999,
                  backgroundColor: '#24262c',
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    width: `${progress * 100}%`,
                    height: '100%',
                    borderRadius: 999,
                    backgroundColor: '#d6a85d',
                  }}
                />
              </View>

              <Text
                style={{
                  marginTop: 8,
                  color: CHAT_FG_MUTED,
                  fontSize: 12,
                  fontFamily: 'Inter_400Regular',
                }}
              >
                {formatProgressTime(currentTime)}
                {duration > 0
                  ? ` / ${formatProgressTime(duration)}`
                  : ' / Loading...'}
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      {!ayah.audioUrl ? (
        <Text
          style={{
            marginTop: 12,
            color: CHAT_FG_MUTED,
            fontSize: 12,
            fontFamily: 'Inter_400Regular',
          }}
        >
          Audio is not available for this aya yet.
        </Text>
      ) : null}
    </View>
  )
}
