import { Clock } from 'lucide-react'

interface MessageMetadataProps {
  timestamp?: string | number
}

export function MessageMetadata({ timestamp }: MessageMetadataProps) {
  const formatTime = (timestamp?: string | number) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex items-center gap-1">
      <Clock className="h-3 w-3" />
      {formatTime(timestamp)}
    </div>
  )
}
