'use client'

import * as React from 'react'
import { AlertCircle, Key, RotateCcw, Trash2 } from '@/lib/icons'
import {
  formatHotkeyBinding,
  getConflictingHotkeyAction,
  getHotkeyDefinition,
  HOTKEY_DEFINITIONS,
  createHotkeyBindingFromEvent,
  type HotkeyActionId,
} from '@/lib/hotkeys'
import { useHotkeys } from '@/components/hotkeys-provider'
import { Button } from '@/components/ui/button'

function KeyboardShortcutField({
  actionId,
}: {
  actionId: HotkeyActionId
}) {
  const definition = getHotkeyDefinition(actionId)
  const { bindings, resetBinding, updateBinding } = useHotkeys()
  const [isRecording, setIsRecording] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const binding = bindings[actionId]

  const startRecording = () => {
    setError(null)
    setIsRecording(true)
  }

  const stopRecording = () => {
    setIsRecording(false)
  }

  const handleRecording = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    event.preventDefault()

    if (event.key === 'Escape') {
      stopRecording()
      return
    }

    if (event.key === 'Backspace' || event.key === 'Delete') {
      updateBinding(actionId, null)
      setError(null)
      stopRecording()
      return
    }

    const nextBinding = createHotkeyBindingFromEvent(event.nativeEvent)
    if (!nextBinding) {
      return
    }

    const conflictActionId = getConflictingHotkeyAction(
      actionId,
      nextBinding,
      bindings,
    )

    if (conflictActionId) {
      const conflictDefinition = getHotkeyDefinition(conflictActionId)
      setError(`Already used by ${conflictDefinition.label}.`)
      return
    }

    updateBinding(actionId, nextBinding)
    setError(null)
    stopRecording()
  }

  return (
    <div className="rounded-xl border border-border bg-card/60 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="rounded-lg border border-border/80 bg-background p-2 text-muted-foreground">
              <Key className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{definition.label}</p>
              <p className="text-xs leading-5 text-muted-foreground">
                {definition.description}
              </p>
            </div>
          </div>
          {error ? (
            <div className="mt-3 flex items-center gap-2 text-xs text-destructive">
              <AlertCircle className="size-3.5" />
              <span>{error}</span>
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2 self-start">
          <button
            type="button"
            onClick={startRecording}
            onBlur={() => {
              if (isRecording) {
                stopRecording()
              }
            }}
            onKeyDown={handleRecording}
            className="inline-flex h-10 min-w-36 items-center justify-center rounded-lg border border-border bg-background px-3 font-mono text-sm text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {isRecording ? 'Press keys…' : formatHotkeyBinding(binding)}
          </button>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => {
              resetBinding(actionId)
              setError(null)
            }}
            aria-label={`Reset ${definition.label} shortcut`}
          >
            <RotateCcw className="size-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              updateBinding(actionId, null)
              setError(null)
            }}
            aria-label={`Clear ${definition.label} shortcut`}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export function KeyboardSettingsPanel() {
  const { resetAllBindings } = useHotkeys()

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-card/60 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Custom shortcuts</p>
          <p className="text-xs leading-5 text-muted-foreground">
            Click any binding, press a new combo, or use Delete to clear it.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={resetAllBindings}>
          Reset all
        </Button>
      </div>

      <div className="space-y-3">
        {HOTKEY_DEFINITIONS.map((definition) => (
          <KeyboardShortcutField key={definition.id} actionId={definition.id} />
        ))}
      </div>
    </div>
  )
}
