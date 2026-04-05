'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
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
} from '@/lib/icons'
import type { AppIcon } from '@/lib/icons'
import { AdaptiveDialog } from '@/components/ui/adaptive-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { MemorySettingsPanel } from '@/components/settings/memory-settings-panel'
import { useTheme } from '@/components/theme-provider'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { useRoleContext, useSettings, useViewer } from '@/hooks/use-chat-data'
import type { SettingsTab } from '@/lib/settings-navigation'
import { normalizeHexColor, type ThemeMode } from '@/lib/theme'
import { readFileReaderResultAsString } from '@/lib/parsers'
import { cn } from '@/lib/utils'
import { ResponsiveSelectField } from '@/components/ui/responsive-select-field'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialTab?: SettingsTab
}

type SettingsItemProps = {
  label: string
  description?: string
  children: React.ReactNode
}

function SettingsItem({ label, description, children }: SettingsItemProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="min-w-0 flex-1 pr-0 sm:pr-6">
        <h3 className="text-sm font-medium text-foreground">{label}</h3>
        {description ? (
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="w-full shrink-0 sm:w-auto">{children}</div>
    </div>
  )
}

export function SettingsDialog({
  open,
  onOpenChange,
  initialTab = 'general',
}: SettingsDialogProps) {
  const user = useViewer()
  const { settings, updateSettings } = useSettings()
  const { isAdminLike } = useRoleContext()
  const { isOnline } = useOnlineStatus()
  const { theme, setTheme, primaryColor, setPrimaryColor } = useTheme()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab)
  const [language, setLanguage] = useState('auto')
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

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab)
    }
  }, [initialTab, open])

  const tabs = useMemo(
    () =>
      [
        { id: 'general', label: 'General', icon: Settings },
        { id: 'theme', label: 'Theme', icon: Palette },
        { id: 'model', label: 'Models & reasoning', icon: Brain },
        { id: 'memory', label: 'Memory', icon: Database },
        { id: 'data', label: 'Data controls', icon: Database },
        { id: 'account', label: 'Account', icon: UserCircle },
        ...(isAdminLike
          ? [{ id: 'admin' as const, label: 'Admin', icon: Wrench }]
          : []),
      ] satisfies Array<{ id: SettingsTab; label: string; icon: AppIcon }>,
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
    icon: AppIcon
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
  const activePanel = tabs.find((tab) => tab.id === activeTab)

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
      size="wide"
      showCloseButton={false}
      contentClassName={cn(
        'h-[min(680px,90dvh)] max-h-[min(680px,90dvh)] max-w-none gap-0 overflow-hidden p-0',
        'rounded-[1.75rem] border border-border bg-card text-card-foreground',
      )}
    >
      <div className="flex h-full min-h-0 flex-col overflow-hidden sm:flex-row">
        <aside className="flex w-full shrink-0 flex-col border-b border-border bg-muted/20 sm:w-56 sm:border-r sm:border-b-0">
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-5 sm:px-6">
            <p className="text-sm font-semibold leading-none">Settings</p>
            <Button variant="ghost" size="icon" className="size-8" onClick={() => onOpenChange(false)}>
              <X className="size-4" />
            </Button>
          </div>

          <nav className="flex flex-col gap-0.5 p-2 sm:flex-1 sm:overflow-y-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const active = activeTab === tab.id
              return (
                <Button
                  key={tab.id}
                  type="button"
                  variant={active ? 'secondary' : 'ghost'}
                  onClick={() => setActiveTab(tab.id)}
                  className="h-9 w-full justify-start gap-2 rounded-md px-2 font-normal"
                >
                  <Icon className="size-4 shrink-0 opacity-70" />
                  <span className="min-w-0 truncate">{tab.label}</span>
                </Button>
              )
            })}
          </nav>
        </aside>

        <section className="flex min-h-0 flex-1 flex-col bg-background">
          <div className="flex h-14 shrink-0 items-center border-b border-border px-5 sm:px-6">
            <h2 className="text-sm font-semibold leading-none">
              {activePanel?.label ?? 'Settings'}
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8 sm:py-7">
            {activeTab === 'general' ? (
              <div className="space-y-3">
                <SettingsItem label="Language">
                  <ResponsiveSelectField
                    value={language}
                    onValueChange={setLanguage}
                    title="Choose language"
                    className="w-[140px]"
                    options={[
                      { value: 'auto', label: 'Auto-detect' },
                      { value: 'en', label: 'English' },
                      { value: 'ar', label: 'Arabic' },
                    ]}
                  />
                </SettingsItem>
              </div>
            ) : null}

            {activeTab === 'theme' ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Appearance</p>
                  <div
                    className="grid gap-3 sm:grid-cols-3"
                    style={{ '--primary-color-preview': primaryColor } as React.CSSProperties}
                  >
                    {themeOptions.map((option) => {
                      const Icon = option.icon
                      const isSelected = theme === option.id
                      return (
                        <Button
                          key={option.id}
                          type="button"
                          variant="outline"
                          onClick={() => setTheme(option.id)}
                          className={cn(
                            'h-auto w-full min-w-0 flex-col items-stretch gap-2 whitespace-normal rounded-lg border p-3 text-left font-normal',
                            isSelected && 'border-primary ring-1 ring-primary',
                          )}
                        >
                          <div
                            className={cn(
                              'h-16 w-full shrink-0 rounded-md border',
                              option.previewClassName,
                            )}
                          />
                          <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
                            <Icon className="size-4 shrink-0" />
                            <span className="min-w-0 text-left">{option.label}</span>
                          </div>
                          <p className="min-w-0 text-left text-xs leading-snug text-muted-foreground">
                            {option.description}
                          </p>
                        </Button>
                      )
                    })}
                  </div>
                </div>

                <SettingsItem
                  label="Primary color"
                  description="Use a custom accent color for buttons, highlights, and selections."
                >
                  <div className="flex items-center gap-3">
                    {/* Native color inputs are required for the browser color picker. */}
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

                <div className="rounded-lg border border-border bg-card px-4 py-4">
                  <Label className="text-sm font-medium">Presets</Label>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {presetColors.map((color) => (
                      <Button
                        key={color}
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setPrimaryColor(color)}
                        className={cn(
                          'size-9 rounded-full border-2 p-0',
                          primaryColor === color ? 'border-foreground' : 'border-transparent',
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
              <div className="space-y-3">
                <SettingsItem
                  label="Reasoning"
                  description="Extra step-by-step reasoning when the model supports it. Uses more time per reply when on."
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
                  label="Reasoning depth"
                  description="Default when reasoning is enabled."
                >
                  <ResponsiveSelectField
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
                    title="Depth"
                    className="w-[140px]"
                    options={[
                      { value: 'low', label: 'Low' },
                      { value: 'medium', label: 'Medium' },
                      { value: 'high', label: 'High' },
                    ]}
                  />
                </SettingsItem>
              </div>
            ) : null}

            {activeTab === 'memory' ? <MemorySettingsPanel /> : null}

            {activeTab === 'data' ? (
              <div className="space-y-3">
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
                <div className="flex flex-col gap-5 rounded-lg border border-border bg-card p-5 sm:flex-row sm:items-center sm:gap-6">
                  <Button
                    type="button"
                    variant="ghost"
                    className="group relative h-auto shrink-0 justify-start p-0 hover:bg-transparent"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Avatar className="size-20 ring-4 ring-border">
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
                    <div className="absolute -right-1 -bottom-1 rounded-full bg-primary p-1 text-primary-foreground ring-2 ring-background">
                      <Camera className="size-3" />
                    </div>
                  </Button>
                  <div>
                    <h3 className="font-medium">Profile picture</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Click to upload a new photo.
                    </p>
                  </div>
                  {/* Native file inputs are required for the browser file picker. */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>

                <div className="space-y-4 rounded-lg border border-border bg-card p-5">
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
              <div className="space-y-3">
                <SettingsItem
                  label="Open admin dashboard"
                  description="Manage providers, models, collections, plans, and usage."
                >
                  <Button
                    onClick={() => {
                      onOpenChange(false)
                      void navigate('/admin')
                    }}
                  >
                    Go to Admin
                  </Button>
                </SettingsItem>
              </div>
            ) : null}
          </div>

          {activeTab === 'account' ? (
            <div className="flex justify-end gap-3 border-t border-border bg-muted/20 px-6 py-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={() => void handleSaveAccount()} disabled={isSavingAccount || !isOnline}>
                {isSavingAccount ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Save changes
              </Button>
            </div>
          ) : null}
        </section>
      </div>
    </AdaptiveDialog>
  )
}
