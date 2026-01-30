import { useState } from 'react'
import { AtSign, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

const pages = [
  { icon: '📋', label: 'Meeting Notes' },
  { icon: '📊', label: 'Project Dashboard' },
  { icon: '💡', label: 'Ideas & Brainstorming' },
  { icon: '📅', label: 'Calendar & Events' },
  { icon: '📑', label: 'Documentation' },
  { icon: '🎯', label: 'Goals & Objectives' },
  { icon: '💰', label: 'Budget Planning' },
  { icon: '👥', label: 'Team Directory' },
  { icon: '🔧', label: 'Technical Specs' },
]

export function ContextPopover() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPage, setSelectedPage] = useState<string | null>(null)

  const filteredPages = pages.filter((page) =>
    page.label.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-700"
        >
          <AtSign className="h-4 w-4" />
          Add context
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 rounded-xl border-zinc-800 bg-zinc-900 p-0"
        align="start"
        sideOffset={8}
      >
        <div className="flex items-center gap-2 border-b border-zinc-800 px-3 py-2">
          <Search className="h-4 w-4 text-zinc-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search pages..."
            className="h-8 border-0 bg-transparent p-0 text-sm text-zinc-300 placeholder:text-zinc-500 focus-visible:ring-0"
          />
        </div>
        <div className="p-2">
          <p className="mb-2 px-2 text-xs font-medium text-zinc-500">Pages</p>
          <div className="max-h-64 overflow-y-auto">
            {filteredPages.map((page) => (
              <button
                type="button"
                key={page.label}
                onClick={() => {
                  setSelectedPage(page.label)
                  setSearchQuery('')
                }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-800',
                  selectedPage === page.label && 'bg-zinc-800',
                )}
              >
                <span className="text-base">{page.icon}</span>
                {page.label}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
