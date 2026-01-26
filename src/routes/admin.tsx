import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useConvexAuth } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Trash2, Plus, ArrowLeft, Loader2, Check, X } from 'lucide-react'
import { Id } from '../../convex/_generated/dataModel'

export const Route = createFileRoute('/admin')({
  component: AdminPage,
})

function AdminPage() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth()
  const navigate = useNavigate()
  const isAdmin = useQuery(api.admin.isAdmin)
  const models = useQuery(api.admin.listAllModels)

  const addModel = useMutation(api.admin.addModel)
  const updateModel = useMutation(api.admin.updateModel)
  const deleteModel = useMutation(api.admin.deleteModel)
  const seedModels = useMutation(api.admin.seedModels)

  const [newModel, setNewModel] = useState({
    modelId: '',
    displayName: '',
    isFree: false,
  })
  const [showAddForm, setShowAddForm] = useState(false)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      void navigate({ to: '/login' })
    }
  }, [authLoading, isAuthenticated, navigate])

  // Loading state
  if (authLoading || isAdmin === undefined) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  // Not admin
  if (!isAdmin) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
        <p className="text-muted-foreground">
          You do not have admin privileges.
        </p>
        <Button
          onClick={() => void navigate({ to: '/chat' })}
          variant="outline"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Chat
        </Button>
      </div>
    )
  }

  const handleAddModel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newModel.modelId || !newModel.displayName) return

    await addModel({
      modelId: newModel.modelId,
      displayName: newModel.displayName,
      isEnabled: true,
      isFree: newModel.isFree,
      sortOrder: models?.length || 0,
    })

    setNewModel({ modelId: '', displayName: '', isFree: false })
    setShowAddForm(false)
  }

  const handleToggleEnabled = async (
    id: Id<'models'>,
    currentState: boolean,
  ) => {
    void updateModel({ id, isEnabled: !currentState })
  }

  const handleDelete = async (id: Id<'models'>) => {
    if (confirm('Are you sure you want to delete this model?')) {
      void deleteModel({ id })
    }
  }

  const handleSeed = async () => {
    const result = await seedModels()
    alert(result)
  }

  return (
    <div className="min-h-screen w-full font-sans">
      {/* Header */}
      <header className="border-b backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void navigate({ to: '/chat' })}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Admin Dashboard</h1>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void handleSeed()
              }}
            >
              Seed Default Models
            </Button>
            <Button size="sm" onClick={() => setShowAddForm(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Model
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Add Model Form */}
        {showAddForm && (
          <div className="mb-8 p-6 border rounded-xl">
            <h2 className="text-lg font-semibold mb-4">Add New Model</h2>
            <form
              onSubmit={(e) => {
                void handleAddModel(e)
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="modelId">Model ID (OpenRouter format)</Label>
                  <Input
                    id="modelId"
                    placeholder="e.g., openai/gpt-4o"
                    value={newModel.modelId}
                    onChange={(e) =>
                      setNewModel({ ...newModel, modelId: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    placeholder="e.g., GPT-4o"
                    value={newModel.displayName}
                    onChange={(e) =>
                      setNewModel({ ...newModel, displayName: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isFree"
                  checked={newModel.isFree}
                  onChange={(e) =>
                    setNewModel({ ...newModel, isFree: e.target.checked })
                  }
                  className="rounded"
                />
                <Label htmlFor="isFree">Free model</Label>
              </div>
              <div className="flex gap-2">
                <Button type="submit">Add Model</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Models List */}
        <div className="border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="font-semibold">Available Models</h2>
          </div>
          <ScrollArea className="max-h-[60vh]">
            {models?.length === 0 && (
              <div className="px-6 py-8 text-center text-muted-foreground">
                No models configured. Click "Seed Default Models" to add some.
              </div>
            )}
            {models
              ?.sort((a, b) => a.sortOrder - b.sortOrder)
              .map((model) => (
                <div
                  key={model._id}
                  className="px-6 py-4 border-b last:border-b-0 flex items-center justify-between hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{model.displayName}</span>
                      {model.isFree && (
                        <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded-full">
                          Free
                        </span>
                      )}
                      {!model.isEnabled && (
                        <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded-full">
                          Disabled
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground font-mono">
                      {model.modelId}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        void handleToggleEnabled(model._id, model.isEnabled)
                      }}
                      className={
                        model.isEnabled
                          ? 'text-foreground'
                          : 'text-muted-foreground'
                      }
                    >
                      {model.isEnabled ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                      {model.isEnabled ? 'Enabled' : 'Disabled'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        void handleDelete(model._id)
                      }}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
          </ScrollArea>
        </div>

        {/* Instructions */}
        <div className="mt-8 p-4 border rounded-xl text-sm text-muted-foreground">
          <p className="font-medium mb-2">💡 How to set up:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>
              Run <code className="px-1 rounded">makeAdmin</code> mutation from
              Convex dashboard with your user ID
            </li>
            <li>Click "Seed Default Models" to add initial models</li>
            <li>Enable/disable models as needed</li>
          </ol>
        </div>
      </main>
    </div>
  )
}
