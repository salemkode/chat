import { SignIn } from '@clerk/clerk-react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useConvexAuth, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowLeft, Plus, Trash2, Edit2, Settings } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Doc } from 'convex/_generated/dataModel'

export const Route = createFileRoute('/admin')({
  component: AdminPage,
})

const PROVIDER_TYPES = [
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'google', label: 'Google' },
  { value: 'azure', label: 'Azure' },
  { value: 'groq', label: 'Groq' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'xai', label: 'xAI' },
  { value: 'cerebras', label: 'Cerebras' },
] as const

type ProviderType = typeof PROVIDER_TYPES[number]['value']

interface ProviderFormData {
  name: string
  providerType: ProviderType
  apiKey: string
  baseURL: string
  isEnabled: boolean
  sortOrder: number
}

interface ModelFormData {
  modelId: string
  displayName: string
  isEnabled: boolean
  isFree: boolean
  sortOrder: number
  providerId: string
}

function AdminPage() {
  const navigate = useNavigate()
  const { isAuthenticated, isLoading } = useConvexAuth()
  const ensureCurrentUser = useMutation(api.users.ensureCurrentUser)
  const [isUserReady, setIsUserReady] = useState(false)
  const isAdmin = useQuery(
    api.admin.isAdmin,
    isAuthenticated && isUserReady ? {} : 'skip',
  )

  // Queries
  const providers = useQuery(
    api.admin.listAllProviders,
    isAuthenticated && isUserReady && isAdmin ? {} : 'skip',
  )
  const models = useQuery(
    api.admin.listAllModels,
    isAuthenticated && isUserReady && isAdmin ? {} : 'skip',
  )

  // Mutations
  const addProvider = useMutation(api.admin.addProvider)
  const updateProvider = useMutation(api.admin.updateProvider)
  const deleteProvider = useMutation(api.admin.deleteProvider)
  const addModel = useMutation(api.admin.addModel)
  const updateModel = useMutation(api.admin.updateModel)
  const deleteModel = useMutation(api.admin.deleteModel)

  // Form states
  const [providerDialogOpen, setProviderDialogOpen] = useState(false)
  const [modelDialogOpen, setModelDialogOpen] = useState(false)
  const [editingProvider, setEditingProvider] = useState<Doc<'providers'> | null>(null)
  const [editingModel, setEditingModel] = useState<Doc<'models'> | null>(null)

  const [providerForm, setProviderForm] = useState<ProviderFormData>({
    name: '',
    providerType: 'openrouter',
    apiKey: '',
    baseURL: '',
    isEnabled: true,
    sortOrder: 0,
  })

  const [modelForm, setModelForm] = useState<ModelFormData>({
    modelId: '',
    displayName: '',
    isEnabled: true,
    isFree: false,
    sortOrder: 0,
    providerId: '',
  })

  // Unique IDs for form elements
  const ids = {
    providerName: useId(),
    providerType: useId(),
    providerApiKey: useId(),
    providerBaseUrl: useId(),
    providerSortOrder: useId(),
    providerIsEnabled: useId(),
    modelId: useId(),
    modelDisplayName: useId(),
    modelProvider: useId(),
    modelSortOrder: useId(),
    modelEnabled: useId(),
    modelFree: useId(),
  }

  useEffect(() => {
    if (!isAuthenticated) {
      setIsUserReady(false)
      return
    }

    let isCancelled = false

    void ensureCurrentUser({})
      .then(() => {
        if (!isCancelled) {
          setIsUserReady(true)
        }
      })
      .catch((error) => {
        console.error('Failed to initialize current user:', error)
      })

    return () => {
      isCancelled = true
    }
  }, [ensureCurrentUser, isAuthenticated])

  const handleAddProvider = () => {
    void addProvider(providerForm).then(() => {
      setProviderDialogOpen(false)
      resetProviderForm()
    })
  }

  const handleUpdateProvider = () => {
    if (!editingProvider) return
    void updateProvider({
      id: editingProvider._id,
      ...providerForm,
    }).then(() => {
      setProviderDialogOpen(false)
      setEditingProvider(null)
      resetProviderForm()
    })
  }

  const handleDeleteProvider = (id: Doc<'providers'>['_id']) => {
    if (!confirm('Are you sure you want to delete this provider?')) return
    void deleteProvider({ id })
  }

  const handleAddModel = () => {
    void addModel({
      ...modelForm,
      providerId: modelForm.providerId as Doc<'providers'>['_id'],
    }).then(() => {
      setModelDialogOpen(false)
      resetModelForm()
    })
  }

  const handleUpdateModel = () => {
    if (!editingModel) return
    void updateModel({
      id: editingModel._id,
      ...modelForm,
    }).then(() => {
      setModelDialogOpen(false)
      setEditingModel(null)
      resetModelForm()
    })
  }

  const handleDeleteModel = (id: Doc<'models'>['_id']) => {
    if (!confirm('Are you sure you want to delete this model?')) return
    void deleteModel({ id })
  }

  const resetProviderForm = () => {
    setProviderForm({
      name: '',
      providerType: 'openrouter',
      apiKey: '',
      baseURL: '',
      isEnabled: true,
      sortOrder: 0,
    })
  }

  const resetModelForm = () => {
    setModelForm({
      modelId: '',
      displayName: '',
      isEnabled: true,
      isFree: false,
      sortOrder: 0,
      providerId: '',
    })
  }

  const openProviderDialog = (provider?: Doc<'providers'>) => {
    if (provider) {
      setEditingProvider(provider)
      setProviderForm({
        name: provider.name,
        providerType: provider.providerType,
        apiKey: provider.apiKey,
        baseURL: provider.baseURL || '',
        isEnabled: provider.isEnabled,
        sortOrder: provider.sortOrder,
      })
    } else {
      setEditingProvider(null)
      resetProviderForm()
    }
    setProviderDialogOpen(true)
  }

  const openModelDialog = (model?: Doc<'models'>) => {
    if (model) {
      setEditingModel(model)
      setModelForm({
        modelId: model.modelId,
        displayName: model.displayName,
        isEnabled: model.isEnabled,
        isFree: model.isFree,
        sortOrder: model.sortOrder,
        providerId: model.providerId,
      })
    } else {
      setEditingModel(null)
      resetModelForm()
    }
    setModelDialogOpen(true)
  }

  const getProviderName = (providerId: string): string => {
    const provider = providers?.find((p) => p._id === providerId)
    return provider?.name || 'Unknown Provider'
  }

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <SignIn />
      </div>
    )
  }

  if (!isUserReady) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans p-8">
      <header className="border-b border-border backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void navigate({ to: '/chat' })}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold text-foreground">
              Admin Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => window.location.reload()}>
              <Loader2 className="h-4 w-4 animate-spin" />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Admin Status */}
        <div className="bg-card text-card-foreground p-6 rounded-lg border-border mb-6">
          <h3 className="text-lg font-semibold mb-4">Admin Access</h3>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              <strong>Status:</strong>{' '}
              {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
            </p>
            <p className="text-smisAuthenticated ? ' text-muted-foreground">
              <strong>Admin Access:</strong> {isAdmin ? 'Yes' : 'No'}
            </p>
            {!isAdmin && (
              <p className="text-destructive text-sm mt-4">
                You must be an admin to access admin features
              </p>
            )}
          </div>
        </div>

        {/* Provider Management */}
        <div className="bg-card text-card-foreground p-6 rounded-lg border-border mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Providers
            </h3>
            <Dialog open={providerDialogOpen} onOpenChange={setProviderDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => openProviderDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Provider
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingProvider ? 'Edit Provider' : 'Add New Provider'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingProvider
                      ? 'Update the provider details below'
                      : 'Enter the provider details to add a new provider'}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor={ids.providerName}>Name</Label>
                    <Input
                      id={ids.providerName}
                      value={providerForm.name}
                      onChange={(e) =>
                        setProviderForm({ ...providerForm, name: e.target.value })
                      }
                      placeholder="My Provider"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={ids.providerType}>Provider Type</Label>
                    <Select
                      value={providerForm.providerType}
                      onValueChange={(value: ProviderType) =>
                        setProviderForm({ ...providerForm, providerType: value })
                      }
                    >
                      <SelectTrigger id={ids.providerType}>
                        <SelectValue placeholder="Select provider type" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROVIDER_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={ids.providerApiKey}>API Key</Label>
                    <Input
                      id={ids.providerApiKey}
                      type="password"
                      value={providerForm.apiKey}
                      onChange={(e) =>
                        setProviderForm({ ...providerForm, apiKey: e.target.value })
                      }
                      placeholder="sk-..."
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={ids.providerBaseUrl}>Base URL (optional)</Label>
                    <Input
                      id={ids.providerBaseUrl}
                      value={providerForm.baseURL}
                      onChange={(e) =>
                        setProviderForm({ ...providerForm, baseURL: e.target.value })
                      }
                      placeholder="https://api.example.com"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={ids.providerSortOrder}>Sort Order</Label>
                    <Input
                      id={ids.providerSortOrder}
                      type="number"
                      value={providerForm.sortOrder}
                      onChange={(e) =>
                        setProviderForm({
                          ...providerForm,
                          sortOrder: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={ids.providerIsEnabled}
                      checked={providerForm.isEnabled}
                      onCheckedChange={(checked) =>
                        setProviderForm({
                          ...providerForm,
                          isEnabled: checked as boolean,
                        })
                      }
                    />
                    <Label htmlFor={ids.providerIsEnabled}>Enabled</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setProviderDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={editingProvider ? handleUpdateProvider : handleAddProvider}
                  >
                    {editingProvider ? 'Update' : 'Add'} Provider
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {providers === undefined ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : providers.length === 0 ? (
            <p className="text-muted-foreground text-sm">No providers configured</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-4">Name</th>
                    <th className="text-left py-2 px-4">Type</th>
                    <th className="text-left py-2 px-4">Status</th>
                    <th className="text-right py-2 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {providers.map((provider) => (
                    <tr key={provider._id} className="border-b border-border/50">
                      <td className="py-2 px-4">{provider.name}</td>
                      <td className="py-2 px-4 capitalize">
                        {provider.providerType}
                      </td>
                      <td className="py-2 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                            provider.isEnabled
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}
                        >
                          {provider.isEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openProviderDialog(provider)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteProvider(provider._id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Model Management */}
        <div className="bg-card text-card-foreground p-6 rounded-lg border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Models
            </h3>
            <Dialog open={modelDialogOpen} onOpenChange={setModelDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => openModelDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Model
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingModel ? 'Edit Model' : 'Add New Model'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingModel
                      ? 'Update the model details below'
                      : 'Enter the model details to add a new model'}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor={ids.modelId}>Model ID</Label>
                    <Input
                      id={ids.modelId}
                      value={modelForm.modelId}
                      onChange={(e) =>
                        setModelForm({ ...modelForm, modelId: e.target.value })
                      }
                      placeholder="openai/gpt-4o"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={ids.modelDisplayName}>Display Name</Label>
                    <Input
                      id={ids.modelDisplayName}
                      value={modelForm.displayName}
                      onChange={(e) =>
                        setModelForm({ ...modelForm, displayName: e.target.value })
                      }
                      placeholder="GPT-4o"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={ids.modelProvider}>Provider</Label>
                    <Select
                      value={modelForm.providerId}
                      onValueChange={(value) =>
                        setModelForm({ ...modelForm, providerId: value })
                      }
                    >
                      <SelectTrigger id={ids.modelProvider}>
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        {providers?.map((provider) => (
                          <SelectItem key={provider._id} value={provider._id}>
                            {provider.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={ids.modelSortOrder}>Sort Order</Label>
                    <Input
                      id={ids.modelSortOrder}
                      type="number"
                      value={modelForm.sortOrder}
                      onChange={(e) =>
                        setModelForm({
                          ...modelForm,
                          sortOrder: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={ids.modelEnabled}
                        checked={modelForm.isEnabled}
                        onCheckedChange={(checked) =>
                          setModelForm({
                            ...modelForm,
                            isEnabled: checked as boolean,
                          })
                        }
                      />
                      <Label htmlFor={ids.modelEnabled}>Enabled</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={ids.modelFree}
                        checked={modelForm.isFree}
                        onCheckedChange={(checked) =>
                          setModelForm({
                            ...modelForm,
                            isFree: checked as boolean,
                          })
                        }
                      />
                      <Label htmlFor={ids.modelFree}>Free</Label>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setModelDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={editingModel ? handleUpdateModel : handleAddModel}
                  >
                    {editingModel ? 'Update' : 'Add'} Model
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {models === undefined ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : models.length === 0 ? (
            <p className="text-muted-foreground text-sm">No models configured</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-4">Model ID</th>
                    <th className="text-left py-2 px-4">Display Name</th>
                    <th className="text-left py-2 px-4">Provider</th>
                    <th className="text-left py-2 px-4">Status</th>
                    <th className="text-left py-2 px-4">Cost</th>
                    <th className="text-right py-2 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {models.map((model) => (
                    <tr key={model._id} className="border-b border-border/50">
                      <td className="py-2 px-4 font-mono text-xs">
                        {model.modelId}
                      </td>
                      <td className="py-2 px-4">{model.displayName}</td>
                      <td className="py-2 px-4">
                        {getProviderName(model.providerId)}
                      </td>
                      <td className="py-2 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                            model.isEnabled
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}
                        >
                          {model.isEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                      <td className="py-2 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                                model.isFree
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          }`}
                        >
                          {model.isFree ? 'Free' : 'Paid'}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                              onClick={() => openModelDialog(model)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteModel(model._id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

