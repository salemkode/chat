'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AUTO_MODEL_ID, isAutoModelSelection } from '@chat/shared'
import { useClerk } from '@clerk/react-router'
import { useNavigate } from 'react-router'
import {
  Brain,
  Camera,
  Database,
  Key,
  Loader2,
  Monitor,
  Moon,
  Palette,
  LogOut,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MemorySettingsPanel } from '@/components/settings/memory-settings-panel'
import { KeyboardSettingsPanel } from '@/components/settings/keyboard-settings-panel'
import { useI18n } from '@/components/i18n-provider'
import { useTheme } from '@/components/theme-provider'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { useModels, useRoleContext, useSettings, useViewer } from '@/hooks/use-chat-data'
import { isSupportedLocale } from '@chat/shared/logic/i18n'
import type { SettingsTab } from '@/lib/settings-navigation'
import {
  getArabicFontFamily,
  getEnglishFontFamily,
  normalizeHexColor,
  parseArabicFont,
  parseEnglishFont,
  type ThemeMode,
} from '@/lib/theme'
import { readFileReaderResultAsString } from '@/lib/parsers'
import { cn } from '@/lib/utils'
import { useChatModel } from '@/components/chat-model-context'

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

type SettingsSelectOption = {
  value: string
  label: string
}

function SettingsSelect({
  value,
  options,
  onValueChange,
  placeholder,
  className,
  disabled,
}: {
  value?: string
  options: SettingsSelectOption[]
  onValueChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function SettingsDialog({
  open,
  onOpenChange,
  initialTab = 'general',
}: SettingsDialogProps) {
  const user = useViewer()
  const { settings, updateSettings } = useSettings()
  const { defaultModelId, setDefaultModelId, setSelectedModelId } = useChatModel()
  const { models, autoModelAvailable } = useModels()
  const { isAdminLike } = useRoleContext()
  const { isOnline } = useOnlineStatus()
  const {
    theme,
    setTheme,
    primaryColor,
    setPrimaryColor,
    englishFont,
    setEnglishFont,
    arabicFont,
    setArabicFont,
  } = useTheme()
  const { localePreference, setLocalePreference, t } = useI18n()
  const { signOut } = useClerk()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab)
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
        { id: 'general', label: t('settings.tab.general'), icon: Settings },
        { id: 'keyboard', label: t('settings.tab.keyboard'), icon: Key },
        { id: 'theme', label: t('settings.tab.theme'), icon: Palette },
        { id: 'model', label: t('settings.tab.model'), icon: Brain },
        { id: 'memory', label: t('settings.tab.memory'), icon: Database },
        { id: 'data', label: t('settings.tab.data'), icon: Database },
        { id: 'account', label: t('settings.tab.account'), icon: UserCircle },
        ...(isAdminLike
          ? [{ id: 'admin' as const, label: t('settings.tab.admin'), icon: Wrench }]
          : []),
      ] satisfies Array<{ id: SettingsTab; label: string; icon: AppIcon }>,
    [isAdminLike, t],
  )

  const themeOptions = useMemo(
    () =>
      [
        {
          id: 'light',
          label: t('settings.theme.light'),
          description: t('settings.theme.lightDescription'),
          icon: Sun,
          previewClassName:
            'bg-[linear-gradient(135deg,#ffffff_0%,#f3f4f6_60%,#dbeafe_100%)] border-zinc-200',
        },
        {
          id: 'dark',
          label: t('settings.theme.dark'),
          description: t('settings.theme.darkDescription'),
          icon: Moon,
          previewClassName:
            'bg-[linear-gradient(135deg,#0f172a_0%,#111827_55%,#1d4ed8_100%)] border-slate-700',
        },
        {
          id: 'system',
          label: t('settings.theme.system'),
          description: t('settings.theme.systemDescription'),
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
      }>,
    [t],
  )

  const presetColors = ['#8b5cf6', '#2563eb', '#0891b2', '#059669', '#ea580c', '#dc2626', '#db2777']

  const displayNameValue = displayName || user?.name || ''
  const emailValue = user?.email || ''
  const activePanel = tabs.find((tab) => tab.id === activeTab)
  const reasoningLevel = settings?.reasoningLevel
  const selectedReasoningLevel =
    reasoningLevel === 'low' || reasoningLevel === 'medium' || reasoningLevel === 'high'
      ? reasoningLevel
      : 'medium'

  const modelOptions = useMemo(() => {
    const sortedModels = [...models].sort((a, b) => a.displayName.localeCompare(b.displayName))
    const options = sortedModels.map((model) => ({
      value: model.modelId,
      label: model.displayName,
    }))

    if (autoModelAvailable) {
      return [{ value: AUTO_MODEL_ID, label: t('settings.auto') }, ...options]
    }

    return options
  }, [autoModelAvailable, models, t])

  const selectedModelValue =
    defaultModelId && modelOptions.some((option) => option.value === defaultModelId)
      ? defaultModelId
      : autoModelAvailable
        ? AUTO_MODEL_ID
        : modelOptions[0]?.value

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
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
  }, [])

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
      console.error(t('settings.accountSaveError'), error)
    } finally {
      setIsSavingAccount(false)
    }
  }, [bio, displayName, image, onOpenChange, t, updateSettings])

  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('common.settings')}
      description={t('settings.description')}
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
            <p className="text-sm font-semibold leading-none">{t('common.settings')}</p>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => onOpenChange(false)}
            >
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
              {activePanel?.label ?? t('common.settings')}
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8 sm:py-7">
            {activeTab === 'general' ? (
              <div className="space-y-3">
                <SettingsItem label={t('settings.language')}>
                  <SettingsSelect
                    value={localePreference}
                    onValueChange={(value) => {
                      if (value === 'auto') {
                        setLocalePreference('auto')
                        return
                      }

                      if (isSupportedLocale(value)) {
                        setLocalePreference(value)
                      }
                    }}
                    placeholder={t('settings.languagePlaceholder')}
                    className="w-[140px]"
                    options={[
                      { value: 'auto', label: t('settings.language.auto') },
                      { value: 'en', label: t('settings.language.en') },
                      { value: 'ar', label: t('settings.language.ar') },
                    ]}
                  />
                </SettingsItem>
              </div>
            ) : null}

            {activeTab === 'keyboard' ? <KeyboardSettingsPanel /> : null}

            {activeTab === 'theme' ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-sm font-medium">{t('settings.appearance')}</p>
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
                  label={t('settings.primaryColor')}
                  description={t('settings.primaryColorDescription')}
                >
                  <div className="flex items-center gap-3">
                    {/* Native color inputs are required for the browser color picker. */}
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(event) => setPrimaryColor(event.target.value)}
                      className="h-10 w-14 cursor-pointer rounded-md border border-input bg-background p-1"
                      aria-label={t('settings.primaryColorAria')}
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
                  <Label className="text-sm font-medium">{t('settings.presets')}</Label>
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
                        aria-label={t('settings.primaryColorPreset', { color })}
                      />
                    ))}
                  </div>
                </div>

                <SettingsItem
                  label={t('settings.englishFont')}
                  description={t('settings.englishFontDescription')}
                >
                  <SettingsSelect
                    value={englishFont}
                    onValueChange={(value) => {
                      setEnglishFont(parseEnglishFont(value))
                    }}
                    className="w-full sm:w-[220px]"
                    placeholder={t('settings.englishFontPlaceholder')}
                    options={[
                      { value: 'geist', label: t('settings.englishFont.geist') },
                      { value: 'inter', label: t('settings.englishFont.inter') },
                      { value: 'ibm-plex', label: t('settings.englishFont.ibmPlex') },
                    ]}
                  />
                </SettingsItem>

                <div className="rounded-lg border border-border bg-card px-4 py-4">
                  <Label className="text-sm font-medium">{t('settings.englishFontPreview')}</Label>
                  <p
                    lang="en"
                    className="mt-2 text-lg leading-relaxed"
                    style={{ fontFamily: getEnglishFontFamily(englishFont) }}
                  >
                    {t('settings.englishFontPreviewText')}
                  </p>
                </div>

                <SettingsItem
                  label={t('settings.arabicFont')}
                  description={t('settings.arabicFontDescription')}
                >
                  <SettingsSelect
                    value={arabicFont}
                    onValueChange={(value) => {
                      setArabicFont(parseArabicFont(value))
                    }}
                    className="w-full sm:w-[240px]"
                    placeholder={t('settings.arabicFontPlaceholder')}
                    options={[
                      {
                        value: 'ibm-plex-arabic',
                        label: t('settings.arabicFont.ibmPlexArabic'),
                      },
                      { value: 'noto-sans', label: t('settings.arabicFont.notoSans') },
                    ]}
                  />
                </SettingsItem>

                <div className="rounded-lg border border-border bg-card px-4 py-4">
                  <Label className="text-sm font-medium">{t('settings.arabicFontPreview')}</Label>
                  <p
                    dir="rtl"
                    lang="ar"
                    className="mt-2 text-lg leading-relaxed"
                    style={{ fontFamily: getArabicFontFamily(arabicFont) }}
                  >
                    {t('settings.arabicFontPreviewText')}
                  </p>
                </div>
              </div>
            ) : null}

            {activeTab === 'model' ? (
              <div className="space-y-3">
                <SettingsItem
                  label={t('settings.defaultModel')}
                  description={t('settings.defaultModelDescription')}
                >
                  <SettingsSelect
                    value={selectedModelValue}
                    onValueChange={(value) => {
                      const nextModel =
                        isAutoModelSelection(value) ||
                        modelOptions.some((option) => option.value === value)
                          ? value
                          : undefined

                      if (nextModel) {
                        setDefaultModelId(nextModel)
                        setSelectedModelId(nextModel)
                      }
                    }}
                    className="w-full sm:w-[220px]"
                    placeholder={t('settings.defaultModelPlaceholder')}
                    options={modelOptions}
                    disabled={!isOnline || modelOptions.length === 0}
                  />
                </SettingsItem>
                <SettingsItem
                  label={t('settings.reasoning')}
                  description={t('settings.reasoningDescription')}
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
                  label={t('settings.reasoningDepth')}
                  description={t('settings.reasoningDepthDescription')}
                >
                  <SettingsSelect
                    value={selectedReasoningLevel}
                    onValueChange={(value) => {
                      if (value === 'low' || value === 'medium' || value === 'high') {
                        void updateSettings({ reasoningLevel: value })
                      }
                    }}
                    disabled={!isOnline}
                    placeholder={t('settings.reasoningDepthPlaceholder')}
                    className="w-[140px]"
                    options={[
                      { value: 'low', label: t('settings.reasoningLevel.low') },
                      { value: 'medium', label: t('settings.reasoningLevel.medium') },
                      { value: 'high', label: t('settings.reasoningLevel.high') },
                    ]}
                  />
                </SettingsItem>
              </div>
            ) : null}

            {activeTab === 'memory' ? <MemorySettingsPanel /> : null}

            {activeTab === 'data' ? (
              <div className="space-y-3">
                <SettingsItem
                  label={t('settings.liveQueryCache')}
                  description={t('settings.liveQueryCacheDescription')}
                >
                  <span className="text-sm font-medium">{t('common.enabled')}</span>
                </SettingsItem>
                <SettingsItem
                  label={t('settings.connection')}
                  description={t('settings.connectionDescription')}
                >
                  <span className="text-sm">{isOnline ? t('common.online') : t('common.offline')}</span>
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
                      <AvatarImage
                        src={image || user?.image || undefined}
                        alt={displayNameValue}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-primary text-xl font-medium text-primary-foreground">
                        {displayNameValue ? (
                          getInitials(displayNameValue)
                        ) : (
                          <User className="size-8" />
                        )}
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
                    <h3 className="font-medium">{t('settings.profilePicture')}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t('settings.profilePictureDescription')}
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
                    <Label htmlFor="displayName">{t('settings.displayName')}</Label>
                    <Input
                      id="displayName"
                      value={displayNameValue}
                      onChange={(event) => setDisplayName(event.target.value)}
                      placeholder={t('settings.displayNamePlaceholder')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">{t('settings.email')}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={emailValue}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio">{t('settings.bio')}</Label>
                    <Input
                      id="bio"
                      value={bio}
                      onChange={(event) => setBio(event.target.value)}
                      placeholder={t('settings.bioPlaceholder')}
                    />
                  </div>
                </div>

                <SettingsItem
                  label={t('settings.session')}
                  description={t('settings.sessionDescription')}
                >
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      void signOut()
                    }}
                  >
                    <LogOut className="size-4" />
                    {t('settings.logout')}
                  </Button>
                </SettingsItem>
              </div>
            ) : null}

            {activeTab === 'admin' && isAdminLike ? (
              <div className="space-y-3">
                <SettingsItem
                  label={t('settings.openAdminDashboard')}
                  description={t('settings.openAdminDashboardDescription')}
                >
                  <Button
                    onClick={() => {
                      onOpenChange(false)
                      void navigate('/admin')
                    }}
                  >
                    {t('settings.goToAdmin')}
                  </Button>
                </SettingsItem>
              </div>
            ) : null}
          </div>

          {activeTab === 'account' ? (
            <div className="flex justify-end gap-3 border-t border-border bg-muted/20 px-6 py-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                onClick={() => void handleSaveAccount()}
                disabled={isSavingAccount || !isOnline}
              >
                {isSavingAccount ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                {t('common.saveChanges')}
              </Button>
            </div>
          ) : null}
        </section>
      </div>
    </AdaptiveDialog>
  )
}
