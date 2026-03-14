import { useMemo, useState } from 'react'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { getLucideIcon, lucideIconNames } from '@/lib/lucide'
import { cn } from '@/lib/utils'
import { EntityIcon, type IconType } from '@/components/admin/entity-icon'

const ICON_PRESETS = [
  'Sparkles',
  'Brain',
  'Bot',
  'Shield',
  'Globe',
  'Search',
  'Code2',
  'ChartColumn',
  'Boxes',
  'Cloud',
  'Rocket',
  'Database',
  'Workflow',
  'Stars',
  'WandSparkles',
  'Gem',
] as const

const LUCIDE_ICON_NAMES = lucideIconNames

export function IconPickerField({
  label,
  icon,
  iconType,
  iconId,
  iconUrl,
  onChange,
  onUpload,
}: {
  label: string
  icon?: string
  iconType?: IconType
  iconId?: string
  iconUrl?: string
  onChange: (value: { icon?: string; iconType?: IconType; iconId?: string }) => void
  onUpload: (file: File) => Promise<void>
}) {
  const [search, setSearch] = useState('')
  const currentTab = iconType === 'upload' ? 'upload' : iconType === 'emoji' ? 'emoji' : 'lucide'

  const filteredIcons = useMemo(() => {
    if (!search.trim()) {
      return LUCIDE_ICON_NAMES
    }

    const query = search.toLowerCase()
    return LUCIDE_ICON_NAMES.filter((iconName) =>
      iconName.toLowerCase().includes(query),
    )
  }, [search])

  return (
    <div className="grid gap-3 rounded-xl border border-border/60 bg-muted/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="grid gap-1">
          <Label>{label}</Label>
          <p className="text-xs text-muted-foreground">
            Use a Lucide icon, emoji, or uploaded image.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
          <EntityIcon
            icon={icon}
            iconType={iconType}
            iconUrl={iconUrl}
            className="size-5"
          />
          <span className="text-xs text-muted-foreground">
            {iconType === 'upload'
              ? iconId
                ? 'Uploaded image'
                : 'Upload image'
              : icon || 'No icon selected'}
          </span>
        </div>
      </div>

      <Tabs
        value={currentTab}
        onValueChange={(value) => {
          if (value === 'upload') {
            onChange({ icon: undefined, iconType: 'upload', iconId })
            return
          }
          if (value === 'emoji') {
            onChange({ icon: iconType === 'emoji' ? icon : '✨', iconType: 'emoji' })
            return
          }
          onChange({ icon: iconType === 'lucide' ? icon || 'Sparkles' : 'Sparkles', iconType: 'lucide' })
        }}
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="lucide">Lucide</TabsTrigger>
          <TabsTrigger value="emoji">Emoji</TabsTrigger>
          <TabsTrigger value="upload">Upload</TabsTrigger>
        </TabsList>

        <TabsContent value="lucide" className="grid gap-3">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search icons"
          />
          <div className="flex flex-wrap gap-2">
            {ICON_PRESETS.map((iconName) => (
              <Button
                key={iconName}
                type="button"
                variant={icon === iconName && iconType === 'lucide' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onChange({ icon: iconName, iconType: 'lucide' })}
              >
                {iconName}
              </Button>
            ))}
          </div>
          <ScrollArea className="h-56 rounded-lg border border-border bg-background p-2">
            <div className="grid grid-cols-4 gap-2 pr-3">
              {filteredIcons.slice(0, 120).map((iconName) => {
                const IconComponent = getLucideIcon(iconName)

                return (
                  <button
                    key={iconName}
                    type="button"
                    title={iconName}
                    onClick={() => onChange({ icon: iconName, iconType: 'lucide' })}
                    className={cn(
                      'flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg border p-2 text-[10px] transition-colors',
                      icon === iconName && iconType === 'lucide'
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted',
                    )}
                  >
                    {IconComponent ? <IconComponent className="size-4" /> : null}
                    <span className="line-clamp-2">{iconName}</span>
                  </button>
                )
              })}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="emoji" className="grid gap-3">
          <Input
            value={iconType === 'emoji' ? icon || '' : ''}
            onChange={(event) =>
              onChange({
                icon: event.target.value,
                iconType: 'emoji',
              })
            }
            placeholder="✨"
          />
          <div className="flex flex-wrap gap-2">
            {['✨', '🤖', '🧠', '⚡', '🌐', '🛡️', '📊', '🧪', '🔍', '💎'].map(
              (emoji) => (
                <Button
                  key={emoji}
                  type="button"
                  variant={icon === emoji && iconType === 'emoji' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onChange({ icon: emoji, iconType: 'emoji' })}
                >
                  {emoji}
                </Button>
              ),
            )}
          </div>
        </TabsContent>

        <TabsContent value="upload" className="grid gap-3">
          <Label
            htmlFor={`${label}-upload`}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-background px-4 py-6 text-sm text-muted-foreground"
          >
            <Upload className="size-4" />
            Upload icon image
          </Label>
          <Input
            id={`${label}-upload`}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (!file) {
                return
              }
              void onUpload(file)
            }}
          />
          <p className="text-xs text-muted-foreground">
            Square PNG or SVG works best. {iconId ? 'An uploaded icon is already attached.' : ''}
          </p>
        </TabsContent>
      </Tabs>
    </div>
  )
}
