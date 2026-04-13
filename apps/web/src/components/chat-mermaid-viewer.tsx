import { fnv1a32 } from '@/lib/fnv1a32'
import { Code, MinusIcon, Plus, Target as TargetIcon } from '@/lib/icons'
import type { ResolvedTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  TransformComponent,
  TransformWrapper,
  type ReactZoomPanPinchContentRef,
} from 'react-zoom-pan-pinch'

type ViewMode = 'diagram' | 'source'

type ZoomApi = Pick<
  ReactZoomPanPinchContentRef,
  'zoomIn' | 'zoomOut' | 'resetTransform' | 'zoomToElement'
>

function MermaidViewToggle({
  mode,
  onModeChange,
}: {
  mode: ViewMode
  onModeChange: (m: ViewMode) => void
}) {
  return (
    <div
      className="flex items-center gap-1 border-b border-border/50 bg-muted/20 px-2 py-1.5"
      role="toolbar"
      aria-label="Mermaid view"
    >
      <div className="flex rounded-md border border-border/60 bg-background/80 p-0.5">
        <button
          type="button"
          className={cn(
            'rounded px-2 py-0.5 text-[11px] font-medium transition-colors',
            mode === 'diagram'
              ? 'bg-muted text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
          onClick={() => onModeChange('diagram')}
        >
          Diagram
        </button>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium transition-colors',
            mode === 'source'
              ? 'bg-muted text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
          onClick={() => onModeChange('source')}
        >
          <Code className="size-3" aria-hidden />
          Source
        </button>
      </div>
    </div>
  )
}

function MermaidFloatingControls({ zoom, onFit }: { zoom: ZoomApi; onFit: () => void }) {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 z-10">
        <button
          type="button"
          className="pointer-events-auto absolute top-3 left-3 inline-flex size-9 items-center justify-center rounded-lg border border-border/70 bg-background/95 text-muted-foreground shadow-md backdrop-blur-sm transition-colors hover:bg-muted hover:text-foreground"
          onClick={onFit}
          title="Fit diagram to view"
          aria-label="Fit diagram to view"
        >
          <TargetIcon className="size-4" />
        </button>

        <div
          className="pointer-events-auto absolute bottom-3 left-3 flex flex-col overflow-hidden rounded-xl border border-border/70 bg-background/95 shadow-md backdrop-blur-sm"
          role="group"
          aria-label="Zoom"
        >
          <button
            type="button"
            className="inline-flex size-9 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={() => zoom.zoomIn(0.22, 180)}
            title="Zoom in"
            aria-label="Zoom in"
          >
            <Plus className="size-4" />
          </button>
          <div className="h-px bg-border/60" />
          <button
            type="button"
            className="inline-flex size-9 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={() => zoom.zoomOut(0.22, 180)}
            title="Zoom out"
            aria-label="Zoom out"
          >
            <MinusIcon className="size-4" />
          </button>
        </div>
      </div>
    </>
  )
}

export function ChatMermaidViewer({
  chart,
  resolvedTheme,
}: {
  chart: string
  resolvedTheme: ResolvedTheme
}) {
  const instanceId = useId().replace(/:/g, '')
  const [mode, setMode] = useState<ViewMode>('diagram')
  const [error, setError] = useState(false)
  const [svgPayload, setSvgPayload] = useState<{
    svg: string
    bindFunctions?: (element: HTMLElement) => void
  } | null>(null)
  const diagramHostRef = useRef<HTMLDivElement>(null)
  const zoomRef = useRef<ReactZoomPanPinchContentRef | null>(null)

  const renderKey = useMemo(
    () => `${instanceId}-${fnv1a32(chart.trim()).toString(36)}-${resolvedTheme}`,
    [chart, instanceId, resolvedTheme],
  )

  const fitDiagramToView = useMemo(() => {
    return () => {
      const host = diagramHostRef.current
      const api = zoomRef.current
      if (!host || !api) {
        return
      }
      api.resetTransform(0)
      requestAnimationFrame(() => {
        api.zoomToElement(host, undefined, 0, 'easeOut')
      })
    }
  }, [])

  useEffect(() => {
    setError(false)
    setSvgPayload(null)

    const definition = chart.trim()
    if (definition.length === 0) {
      return
    }

    let cancelled = false

    void (async () => {
      try {
        const mermaid = (await import('mermaid')).default
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: resolvedTheme === 'dark' ? 'dark' : 'default',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          flowchart: {
            htmlLabels: true,
            curve: 'basis',
            padding: 12,
            nodeSpacing: 50,
            rankSpacing: 50,
          },
          sequence: {
            useMaxWidth: true,
          },
        })
        const id = `mermaid-${renderKey}`
        const { svg, bindFunctions } = await mermaid.render(id, definition)
        if (cancelled) {
          return
        }
        setSvgPayload({ svg, bindFunctions })
      } catch {
        if (!cancelled) {
          setError(true)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [chart, renderKey, resolvedTheme])

  useLayoutEffect(() => {
    const host = diagramHostRef.current
    if (!host || !svgPayload) {
      return
    }
    host.innerHTML = svgPayload.svg
    svgPayload.bindFunctions?.(host)
  }, [svgPayload])

  useLayoutEffect(() => {
    if (mode !== 'diagram' || !svgPayload || error) {
      return
    }
    const host = diagramHostRef.current
    const api = zoomRef.current
    if (!host || !api) {
      return
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        api.resetTransform(0)
        requestAnimationFrame(() => {
          api.zoomToElement(host, undefined, 0, 'easeOut')
        })
      })
    })
  }, [error, mode, renderKey, svgPayload])

  if (error) {
    return (
      <div className="px-4 pt-10 pb-4 text-left text-sm text-destructive">
        Could not render Mermaid diagram.
      </div>
    )
  }

  const definition = chart.trim()
  if (definition.length === 0) {
    return null
  }

  if (mode === 'source') {
    return (
      <div className="flex min-h-0 flex-col">
        <MermaidViewToggle mode={mode} onModeChange={setMode} />
        <div className="max-h-[min(70vh,520px)] overflow-auto px-4 py-3">
          <pre className="m-0 whitespace-pre-wrap break-words font-mono text-[13px] leading-relaxed text-foreground/90">
            {chart}
          </pre>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-col">
      <TransformWrapper
        ref={zoomRef}
        initialScale={1}
        minScale={0.04}
        maxScale={10}
        centerOnInit={false}
        limitToBounds={false}
        wheel={{ disabled: true }}
        panning={{ velocityDisabled: false }}
        pinch={{ step: 0.12 }}
        doubleClick={{ disabled: true }}
      >
        {(zoom) => (
          <div className="flex min-h-0 flex-col">
            <MermaidViewToggle mode={mode} onModeChange={setMode} />
            <div className="relative h-[min(70vh,560px)] min-h-[220px] w-full overflow-hidden bg-muted/30">
              {!svgPayload && !error ? (
                <div className="flex h-full items-center justify-center px-4 text-sm text-muted-foreground">
                  Rendering diagram…
                </div>
              ) : (
                <>
                  <MermaidFloatingControls zoom={zoom} onFit={fitDiagramToView} />
                  <TransformComponent
                    wrapperClass="!h-full !w-full"
                    contentClass="!flex !min-h-full !min-w-full !items-center !justify-center !p-10"
                  >
                    <div
                      ref={diagramHostRef}
                      className="inline-block select-none [&_svg]:block [&_svg]:max-w-none [&_svg]:overflow-visible"
                    />
                  </TransformComponent>
                </>
              )}
            </div>
          </div>
        )}
      </TransformWrapper>
    </div>
  )
}
