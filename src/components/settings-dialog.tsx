'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  Brain,
  Camera,
  Database,
  Loader2,
  Monitor,
  Moon,
  Palette,
  Settings,
  Sun,
  User,
  UserCircle,
  Wrench,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { AdaptiveDialog } from '@/components/ui/adaptive-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useTheme } from '@/components/theme-provider'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { useRoleContext, useSettings, useViewer } from '@/hooks/use-chat-data'
import { normalizeHexColor, type ThemeMode } from '@/lib/theme'
import { readFileReaderResultAsString } from '@/lib/parsers'
import { cn } from '@/lib/utils'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type SettingsTab = 'general' | 'theme' | 'model' | 'data' | 'account' | 'admin'

type SettingsItemProps = {
  label: string
  description?: string
  children: React.ReactNode
}

function SettingsItem({ label, description, children }: SettingsItemProps) {
  return (
    <div className="flex items-center justify-between border-b border-border/50 py-4 last:border-0">
      <div className="flex-1 pr-4">
        <h3 className="text-sm font-medium text-foreground">{label}</h3>
        {description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const user = useViewer()
  const { settings, updateSettings } = useSettings()
  const { isAdminLike } = useRoleContext()
  const { isOnline } = useOnlineStatus()
  const { theme, setTheme, primaryColor, setPrimaryColor } = useTheme()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<SettingsTab>('general')
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [image, setImage] = useState<string | null>(null)
  const [primaryColorInput, setPrimaryColorInput] = useState(primaryColor)
  const [isSavingAccount, setIsSavingAccount] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const tabs = useMemo(
    () =>
      [
        { id: 'general', label: 'General', icon: Settings },
        { id: 'theme', label: 'Theme', icon: Palette },
        { id: 'model', label: 'Model features', icon: Brain },
        { id: 'data', label: 'Data controls', icon: Database },
        { id: 'account', label: 'Account', icon: UserCircle },
        ...(isAdminLike
          ? [{ id: 'admin' as const, label: 'Admin', icon: Wrench }]
          : []),
      ] satisfies Array<{ id: SettingsTab; label: string; icon: LucideIcon }>,
    [isAdminLike],
  )

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

  const displayNameValue = displayName || user?.name || ''
  const emailValue = user?.email || ''

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) {
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = readFileReaderResultAsString(reader.result)
        setImage(base64)
      }
      reader.readAsDataURL(file)
    },
    [],
  )

  const handleSaveAccount = useCallback(async () => {
    setIsSavingAccount(true)
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
      setIsSavingAccount(false)
    }
  }, [bio, displayName, image, onOpenChange, updateSettings])

  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Settings"
      description="Account, data, theme, and model preferences"
      contentClassName="h-[min(600px,85dvh)] w-[min(800px,calc(100vw-2rem))] sm:max-w-[min(800px,calc(100vw-2rem))]"
    >
      <div className="flex h-full">
        <div className="flex w-[220px] flex-col border-r border-border bg-muted/30">
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

          <nav className="flex-1 space-y-0.5 px-2 pb-4">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
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

        <div className="flex flex-1 flex-col bg-background">
          <div className="flex-1 overflow-y-auto p-8">
            {activeTab === 'general' ? (
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
              </div>
            ) : null}

            {activeTab === 'theme' ? (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold">Theme</h2>
                <div
                  className="grid gap-3 md:grid-cols-3"
                  style={{ '--primary-color-preview': primaryColor } as React.CSSProperties}
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
                        <div className={cn('mb-4 h-24 rounded-xl border', option.previewClassName)} />
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Icon className="size-4" />
                          {option.label}
                        </div>
                        <p className="mt-2 text-xs leading-5 text-muted-foreground">{option.description}</p>
                      </button>
                    )
                  })}
                </div>

                <SettingsItem label="Primary color">
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
                          setPrimaryColor(normalizeHexColor(nextValue, primaryColor))
                        }
                      }}
                      onBlur={() => {
                        const normalized = normalizeHexColor(primaryColorInput, primaryColor)
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
                          primaryColor === color ? 'border-foreground' : 'border-border',
                        )}
                        style={{ backgroundColor: color }}
                        aria-label={`Use ${color} as the primary color`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === 'model' ? (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold">Model features</h2>
                <SettingsItem
                  label="Reasoning mode"
                  description="Enable deeper reasoning controls for supported models."
                >
                  <Switch
                    checked={Boolean(settings?.reasoningEnabled)}
                    onCheckedChange={(value) => {
                      void updateSettings({ reasoningEnabled: value })
                    }}
                    disabled={!isOnline}
                  />
                </SettingsItem>
                <SettingsItem
                  label="Reasoning level"
                  description="Default level for models that support reasoning."
                >
                  <Select
                    value={
                      (settings?.reasoningLevel as 'low' | 'medium' | 'high' | undefined) ??
                      'medium'
                    }
                    onValueChange={(value) => {
                      void updateSettings({
                        reasoningLevel: value as 'low' | 'medium' | 'high',
                      })
                    }}
                    disabled={!isOnline}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </SettingsItem>
              </div>
            ) : null}

            {activeTab === 'data' ? (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold">Data controls</h2>
                <SettingsItem
                  label="Live query cache"
                  description="Convex subscriptions stay warm during navigation to reduce reload latency."
                >
                  <span className="text-sm font-medium">Enabled</span>
                </SettingsItem>
                <SettingsItem label="Connection" description="Live updates require network connectivity.">
                  <span className="text-sm">{isOnline ? 'Online' : 'Offline'}</span>
                </SettingsItem>
              </div>
            ) : null}

            {activeTab === 'account' ? (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold">Account</h2>
                <div className="flex items-center gap-6 border-b border-border/50 py-4">
                  <div className="group relative cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <Avatar className="size-20 ring-4 ring-background shadow-lg">
                      <AvatarImage src={image || user?.image || undefined} alt={displayNameValue} className="object-cover" />
                      <AvatarFallback className="bg-primary text-xl font-medium text-primary-foreground">
                        {displayNameValue ? getInitials(displayNameValue) : <User className="size-8" />}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={cn(
                        'absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity duration-200',
                        'group-hover:opacity-100',
                      )}
                    >
                      <Camera className="size-5 text-white" />
                    </div>
                    <div className="absolute -right-1 -bottom-1 rounded-full bg-primary p-1 text-primary-foreground shadow-md">
                      <Camera className="size-3" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium">Profile picture</h3>
                    <p className="mt-0.5 text-sm text-muted-foreground">Click to upload a new photo</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display name</Label>
                    <Input
                      id="displayName"
                      value={displayNameValue}
                      onChange={(event) => setDisplayName(event.target.value)}
                      placeholder="Enter your display name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={emailValue} disabled className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Input
                      id="bio"
                      value={bio}
                      onChange={(event) => setBio(event.target.value)}
                      placeholder="Tell us a little about yourself"
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === 'admin' && isAdminLike ? (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold">Admin</h2>
                <SettingsItem
                  label="Open admin dashboard"
                  description="Manage providers, models, collections, plans, and usage."
                >
                  <Button
                    onClick={() => {
                      onOpenChange(false)
                      void navigate({ to: '/admin' })
                    }}
                  >
                    Go to Admin
                  </Button>
                </SettingsItem>
              </div>
            ) : null}
          </div>

          {activeTab === 'account' ? (
            <div className="flex justify-end gap-3 border-t border-border bg-muted/30 px-8 py-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={() => void handleSaveAccount()} disabled={isSavingAccount || !isOnline}>
                {isSavingAccount ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Save changes
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </AdaptiveDialog>
  )
}
