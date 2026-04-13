import { useEffect, useId, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

const ANIMATION_CONFIG = {
  particleCount: 72,
  trailSpan: 0.42,
  durationMs: 5200,
  rotationDurationMs: 28000,
  pulseDurationMs: 4600,
  strokeWidth: 5.2,
  orbitRadius: 7,
  detailAmplitude: 2.7,
  petalCount: 7,
  curveScale: 3.9,
  rotate: true,
} as const

type OriginalThinkingAnimationProps = {
  className?: string
  reducedMotion?: boolean
  variant?: 'default' | 'minimal'
}

type CurvePoint = {
  x: number
  y: number
}

export function OriginalThinkingAnimation({
  className,
  reducedMotion,
  variant = 'default',
}: OriginalThinkingAnimationProps) {
  const groupRef = useRef<SVGGElement | null>(null)
  const pathRef = useRef<SVGPathElement | null>(null)
  const particleRefs = useRef<Array<SVGCircleElement | null>>([])
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(Boolean(reducedMotion))
  const gradientId = useId().replace(/:/g, '')
  const glowId = useId().replace(/:/g, '')
  const resolvedReducedMotion = reducedMotion ?? prefersReducedMotion
  const isMinimal = variant === 'minimal'

  useEffect(() => {
    if (typeof reducedMotion === 'boolean' || typeof window === 'undefined') {
      return
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updatePreference = () => {
      setPrefersReducedMotion(mediaQuery.matches)
    }

    updatePreference()
    mediaQuery.addEventListener('change', updatePreference)
    return () => mediaQuery.removeEventListener('change', updatePreference)
  }, [reducedMotion])

  useEffect(() => {
    const group = groupRef.current
    const path = pathRef.current
    const particles = particleRefs.current

    if (!group || !path) {
      return
    }

    path.setAttribute('stroke-width', String(ANIMATION_CONFIG.strokeWidth))

    const renderFrame = (time: number) => {
      const detailScale = resolvedReducedMotion
        ? 0.74
        : getDetailScale(time, ANIMATION_CONFIG.pulseDurationMs)
      const progress = resolvedReducedMotion
        ? 0.17
        : (time % ANIMATION_CONFIG.durationMs) / ANIMATION_CONFIG.durationMs

      group.setAttribute('transform', `rotate(${getRotation(time, resolvedReducedMotion)} 50 50)`)
      path.setAttribute('d', buildPath(detailScale))

      particles.forEach((node, index) => {
        if (!node) {
          return
        }

        if (resolvedReducedMotion && index > 7) {
          node.setAttribute('opacity', '0')
          return
        }

        const particle = getParticle(index, progress, detailScale)
        node.setAttribute('cx', particle.x.toFixed(2))
        node.setAttribute('cy', particle.y.toFixed(2))
        node.setAttribute('r', particle.radius.toFixed(2))
        node.setAttribute('opacity', particle.opacity.toFixed(3))
      })
    }

    if (resolvedReducedMotion) {
      renderFrame(ANIMATION_CONFIG.durationMs * 0.17)
      return
    }

    let frameId = 0
    const startedAt = performance.now()

    const animate = (now: number) => {
      renderFrame(now - startedAt)
      frameId = window.requestAnimationFrame(animate)
    }

    frameId = window.requestAnimationFrame(animate)
    return () => window.cancelAnimationFrame(frameId)
  }, [resolvedReducedMotion])

  return (
    <div
      className={cn(
        'relative aspect-square w-full max-w-[min(82vw,38rem)] text-primary',
        className,
      )}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        className="h-full w-full overflow-visible"
        aria-hidden="true"
      >
        {!isMinimal ? (
          <defs>
            <linearGradient id={gradientId} x1="18" y1="16" x2="82" y2="84">
              <stop offset="0%" stopColor="var(--color-foreground)" stopOpacity="0.92" />
              <stop offset="46%" stopColor="var(--color-primary)" stopOpacity="0.96" />
              <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity="0.72" />
            </linearGradient>
            <filter
              id={glowId}
              x="-50%"
              y="-50%"
              width="200%"
              height="200%"
              colorInterpolationFilters="sRGB"
            >
              <feGaussianBlur stdDeviation="1.7" result="blur" />
              <feColorMatrix
                in="blur"
                type="matrix"
                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.85 0"
              />
            </filter>
          </defs>
        ) : null}

        {!isMinimal ? (
          <>
            <circle
              cx="50"
              cy="50"
              r="35.5"
              stroke="var(--color-border)"
              strokeOpacity="0.22"
              strokeDasharray="0.9 2.8"
            />
            <circle
              cx="50"
              cy="50"
              r="21"
              stroke="var(--color-border)"
              strokeOpacity="0.16"
              strokeDasharray="0.7 3.2"
            />
          </>
        ) : null}

        <g ref={groupRef}>
          <path
            ref={pathRef}
            stroke={isMinimal ? 'currentColor' : `url(#${gradientId})`}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={isMinimal ? '0.1' : '0.92'}
            filter={isMinimal ? undefined : `url(#${glowId})`}
          />
          {Array.from({ length: ANIMATION_CONFIG.particleCount }, (_, index) => (
            <circle
              key={index}
              ref={(node) => {
                particleRefs.current[index] = node
              }}
              fill={isMinimal ? 'currentColor' : `url(#${gradientId})`}
            />
          ))}
        </g>
      </svg>
    </div>
  )
}

function getPoint(progress: number, detailScale: number): CurvePoint {
  const t = progress * Math.PI * 2
  const k = Math.round(ANIMATION_CONFIG.petalCount)
  const r =
    ANIMATION_CONFIG.orbitRadius - ANIMATION_CONFIG.detailAmplitude * detailScale * Math.cos(k * t)

  return {
    x: 50 + Math.cos(t) * r * ANIMATION_CONFIG.curveScale,
    y: 50 + Math.sin(t) * r * ANIMATION_CONFIG.curveScale,
  }
}

function buildPath(detailScale: number, steps = 480) {
  return Array.from({ length: steps + 1 }, (_, index) => {
    const point = getPoint(index / steps, detailScale)
    return `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`
  }).join(' ')
}

function getParticle(index: number, progress: number, detailScale: number) {
  const tailOffset = index / (ANIMATION_CONFIG.particleCount - 1)
  const point = getPoint(
    normalizeProgress(progress - tailOffset * ANIMATION_CONFIG.trailSpan),
    detailScale,
  )
  const fade = Math.pow(1 - tailOffset, 0.56)

  return {
    x: point.x,
    y: point.y,
    radius: 0.9 + fade * 2.7,
    opacity: 0.04 + fade * 0.96,
  }
}

function getDetailScale(time: number, pulseDurationMs: number) {
  const pulseProgress = (time % pulseDurationMs) / pulseDurationMs
  const pulseAngle = pulseProgress * Math.PI * 2
  return 0.52 + ((Math.sin(pulseAngle + 0.55) + 1) / 2) * 0.48
}

function getRotation(time: number, reducedMotion: boolean) {
  if (reducedMotion || !ANIMATION_CONFIG.rotate) {
    return 0
  }

  return -((time % ANIMATION_CONFIG.rotationDurationMs) / ANIMATION_CONFIG.rotationDurationMs) * 360
}

function normalizeProgress(progress: number) {
  return ((progress % 1) + 1) % 1
}
