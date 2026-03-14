'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Camera,
  User,
  Loader2,
  X,
  Settings,
  Bell,
  Palette,
  Moon,
  Monitor,
  Sun,
  Grid3X3,
  Database,
  Shield,
  Users,
  UserCircle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { useTheme } from '@/components/theme-provider'
import { useSettings, useViewer } from '@/hooks/use-chat-data'
import { readFileReaderResultAsString } from '@/lib/parsers'
import { normalizeHexColor, type ThemeMode } from '@/lib/theme'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type SettingsTab =
  | 'general'
  | 'notifications'
  | 'theme'
  | 'apps'
  | 'data'
  | 'security'
  | 'parental'
  | 'account'

interface SettingsItemProps {
  label: string
  description?: string
  children: React.ReactNode
}

function SettingsItem({ label, description, children }: SettingsItemProps) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-border/50 last:border-0">
      <div className="flex-1 pr-4">
        <h3 className="text-sm font-medium text-foreground">{label}</h3>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const user = useViewer()
  const { settings, updateSettings } = useSettings()
  const { isOnline } = useOnlineStatus()
  const { theme, setTheme, primaryColor, setPrimaryColor } = useTheme()

  const [activeTab, setActiveTab] = useState<SettingsTab>('general')
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [image, setImage] = useState<string | null>(null)
  const [primaryColorInput, setPrimaryColorInput] = useState(primaryColor)
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Initialize form values when settings load
  useEffect(() => {
    if (settings || user) {
      setDisplayName(settings?.displayName || user?.name || '')
      setBio(settings?.bio || '')
      setImage(settings?.image || user?.image || null)
    }
  }, [settings, user])

  useEffect(() => {
    setPrimaryColorInput(primaryColor)
  }, [primaryColor])

  const handleImageClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      // Convert to base64
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = readFileReaderResultAsString(reader.result)
        setImage(base64)
      }
      reader.readAsDataURL(file)
    },
    [],
  )

  const handleSave = async () => {
    setIsLoading(true)
    try {
      await updateSettings({
        displayName: displayName || undefined,
        bio: bio || undefined,
        image: image || undefined,
      })
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const displayNameValue = displayName || user?.name || ''
  const emailValue = user?.email || ''

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    {
      id: 'theme',
      label: 'Theme',
      icon: Palette,
    },
    { id: 'apps', label: 'Apps', icon: Grid3X3 },
    { id: 'data', label: 'Data controls', icon: Database },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'parental', label: 'Parental controls', icon: Users },
    { id: 'account', label: 'Account', icon: UserCircle },
  ] satisfies Array<{ id: SettingsTab; label: string; icon: LucideIcon }>

  const themeOptions = [
    {
      id: 'light',
      label: 'Light',
      description: 'Bright neutral surfaces for daytime use.',
      icon: Sun,
      previewClassName:
        'bg-[linear-gradient(135deg,#ffffff_0%,#f3f4f6_60%,#dbeafe_100%)] border-zinc-200',
    },
    {
      id: 'dark',
      label: 'Dark',
      description: 'A darker workspace for low-light environments.',
      icon: Moon,
      previewClassName:
        'bg-[linear-gradient(135deg,#0f172a_0%,#111827_55%,#1d4ed8_100%)] border-slate-700',
    },
    {
      id: 'system',
      label: 'System',
      description: 'Matches your device appearance automatically.',
      icon: Monitor,
      previewClassName:
        'bg-[linear-gradient(135deg,#f8fafc_0%,#dbeafe_45%,#0f172a_100%)] border-slate-300',
    },
  ] satisfies Array<{
    id: ThemeMode
    label: string
    description: string
    icon: LucideIcon
    previewClassName: string
  }>

  const presetColors = [
    '#8b5cf6',
    '#2563eb',
    '#0891b2',
    '#059669',
    '#ea580c',
    '#dc2626',
    '#db2777',
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] h-[600px] p-0 overflow-hidden gap-0 bg-background border border-border">
        <DialogTitle className="sr-only">Settings</DialogTitle>

        <div className="flex h-full">
          {/* Sidebar */}
          <div className="w-[220px] bg-muted/30 border-r border-border flex flex-col">
            <div className="p-4">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() => onOpenChange(false)}
              >
                <X className="size-4" />
              </Button>
            </div>

            <nav className="flex-1 px-2 pb-4 space-y-0.5">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      activeTab === tab.id
                        ? 'bg-muted text-foreground'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                    )}
                  >
                    <Icon className="size-4" />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col bg-background">
            <div className="flex-1 overflow-y-auto p-8">
              {/* General Tab */}
              {activeTab === 'general' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold">General</h2>

                  <SettingsItem label="Language">
                    <Select defaultValue="auto">
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto-detect</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="ar">Arabic</SelectItem>
                      </SelectContent>
                    </Select>
                  </SettingsItem>

                  <SettingsItem
                    label="Spoken language"
                    description="For best results, select the language you mainly speak. If it's not listed, it may still be supported via auto-detection."
                  >
                    <Select defaultValue="ar">
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ar">Arabic</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </SettingsItem>

                  <SettingsItem label="Voice">
                    <div className="flex items-center gap-3">
                      <Button variant="outline" size="sm" className="gap-2">
                        <div className="size-4 rounded-full bg-foreground/10 flex items-center justify-center">
                          <div className="size-0 border-l-[6px] border-l-foreground border-y-[4px] border-y-transparent ml-0.5" />
                        </div>
                        Play
                      </Button>
                      <Select defaultValue="breeze">
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="breeze">Breeze</SelectItem>
                          <SelectItem value="cove">Cove</SelectItem>
                          <SelectItem value="ember">Ember</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </SettingsItem>

                  <SettingsItem
                    label="Separate Voice"
                    description="Keep ChatGPT Voice in a separate full screen, without real time transcripts and visuals."
                  >
                    <Switch />
                  </SettingsItem>
                </div>
              )}

              {activeTab === 'theme' && (
                <div className="space-y-6">
                  <div className="space-y-1">
                    <h2 className="text-lg font-semibold">Theme</h2>
                    <p className="text-sm text-muted-foreground">
                      Theme preferences are stored locally on this device only.
                    </p>
                  </div>

                  <div
                    className="grid gap-3 md:grid-cols-3"
                    style={
                      {
                        '--primary-color-preview': primaryColor,
                      } as React.CSSProperties
                    }
                  >
                    {themeOptions.map((option) => {
                      const Icon = option.icon
                      const isSelected = theme === option.id

                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setTheme(option.id)}
                          className={cn(
                            'rounded-2xl border p-4 text-left transition-colors',
                            isSelected
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/40 hover:bg-muted/40',
                          )}
                        >
                          <div
                            className={cn(
                              'mb-4 h-24 rounded-xl border',
                              option.previewClassName,
                            )}
                          />
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Icon className="size-4" />
                            {option.label}
                          </div>
                          <p className="mt-2 text-xs leading-5 text-muted-foreground">
                            {option.description}
                          </p>
                        </button>
                      )
                    })}
                  </div>

                  <SettingsItem
                    label="Primary color"
                    description="Used for buttons, active states, highlights, and sidebar accents."
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(event) => setPrimaryColor(event.target.value)}
                        className="h-10 w-14 cursor-pointer rounded-md border border-input bg-background p-1"
                        aria-label="Theme primary color"
                      />
                      <Input
                        value={primaryColorInput}
                        onChange={(event) => {
                          const nextValue = event.target.value
                          setPrimaryColorInput(nextValue)

                          if (/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(nextValue)) {
                            setPrimaryColor(
                              normalizeHexColor(nextValue, primaryColor),
                            )
                          }
                        }}
                        onBlur={() => {
                          const normalized = normalizeHexColor(
                            primaryColorInput,
                            primaryColor,
                          )
                          setPrimaryColor(normalized)
                          setPrimaryColorInput(normalized)
                        }}
                        className="w-[120px] font-mono uppercase"
                      />
                    </div>
                  </SettingsItem>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Preset colors</Label>
                    <div className="flex flex-wrap gap-2">
                      {presetColors.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setPrimaryColor(color)}
                          className={cn(
                            'size-9 rounded-full border-2 transition-transform hover:scale-105',
                            primaryColor === color
                              ? 'border-foreground'
                              : 'border-border',
                          )}
                          style={{ backgroundColor: color }}
                          aria-label={`Use ${color} as the primary color`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Account Tab */}
              {activeTab === 'account' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold">Account</h2>

                  {/* Profile Image Section */}
                  <div className="flex items-center gap-6 py-4 border-b border-border/50">
                    <div
                      className="relative group cursor-pointer"
                      onClick={handleImageClick}
                    >
                      <Avatar className="size-20 ring-4 ring-background shadow-lg">
                        <AvatarImage
                          src={image || user?.image || undefined}
                          alt={displayNameValue}
                          className="object-cover"
                        />
                        <AvatarFallback className="bg-primary text-primary-foreground text-xl font-medium">
                          {displayNameValue ? (
                            getInitials(displayNameValue)
                          ) : (
                            <User className="size-8" />
                          )}
                        </AvatarFallback>
                      </Avatar>

                      {/* Overlay */}
                      <div
                        className={cn(
                          'absolute inset-0 rounded-full bg-black/40 flex items-center justify-center',
                          'opacity-0 group-hover:opacity-100 transition-opacity duration-200',
                        )}
                      >
                        <Camera className="size-5 text-white" />
                      </div>

                      {/* Edit badge */}
                      <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1 shadow-md">
                        <Camera className="size-3" />
                      </div>
                    </div>

                    <div>
                      <h3 className="font-medium">Profile Picture</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Click to upload a new photo
                      </p>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </div>

                  {/* Form Fields */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="displayName">Display Name</Label>
                      <Input
                        id="displayName"
                        value={displayNameValue}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Enter your display name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={emailValue}
                        disabled
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground">
                        Email cannot be changed
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Input
                        id="bio"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Tell us a little about yourself"
                      />
                    </div>
                  </div>

                  <div className="pt-4">
                    <h3 className="font-medium mb-2">Account Information</h3>
                    <div className="p-4 rounded-lg bg-muted/50 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Member since
                        </span>
                        <span>
                          {user?.createdAt
                            ? new Date(user.createdAt).toLocaleDateString()
                            : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'data' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold">Data controls</h2>

                  <SettingsItem
                    label="Live query cache"
                    description={
                      'Convex query subscriptions stay warm during navigation so recent data reloads faster without a local sync database.'
                    }
                  >
                    <span className="text-sm font-medium">Enabled</span>
                  </SettingsItem>

                  <SettingsItem
                    label="Connection"
                    description="Live chat updates still require an active network connection."
                  >
                    <span className="text-sm">{isOnline ? 'Online' : 'Offline'}</span>
                  </SettingsItem>
                </div>
              )}

              {/* Other tabs placeholder */}
              {activeTab !== 'general' &&
                activeTab !== 'theme' &&
                activeTab !== 'account' &&
                activeTab !== 'data' && (
                  <div className="space-y-6">
                    <h2 className="text-lg font-semibold">
                      {tabs.find((t) => t.id === activeTab)?.label}
                    </h2>
                    <p className="text-muted-foreground">
                      Settings for{' '}
                      {tabs
                        .find((t) => t.id === activeTab)
                        ?.label.toLowerCase()}{' '}
                      will be available soon.
                    </p>
                  </div>
                )}
            </div>

            {/* Footer */}
            {activeTab === 'account' && (
              <div className="flex justify-end gap-3 px-8 py-4 border-t border-border bg-muted/30">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isLoading || !isOnline}>
                  {isLoading && (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  )}
                  Save Changes
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
