declare module 'expo-speech-recognition' {
  export type SpeechRecognitionPermissionResponse = {
    status: string
    granted: boolean
    canAskAgain: boolean
    expires: string
    restricted?: boolean
  }

  export type SpeechRecognitionResult = {
    transcript: string
    confidence?: number
  }

  export type SpeechRecognitionResultEvent = {
    results: SpeechRecognitionResult[]
    isFinal: boolean
  }

  export type SpeechRecognitionErrorEvent = {
    error: string
    message?: string
  }

  export type SpeechRecognitionOptions = {
    lang?: string
    interimResults?: boolean
    continuous?: boolean
    maxAlternatives?: number
    requiresOnDeviceRecognition?: boolean
    addsPunctuation?: boolean
    iosTaskHint?: 'unspecified' | 'dictation' | 'search' | 'confirmation'
  }

  export const ExpoSpeechRecognitionModule: {
    start(options: SpeechRecognitionOptions): void
    stop(): void
    abort(): void
    requestPermissionsAsync(): Promise<SpeechRecognitionPermissionResponse>
    isRecognitionAvailable(): boolean
    supportsOnDeviceRecognition(): boolean
    getSupportedLocales?():
      | Promise<string[]>
      | string[]
      | Record<string, unknown>
      | Promise<Record<string, unknown>>
  }

  export function useSpeechRecognitionEvent(
    eventName: 'start' | 'end' | 'result' | 'error',
    listener: (event: any) => void,
  ): void
}
