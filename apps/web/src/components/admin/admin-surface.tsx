import type { ComponentType, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export const adminPanelClass =
  'rounded-2xl border border-border/70 bg-card/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/92'

export const adminInsetClass = 'rounded-xl border border-border/70 bg-background/85'

export const adminChipClass =
  'inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground'

export function AdminSectionCard({
  eyebrow,
  title,
  description,
  action,
  children,
  className,
  contentClassName,
}: {
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
}) {
  return (
    <section className={cn(adminPanelClass, 'p-5 md:p-6', className)}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1.5">
            {eyebrow ? (
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {eyebrow}
              </p>
            ) : null}
            <h2 className="text-xl font-semibold tracking-[-0.03em] text-foreground">{title}</h2>
            {description ? (
              <div className="max-w-3xl text-sm leading-6 text-muted-foreground">
                {description}
              </div>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
        <div className={cn('grid gap-4', contentClassName)}>{children}</div>
      </div>
    </section>
  )
}

export function AdminMetricCard({
  label,
  value,
  description,
  icon: Icon,
  accentClassName,
  className,
}: {
  label: string
  value: string
  description?: ReactNode
  icon: ComponentType<{ className?: string }>
  accentClassName?: string
  className?: string
}) {
  return (
    <article className={cn(adminPanelClass, 'p-4 md:p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </p>
          <p className="text-2xl font-semibold tracking-[-0.04em] text-foreground md:text-[1.85rem]">
            {value}
          </p>
        </div>
        <div
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-muted/45 text-muted-foreground',
            accentClassName,
          )}
        >
          <Icon className="size-4.5" />
        </div>
      </div>
      {description ? <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p> : null}
    </article>
  )
}

export function AdminMiniStat({
  label,
  value,
  className,
}: {
  label: string
  value: ReactNode
  className?: string
}) {
  return (
    <div className={cn(adminInsetClass, 'px-3.5 py-3', className)}>
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
    </div>
  )
}

export function AdminStatPill({
  label,
  value,
  className,
}: {
  label: string
  value: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-border/70 bg-muted/35 px-3 py-1.5 text-xs text-muted-foreground',
        className,
      )}
    >
      <span className="font-medium">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  )
}

export function AdminRecord({
  icon,
  title,
  subtitle,
  badges,
  summary,
  metrics,
  actions,
  className,
}: {
  icon?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  badges?: ReactNode
  summary?: ReactNode
  metrics?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <article
      className={cn(
        adminInsetClass,
        'flex flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between',
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-start gap-3.5">
          {icon ? (
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-muted/35">
              {icon}
            </div>
          ) : null}
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="min-w-0 text-base font-semibold tracking-[-0.02em] text-foreground">
                {title}
              </div>
              {badges}
            </div>
            {subtitle ? <div className="text-sm text-muted-foreground">{subtitle}</div> : null}
            {summary ? <div className="text-sm leading-6 text-muted-foreground">{summary}</div> : null}
          </div>
        </div>
      </div>
      {metrics ? (
        <div className="flex flex-1 flex-wrap gap-2 lg:justify-center">{metrics}</div>
      ) : null}
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">{actions}</div>
      ) : null}
    </article>
  )
}

export function AdminEmptyState({
  title,
  description,
  className,
}: {
  title: ReactNode
  description: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        adminInsetClass,
        'flex min-h-48 flex-col items-center justify-center gap-2 px-6 py-10 text-center',
        className,
      )}
    >
      <p className="text-lg font-semibold tracking-[-0.02em] text-foreground">{title}</p>
      <p className="max-w-xl text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  )
}
