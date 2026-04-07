/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- Convex hooks */
import { useAction, useMutation } from 'convex/react'
import { CreditCard, Loader2, Settings2 } from '@/lib/icons'
import { useCallback, useReducer } from 'react'
import { toast } from 'sonner'
import { api } from '@convex/_generated/api'
import type { AdminOutletContext } from '@/components/admin/admin-outlet-context'
import {
  initialSettingsState,
  mergeReducer,
  type SettingsState,
} from '@/components/admin/admin-form-state'
import { formatDateTime } from '@/components/admin/admin-utils'
import {
  RateLimitEditor,
  type RateLimitPolicy,
} from '@/components/admin/rate-limit-editor'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { AppPlan } from '@chat/shared/admin-types'

type AdminSettingsPanelProps = Pick<AdminOutletContext, 'dashboard'>

export function AdminSettingsPanel({ dashboard }: AdminSettingsPanelProps) {
  const [settingsState, updateSettings] = useReducer(
    mergeReducer<SettingsState>,
    initialSettingsState,
  )
  const updateAdminSettings = useMutation(api.admin.updateAdminSettings)
  const createProSubscriptionCheckout = useAction(
    api.stripe.createProSubscriptionCheckout,
  )
  const createBillingPortalSession = useAction(
    api.stripe.createBillingPortalSession,
  )

  const billing = dashboard.billing

  const appPlan =
    settingsState.appPlanDraft ?? dashboard.settings.appPlan ?? 'free'
  const globalRateLimit =
    settingsState.globalRateLimitDraft ??
    dashboard.settings.defaultRateLimit ??
    undefined

  const setAppPlan = (value: AppPlan | undefined) =>
    updateSettings({ appPlanDraft: value })
  const setGlobalRateLimit = (value: RateLimitPolicy | undefined) =>
    updateSettings({ globalRateLimitDraft: value })

  const handleSaveSettings = useCallback(() => {
    updateSettings({ isSavingSettings: true })
    return updateAdminSettings({
      appPlan,
      defaultRateLimit: globalRateLimit?.enabled ? globalRateLimit : undefined,
    })
      .then(() => {
        toast.success('Admin settings updated')
      })
      .catch((error) => {
        toast.error(
          error instanceof Error ? error.message : 'Failed to save settings',
        )
      })
      .finally(() => {
        updateSettings({ isSavingSettings: false })
      })
  }, [appPlan, globalRateLimit, updateAdminSettings])

  const handleStartCheckout = useCallback(() => {
    updateSettings({ isStartingCheckout: true })
    return createProSubscriptionCheckout({
      origin: window.location.origin,
    })
      .then((result) => {
        if (!result.url) {
          throw new Error('Stripe checkout did not return a redirect URL')
        }
        window.location.assign(result.url)
      })
      .catch((error) => {
        toast.error(
          error instanceof Error ? error.message : 'Failed to start checkout',
        )
      })
      .finally(() => {
        updateSettings({ isStartingCheckout: false })
      })
  }, [createProSubscriptionCheckout])

  const handleOpenBillingPortal = useCallback(() => {
    updateSettings({ isOpeningBillingPortal: true })
    return createBillingPortalSession({
      origin: window.location.origin,
    })
      .then((result) => {
        window.location.assign(result.url)
      })
      .catch((error) => {
        toast.error(
          error instanceof Error ? error.message : 'Failed to open billing',
        )
      })
      .finally(() => {
        updateSettings({ isOpeningBillingPortal: false })
      })
  }, [createBillingPortalSession])

  const isSavingSettings = settingsState.isSavingSettings
  const isStartingCheckout = settingsState.isStartingCheckout
  const isOpeningBillingPortal = settingsState.isOpeningBillingPortal

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
      <Card className="border-border bg-card shadow-[0_18px_50px_rgba(15,23,42,0.08)] dark:shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
        <CardHeader>
          <CardTitle>App plan</CardTitle>
          <CardDescription>
            Free mode exposes only free models. Pro mode unlocks paid models
            across the app.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="rounded-xl border border-border bg-muted p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-foreground">Effective plan</p>
                <p className="text-sm text-muted-foreground">
                  {billing?.hasActiveSubscription
                    ? 'Stripe billing is currently controlling access.'
                    : 'No active Stripe subscription found. The saved fallback plan will be used.'}
                </p>
              </div>
              <Badge variant="default">
                {(billing?.effectiveAppPlan ?? appPlan).toUpperCase()}
              </Badge>
            </div>
            {billing?.status ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Stripe status: {billing.status}
                {billing.currentPeriodEnd
                  ? ` · renews ${formatDateTime(billing.currentPeriodEnd)}`
                  : ''}
                {billing.cancelAtPeriodEnd ? ' · cancels at period end' : ''}
              </p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <p className="text-sm font-medium text-foreground">
              Saved fallback plan
            </p>
            <p className="text-sm text-muted-foreground">
              This applies when Stripe billing is not active or not configured.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant={appPlan === 'free' ? 'default' : 'outline'}
                onClick={() => setAppPlan('free')}
              >
                Free
              </Button>
              <Button
                type="button"
                variant={appPlan === 'pro' ? 'default' : 'outline'}
                onClick={() => setAppPlan('pro')}
              >
                Pro
              </Button>
            </div>
          </div>

          <div className="grid gap-2 rounded-xl border border-border bg-muted p-4">
            <div className="flex items-center gap-2">
              <CreditCard className="size-4 text-muted-foreground" />
              <p className="font-medium text-foreground">Stripe billing</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Start checkout for the app-wide Pro subscription or open the Stripe
              customer portal for the current billing account.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => void handleStartCheckout()}
                disabled={
                  isStartingCheckout ||
                  !billing?.priceConfigured ||
                  billing?.hasActiveSubscription
                }
              >
                {isStartingCheckout ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <CreditCard className="mr-2 size-4" />
                )}
                Upgrade with Stripe
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleOpenBillingPortal()}
                disabled={
                  isOpeningBillingPortal || !billing?.hasActiveSubscription
                }
              >
                {isOpeningBillingPortal ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Settings2 className="mr-2 size-4" />
                )}
                Open billing portal
              </Button>
            </div>
            {!billing?.priceConfigured ? (
              <p className="text-xs text-muted-foreground">
                Set `STRIPE_PRO_PRICE_ID` to enable checkout from this page.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card shadow-[0_18px_50px_rgba(15,23,42,0.08)] dark:shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
        <CardHeader>
          <CardTitle>Global message policy</CardTitle>
          <CardDescription>
            This limit applies to every message before provider and model-specific
            overrides.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <RateLimitEditor
            label="Default rate limit"
            description="Use this to throttle all model usage, especially custom providers."
            value={globalRateLimit}
            onChange={setGlobalRateLimit}
          />
          <div className="flex justify-end">
            <Button
              onClick={() => void handleSaveSettings()}
              disabled={isSavingSettings}
            >
              {isSavingSettings ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Settings2 className="mr-2 size-4" />
              )}
              Save settings
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card shadow-[0_18px_50px_rgba(15,23,42,0.08)] dark:shadow-[0_18px_50px_rgba(0,0,0,0.35)] xl:col-span-2">
        <CardHeader>
          <CardTitle>Current limit order</CardTitle>
          <CardDescription>
            Requests are checked in this order. The first failed rule blocks the
            send.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm text-muted-foreground">
          <div className="rounded-xl border border-border bg-muted p-4">
            <p className="font-medium text-foreground">1. Global default</p>
            <p>
              Applies to all models when enabled. Useful for app-wide per-user or
              global caps.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-muted p-4">
            <p className="font-medium text-foreground">2. Provider policy</p>
            <p>
              Applies to every model inside a provider, including custom
              OpenAI-compatible endpoints.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-muted p-4">
            <p className="font-medium text-foreground">3. Model policy</p>
            <p>
              Applies only to the selected model and is the final gate before the
              generation starts.
            </p>
          </div>
          <Separator />
          <p>
            The implementation uses the Convex rate limiter component at message
            send time, so the limits are transactional and enforced server-side.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
