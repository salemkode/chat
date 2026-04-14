/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- Convex hooks */
import { useAction, useMutation } from 'convex/react'
import { CreditCard, Loader2, Settings2 } from '@/lib/icons'
import { useCallback, useReducer, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@convex/_generated/api'
import type { AdminOutletContext } from '@/components/admin/admin-outlet-context'
import {
  initialSettingsState,
  mergeReducer,
  type SettingsState,
} from '@/components/admin/admin-form-state'
import { formatDateTime } from '@/components/admin/admin-utils'
import { RateLimitEditor, type RateLimitPolicy } from '@/components/admin/rate-limit-editor'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import type { AppPlan } from '@chat/shared/admin-types'

type AdminSettingsPanelProps = Pick<AdminOutletContext, 'dashboard'>

export function AdminSettingsPanel({ dashboard }: AdminSettingsPanelProps) {
  const [settingsState, updateSettings] = useReducer(
    mergeReducer<SettingsState>,
    initialSettingsState,
  )
  const updateAdminSettings = useMutation(api.admin.updateAdminSettings)
  const verifyAutoModelRouterConnection = useAction(api.admin.verifyAutoModelRouterConnection)
  const createProSubscriptionCheckout = useAction(api.stripe.createProSubscriptionCheckout)
  const createBillingPortalSession = useAction(api.stripe.createBillingPortalSession)
  const validateModelAttachmentPolicies = useMutation(api.admin.validateModelAttachmentPolicies)

  const billing = dashboard.billing
  const autoRouting = dashboard.autoRouting ?? {
    available: false,
    totalDecisions30d: 0,
    failedDecisions30d: 0,
    topModels: [],
    lastDecisionAt: undefined,
  }

  const appPlan = settingsState.appPlanDraft ?? dashboard.settings.appPlan ?? 'free'
  const globalRateLimit =
    settingsState.globalRateLimitDraft ?? dashboard.settings.defaultRateLimit ?? undefined
  const autoModelRoutingEnabled =
    settingsState.autoModelRoutingEnabledDraft ??
    dashboard.settings.autoModelRoutingEnabled ??
    false
  const autoModelRouterUrl =
    settingsState.autoModelRouterUrlDraft ?? dashboard.settings.autoModelRouterUrl ?? ''
  const autoModelRouterApiKey =
    settingsState.autoModelRouterApiKeyDraft ?? dashboard.settings.autoModelRouterApiKey ?? ''
  const autoModelRouterPreference =
    settingsState.autoModelRouterPreferenceDraft ??
    dashboard.settings.autoModelRouterPreference ??
    'balanced'

  const setAppPlan = (value: AppPlan | undefined) => updateSettings({ appPlanDraft: value })
  const setGlobalRateLimit = (value: RateLimitPolicy | undefined) =>
    updateSettings({ globalRateLimitDraft: value })
  const setAutoModelRoutingEnabled = (value: boolean) =>
    updateSettings({ autoModelRoutingEnabledDraft: value })
  const setAutoModelRouterUrl = (value: string) =>
    updateSettings({ autoModelRouterUrlDraft: value })
  const setAutoModelRouterApiKey = (value: string) =>
    updateSettings({ autoModelRouterApiKeyDraft: value })
  const setAutoModelRouterPreference = (value: 'balanced' | 'cost' | 'speed' | 'quality') =>
    updateSettings({ autoModelRouterPreferenceDraft: value })
  const [isVerifyingRouter, setIsVerifyingRouter] = useState(false)
  const [isValidatingModels, setIsValidatingModels] = useState(false)
  const invalidModelCount = dashboard.models.filter(
    (model: (typeof dashboard.models)[number]) => model.attachmentValidationStatus === 'invalid',
  ).length
  const pendingModelCount = dashboard.models.filter(
    (model: (typeof dashboard.models)[number]) =>
      model.attachmentValidationStatus === 'pending' || !model.attachmentValidationStatus,
  ).length

  const handleSaveSettings = useCallback(async () => {
    const trimmedRouterUrl = autoModelRouterUrl.trim() || undefined
    const trimmedRouterApiKey = autoModelRouterApiKey.trim() || undefined
    updateSettings({ isSavingSettings: true })
    try {
      await updateAdminSettings({
        appPlan,
        defaultRateLimit: globalRateLimit?.enabled ? globalRateLimit : undefined,
        autoModelRoutingEnabled,
        autoModelRouterUrl: trimmedRouterUrl,
        autoModelRouterApiKey: trimmedRouterApiKey,
        autoModelRouterPreference,
      })
      toast.success('Admin settings updated')

      if (trimmedRouterUrl && trimmedRouterApiKey) {
        setIsVerifyingRouter(true)
        const check = await verifyAutoModelRouterConnection({
          routerUrl: trimmedRouterUrl,
          routerApiKey: trimmedRouterApiKey,
        })
        if (check.ok) {
          toast.success('Auto model router verified')
        } else {
          toast.error(check.message)
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save settings')
    } finally {
      setIsVerifyingRouter(false)
      updateSettings({ isSavingSettings: false })
    }
  }, [
    appPlan,
    autoModelRouterApiKey,
    autoModelRouterPreference,
    autoModelRouterUrl,
    autoModelRoutingEnabled,
    globalRateLimit,
    updateAdminSettings,
    verifyAutoModelRouterConnection,
  ])

  const handleVerifyRouter = useCallback(async () => {
    const trimmedRouterUrl = autoModelRouterUrl.trim() || undefined
    const trimmedRouterApiKey = autoModelRouterApiKey.trim() || undefined
    setIsVerifyingRouter(true)
    try {
      const check = await verifyAutoModelRouterConnection({
        routerUrl: trimmedRouterUrl,
        routerApiKey: trimmedRouterApiKey,
      })
      if (check.ok) {
        toast.success('Router connection verified')
      } else {
        toast.error(check.message)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to verify router')
    } finally {
      setIsVerifyingRouter(false)
    }
  }, [autoModelRouterApiKey, autoModelRouterUrl, verifyAutoModelRouterConnection])

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
        toast.error(error instanceof Error ? error.message : 'Failed to start checkout')
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
        toast.error(error instanceof Error ? error.message : 'Failed to open billing')
      })
      .finally(() => {
        updateSettings({ isOpeningBillingPortal: false })
      })
  }, [createBillingPortalSession])

  const handleValidateModels = useCallback(async () => {
    setIsValidatingModels(true)
    try {
      const result = await validateModelAttachmentPolicies({})
      toast.success(
        `Validated ${result.validatedCount} models${result.invalidCount > 0 ? `, ${result.invalidCount} invalid` : ''}`,
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to validate models')
    } finally {
      setIsValidatingModels(false)
    }
  }, [validateModelAttachmentPolicies])

  const isSavingSettings = settingsState.isSavingSettings
  const isStartingCheckout = settingsState.isStartingCheckout
  const isOpeningBillingPortal = settingsState.isOpeningBillingPortal

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
      <Card className="border-border bg-card shadow-[0_18px_50px_rgba(15,23,42,0.08)] dark:shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
        <CardHeader>
          <CardTitle>App plan</CardTitle>
          <CardDescription>
            Free mode exposes only free models. Pro mode unlocks paid models across the app.
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
            <p className="text-sm font-medium text-foreground">Saved fallback plan</p>
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
              Start checkout for the app-wide Pro subscription or open the Stripe customer portal
              for the current billing account.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => void handleStartCheckout()}
                disabled={
                  isStartingCheckout || !billing?.priceConfigured || billing?.hasActiveSubscription
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
                disabled={isOpeningBillingPortal || !billing?.hasActiveSubscription}
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
            This limit applies to every message before provider and model-specific overrides.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <RateLimitEditor
            label="Default rate limit"
            description="Use this to throttle all model usage, especially custom providers."
            value={globalRateLimit}
            onChange={setGlobalRateLimit}
          />
          <Separator />
          <div className="grid gap-3 rounded-xl border border-border bg-muted p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium text-foreground">Model file policy validation</p>
              <Badge variant={invalidModelCount > 0 ? 'destructive' : 'secondary'}>
                {invalidModelCount > 0 ? `${invalidModelCount} invalid` : 'No invalid models'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Validate configured model attachment media types and refresh status in the models
              admin page.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{pendingModelCount} pending</Badge>
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleValidateModels()}
                disabled={isValidatingModels}
              >
                {isValidatingModels ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Validate models
              </Button>
            </div>
          </div>
          <Separator />
          <div className="grid gap-4 rounded-xl border border-border bg-muted p-4">
            <div>
              <p className="font-medium text-foreground">Auto model router</p>
              <p className="text-sm text-muted-foreground">
                Convex syncs the active model catalog to the Python router, asks it to choose a
                model, and records the decision for analytics.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="auto-model-router-enabled">Enable auto model routing</Label>
              <Button
                id="auto-model-router-enabled"
                type="button"
                variant={autoModelRoutingEnabled ? 'default' : 'outline'}
                onClick={() => setAutoModelRoutingEnabled(!autoModelRoutingEnabled)}
                className="justify-start"
              >
                {autoModelRoutingEnabled ? 'Enabled' : 'Disabled'}
              </Button>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="auto-model-router-url">Router base URL</Label>
              <Input
                id="auto-model-router-url"
                value={autoModelRouterUrl}
                onChange={(event) => setAutoModelRouterUrl(event.target.value)}
                placeholder="https://router.example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="auto-model-router-api-key">Router API key</Label>
              <Input
                id="auto-model-router-api-key"
                type="password"
                value={autoModelRouterApiKey}
                onChange={(event) => setAutoModelRouterApiKey(event.target.value)}
                placeholder="Bearer token used by Convex"
              />
            </div>
            <div className="grid gap-2">
              <Label>Routing preference</Label>
              <Select
                value={autoModelRouterPreference}
                onValueChange={(value: 'balanced' | 'cost' | 'speed' | 'quality') =>
                  setAutoModelRouterPreference(value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="balanced">Balanced</SelectItem>
                  <SelectItem value="quality">Quality</SelectItem>
                  <SelectItem value="speed">Speed</SelectItem>
                  <SelectItem value="cost">Cost</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 rounded-lg border border-border/70 bg-background/70 p-3 text-sm">
              <p className="font-medium text-foreground">
                Availability: {autoRouting.available ? 'Ready' : 'Not ready'}
              </p>
              <p className="text-muted-foreground">
                30d decisions: {autoRouting.totalDecisions30d} · failures:{' '}
                {autoRouting.failedDecisions30d}
              </p>
              <p className="text-muted-foreground">
                Last decision:{' '}
                {autoRouting.lastDecisionAt ? formatDateTime(autoRouting.lastDecisionAt) : 'Never'}
              </p>
              <div className="pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleVerifyRouter()}
                  disabled={isVerifyingRouter}
                >
                  {isVerifyingRouter ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  Verify router connection
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {autoRouting.topModels.length > 0 ? (
                  autoRouting.topModels.map(
                    (model: { modelId: string; modelName: string; count: number }) => (
                      <Badge key={model.modelId} variant="secondary">
                        {model.modelName} · {model.count}
                      </Badge>
                    ),
                  )
                ) : (
                  <span className="text-muted-foreground">No auto-routing decisions yet.</span>
                )}
              </div>
              {!autoRouting.available ? (
                <p className="text-muted-foreground">
                  Configure router URL and API key, then verify connection.
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => void handleSaveSettings()} disabled={isSavingSettings}>
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
            Requests are checked in this order. The first failed rule blocks the send.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm text-muted-foreground">
          <div className="rounded-xl border border-border bg-muted p-4">
            <p className="font-medium text-foreground">1. Global default</p>
            <p>Applies to all models when enabled. Useful for app-wide per-user or global caps.</p>
          </div>
          <div className="rounded-xl border border-border bg-muted p-4">
            <p className="font-medium text-foreground">2. Provider policy</p>
            <p>
              Applies to every model inside a provider, including custom OpenAI-compatible
              endpoints.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-muted p-4">
            <p className="font-medium text-foreground">3. Model policy</p>
            <p>
              Applies only to the selected model and is the final gate before the generation starts.
            </p>
          </div>
          <Separator />
          <p>
            The implementation uses the Convex rate limiter component at message send time, so the
            limits are transactional and enforced server-side.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
