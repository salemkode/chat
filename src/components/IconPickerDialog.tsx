'use client'

import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getLucideIcon } from '@/lib/lucide'

// Popular Lucide icons for chat/thread topics
const POPULAR_ICONS = [
  'MessageCircle',
  'MessageSquare',
  'ChatBubble',
  'ChatDots',
  'Brain',
  'Lightbulb',
  'Zap',
  'Sparkles',
  'Star',
  'Rocket',
  'Target',
  'Compass',
  'Map',
  'BookOpen',
  'Bookmark',
  'FileText',
  'Document',
  'Folder',
  'FolderOpen',
  'Search',
  'Code',
  'Terminal',
  'Bug',
  'GitBranch',
  'Database',
  'Server',
  'Cloud',
  'Globe',
  'Shield',
  'Lock',
  'Key',
  'Settings',
  'Sliders',
  'Tuning',
  'BarChart',
  'PieChart',
  'TrendingUp',
  'DollarSign',
  'CreditCard',
  'ShoppingCart',
  'Package',
  'Truck',
  'Home',
  'Building',
  'Briefcase',
  'User',
  'Users',
  'Team',
  'Heart',
  'ThumbsUp',
  'CheckCircle',
  'AlertCircle',
  'Info',
  'HelpCircle',
  'Question',
  'Flag',
  'Tag',
  'Hash',
  'AtSign',
  'Mail',
  'Phone',
  'Video',
  'Image',
  'Music',
  'Film',
  'Camera',
  'Mic',
  'Headphones',
  'Speaker',
  'Play',
  'Pause',
  'Stop',
  'SkipForward',
  'SkipBack',
  'Repeat',
  'Shuffle',
  'List',
  'Layout',
  'Grid',
  'Table',
  'Columns',
  'Rows',
  'Split',
  'Layers',
  'Stack',
  'Box',
  'Cube',
  'Circle',
  'Square',
  'Triangle',
  'Hexagon',
  'Octagon',
  'Pentagon',
  'Diamond',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUpRight',
  'ArrowDownRight',
  'ArrowUpLeft',
  'ArrowDownLeft',
  'ChevronUp',
  'ChevronDown',
  'ChevronLeft',
  'ChevronRight',
  'Plus',
  'Minus',
  'X',
  'Check',
  'Copy',
  'Clipboard',
  'Scissors',
  'Trash',
  'Edit',
  'Pen',
  'Pencil',
  'Brush',
  'Palette',
  'Paint',
  'Eraser',
  'Ruler',
  'Compass',
  'Calculator',
  'Calendar',
  'Clock',
  'Timer',
  'Hourglass',
  'Watch',
  'Sun',
  'Moon',
  'Cloud',
  'CloudRain',
  'CloudSnow',
  'CloudLightning',
  'Wind',
  'Umbrella',
  'Thermometer',
  'Flame',
  'Droplet',
  'Waves',
  'Mountain',
  'TreePine',
  'TreeDeciduous',
  'Flower',
  'Leaf',
  'Sprout',
  'Seedling',
  'Apple',
  'Cherry',
  'Grape',
  'Orange',
  'Banana',
  'Carrot',
  'Pizza',
  'Coffee',
  'Wine',
  'Beer',
  'GlassWater',
  'Utensils',
  'ChefHat',
  'Plane',
  'Train',
  'Car',
  'Bus',
  'Bike',
  'Footprints',
  'MapPin',
  'Navigation',
  'Locate',
  'Radar',
  'Radio',
  'Wifi',
  'Bluetooth',
  'Battery',
  'BatteryCharging',
  'BatteryFull',
  'BatteryMedium',
  'BatteryLow',
  'BatteryWarning',
  'Plug',
  'Power',
  'Printer',
  'Monitor',
  'Smartphone',
  'Tablet',
  'Laptop',
  'Mouse',
  'Keyboard',
  'Gamepad',
  'Dice',
  'Trophy',
  'Medal',
  'Award',
  'Crown',
  'Gem',
  'Gift',
  'ShoppingBag',
  'Store',
  'Building2',
  'Warehouse',
  'Factory',
  'Hospital',
  'School',
  'Bank',
  'Landmark',
  'Church',
  'Mosque',
  'Synagogue',
  'GraduationCap',
  'Microscope',
  'Telescope',
  'Magnet',
  'Atom',
  'Dna',
  'Pill',
  'Stethoscope',
  'Syringe',
  'Ambulance',
  'Plane',
  'Paperclip',
  'PaperPlane',
  'Link',
  'ExternalLink',
  'Maximize',
  'Minimize',
  'Maximize2',
  'Minimize2',
  'Move',
  'Rotate',
  'Refresh',
  'Repeat',
  'Undo',
  'Redo',
  'History',
  'Archive',
  'Inbox',
  'Send',
  'MailOpen',
  'Mail',
  'AtSign',
  'Hash',
  'Type',
  'Text',
  'Quote',
  'Code',
  'Code2',
  'Braces',
  'Brackets',
  'Parentheses',
  'Asterisk',
  'Ampersand',
  'Percent',
  'Plus',
  'Minus',
  'Divide',
  'Equal',
  'NotEqual',
  'LessThan',
  'GreaterThan',
  'Infinity',
  'Pi',
  'Sigma',
  'Omega',
  'Function',
  'Variable',
  'Superscript',
  'Subscript',
  'Baseline',
  'LineHeight',
  'Indent',
  'Outdent',
  'List',
  'ListOrdered',
  'ListChecks',
  'ListPlus',
  'ListMinus',
  'ListX',
  'ListCollapse',
  'ListStart',
  'ListEnd',
  'ListTree',
  'ListVideo',
  'ListMusic',
  'ListTodo',
  'CheckSquare',
  'Square',
  'Circle',
  'Disc',
  'Octagon',
  'Hexagon',
  'Pentagon',
  'Triangle',
  'Rectangle',
  'Rhombus',
  'Parallelogram',
  'Trapezoid',
  'Crescent',
  'Star',
  'Sparkle',
  'Wand',
  'Wand2',
  'Magic',
  'Ghost',
  'Skull',
  'Bone',
  'Anchor',
  'Ship',
  'Sailboat',
  'Submarine',
  'Rocket',
  'Satellite',
  'SatelliteDish',
  'Telescope',
  'Microscope',
  'Binoculars',
  'Glasses',
  'Sunglasses',
  'Eye',
  'EyeOff',
  'View',
  'Preview',
]

interface IconPickerDialogProps {
  threadId: string
  currentIcon?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function IconPickerDialog({
  threadId,
  currentIcon,
  open,
  onOpenChange,
}: IconPickerDialogProps) {
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const updateIcon = useMutation(api.agents.updateThreadIcon)

  const filteredIcons = search
    ? POPULAR_ICONS.filter((icon) =>
        icon.toLowerCase().includes(search.toLowerCase()),
      )
    : POPULAR_ICONS

  const handleSelectIcon = async (iconName: string) => {
    setIsLoading(true)
    try {
      await updateIcon({ threadId, icon: iconName })
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to update icon:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const renderIcon = (iconName: string) => {
    const IconComponent = getLucideIcon(iconName)
    if (IconComponent) {
      return <IconComponent className="w-6 h-6" />
    }
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Choose Icon</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <Input
            placeholder="Search icons..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-4"
          />

          <div className="grid grid-cols-8 gap-2 overflow-y-auto max-h-[400px] p-2">
            {filteredIcons.map((iconName) => (
              <button
                key={iconName}
                onClick={() => handleSelectIcon(iconName)}
                disabled={isLoading}
                className={`
                  p-3 rounded-lg flex items-center justify-center
                  transition-colors hover:bg-accent
                  ${currentIcon === iconName ? 'bg-primary text-primary-foreground' : 'bg-muted/50'}
                `}
                title={iconName}
              >
                {renderIcon(iconName)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
