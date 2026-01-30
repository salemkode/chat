import { Calendar } from 'lucide-react'

interface MessageDateProps {
  timestamp?: string | number
}

export function MessageDate({ timestamp }: MessageDateProps) {
  const formatDate = (timestamp?: string | number) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const today = new Date()
    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  return (
    <div className="flex items-center gap-1">
      <Calendar className="h-3 w-3" />
      {formatDate(timestamp)}
    </div>
  )
}
