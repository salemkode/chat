'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Camera, User, Loader2, X, Settings, Bell, Palette, Grid3X3, Database, Shield, Users, UserCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/components/theme-provider'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type SettingsTab = 'general' | 'notifications' | 'personalization' | 'apps' | 'data' | 'security' | 'parental' | 'account'

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
  const user = useQuery(api.users.viewer)
  const settings = useQuery(api.users.getSettings)
  const updateSettings = useMutation(api.users.updateSettings)
  const { theme, setTheme } = useTheme()

  const [activeTab, setActiveTab] = useState<SettingsTab>('general')
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [image, setImage] = useState<string | null>(null)
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
        const base64 = reader.result as string
        setImage(base64)
      }
      reader.readAsDataURL(file)
    },
    []
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
    { id: 'general' as SettingsTab, label: 'General', icon: Settings },
    { id: 'notifications' as SettingsTab, label: 'Notifications', icon: Bell },
    { id: 'personalization' as SettingsTab, label: 'Personalization', icon: Palette },
    { id: 'apps' as SettingsTab, label: 'Apps', icon: Grid3X3 },
    { id: 'data' as SettingsTab, label: 'Data controls', icon: Database },
    { id: 'security' as SettingsTab, label: 'Security', icon: Shield },
    { id: 'parental' as SettingsTab, label: 'Parental controls', icon: Users },
    { id: 'account' as SettingsTab, label: 'Account', icon: UserCircle },
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
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
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
                  
                  <SettingsItem label="Appearance">
                    <Select value={theme} onValueChange={(value) => setTheme(value as 'light' | 'dark' | 'system')}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="system">System</SelectItem>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                      </SelectContent>
                    </Select>
                  </SettingsItem>

                  <SettingsItem label="Accent color">
                    <div className="flex items-center gap-2">
                      <div className="size-3 rounded-full bg-blue-500" />
                      <span className="text-sm">Blue</span>
                    </div>
                  </SettingsItem>

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
                          'opacity-0 group-hover:opacity-100 transition-opacity duration-200'
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
                        <span className="text-muted-foreground">Member since</span>
                        <span>
                          {user?._creationTime
                            ? new Date(user._creationTime).toLocaleDateString()
                            : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Other tabs placeholder */}
              {activeTab !== 'general' && activeTab !== 'account' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold">
                    {tabs.find(t => t.id === activeTab)?.label}
                  </h2>
                  <p className="text-muted-foreground">
                    Settings for {tabs.find(t => t.id === activeTab)?.label.toLowerCase()} will be available soon.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            {(activeTab === 'account') && (
              <div className="flex justify-end gap-3 px-8 py-4 border-t border-border bg-muted/30">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
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
