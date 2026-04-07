/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- Convex hooks */
import { useAuth } from '@clerk/react-router'
import { NavLink, Outlet, useNavigate } from 'react-router'
import { useMutation } from 'convex/react'
import { Loader2 } from '@/lib/icons'
import { useEffect, useMemo, useReducer } from 'react'
import { api } from '@convex/_generated/api'
import { AdminBackdrop } from '@/components/admin/admin-backdrop'
import { useAdminCollectionDialog } from '@/components/admin/admin-collection-dialog'
import { AdminDiscoveryProvider } from '@/components/admin/admin-discovery-context'
import {
  initialAdminSessionState,
  mergeReducer,
  type AdminSessionState,
} from '@/components/admin/admin-form-state'
import { useAdminModelDialog } from '@/components/admin/admin-model-dialog'
import type { AdminOutletContext } from '@/components/admin/admin-outlet-context'
import {
  AdminOverviewSection,
  useAdminOverviewUserControls,
} from '@/components/admin/admin-overview-section'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { useAdminProviderDialog } from '@/components/admin/admin-provider-dialog'
import type { DashboardData } from '@/components/admin/types'
import { AuthRedirect } from '@/components/auth-redirect'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useQuery } from '@/lib/convex-query-cache'
import { cn } from '@/lib/utils'

const adminNavLinkClass = ({
  isActive,
}: {
  isActive: boolean
}): string =>
  cn(
    'inline-flex h-8 items-center justify-center whitespace-nowrap rounded-sm px-3 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    isActive
      ? 'bg-background text-foreground shadow-sm'
      : 'text-muted-foreground hover:bg-background/60',
  )

function AdminLayoutShell({
  navigate,
  isAdmin,
  dashboard,
  models,
  providers,
  users,
  summary,
}: {
  navigate: ReturnType<typeof useNavigate>
  isAdmin: boolean | undefined
  dashboard: DashboardData | undefined
  models: DashboardData['models']
  providers: DashboardData['providers']
  users: DashboardData['users']
  summary: DashboardData['summary'] | undefined
}) {
  const providerDialog = useAdminProviderDialog({ providers })
  const modelDialog = useAdminModelDialog({ models, providers })
  const collectionDialog = useAdminCollectionDialog({ models })

  const overviewControls = useAdminOverviewUserControls({
    isAuthenticated: true,
    isUserReady: true,
    isAdmin,
    users,
  })

  const outletContext = useMemo<AdminOutletContext | null>(() => {
    if (!dashboard) {
      return null
    }
    return {
      dashboard,
      onOpenProviderDialog: providerDialog.openProviderDialog,
      onOpenModelDialog: modelDialog.openModelDialog,
      onOpenCollectionDialog: collectionDialog.openCollectionDialog,
    }
  }, [
    dashboard,
    providerDialog.openProviderDialog,
    modelDialog.openModelDialog,
    collectionDialog.openCollectionDialog,
  ])

  return (
    <div className="relative mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:px-8">
      <AdminPageHeader
        onNavigateHome={() => void navigate('/')}
        providerDialog={providerDialog.dialogProps}
        modelDialog={modelDialog.dialogProps}
        collectionDialog={collectionDialog.dialogProps}
      />

      {!isAdmin ? (
        <Card className="border-border bg-card shadow-[0_18px_50px_rgba(15,23,42,0.08)] dark:shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
          <CardHeader>
            <CardTitle>Admin access required</CardTitle>
            <CardDescription>
              This user is authenticated but not registered in the `admins`
              table.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : dashboard === undefined ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="size-8 animate-spin" />
        </div>
      ) : (
        <>
          <AdminOverviewSection
            summary={summary}
            users={users}
            controls={overviewControls}
          />
          <nav
            className="grid h-auto w-full grid-cols-2 gap-1 rounded-md bg-muted p-1 sm:grid-cols-3 md:grid-cols-5 lg:w-[640px]"
            aria-label="Admin sections"
          >
            <NavLink to="providers" className={adminNavLinkClass}>
              Providers
            </NavLink>
            <NavLink to="models" className={adminNavLinkClass}>
              Models
            </NavLink>
            <NavLink to="collections" className={adminNavLinkClass}>
              Collections
            </NavLink>
            <NavLink to="usage" className={adminNavLinkClass}>
              Usage
            </NavLink>
            <NavLink to="settings" className={adminNavLinkClass}>
              Settings
            </NavLink>
          </nav>
          {outletContext ? <Outlet context={outletContext} /> : null}
        </>
      )}
    </div>
  )
}

export default function AdminLayoutRoute() {
  'use no memo'

  const navigate = useNavigate()
  const { isLoaded, isSignedIn, userId } = useAuth()
  const isAuthenticated = isSignedIn ?? false
  const isLoading = !isLoaded
  const ensureCurrentUser = useMutation(api.users.ensureCurrentUser)
  const [sessionState, updateSessionState] = useReducer(
    mergeReducer<AdminSessionState>,
    initialAdminSessionState,
  )
  const initializedUserId = sessionState.initializedUserId
  const setInitializedUserId = (value: string | null) =>
    updateSessionState({ initializedUserId: value })
  const isUserReady = isAuthenticated ? initializedUserId === userId : false

  const isAdmin = useQuery(
    api.admin.isAdmin,
    isAuthenticated && isUserReady ? {} : 'skip',
  )
  const dashboard = useQuery(
    api.admin.getDashboardData,
    isAuthenticated && isUserReady && isAdmin ? {} : 'skip',
  )

  const models: DashboardData['models'] = dashboard?.models ?? []
  const providers: DashboardData['providers'] = dashboard?.providers ?? []
  const users: DashboardData['users'] = dashboard?.users ?? []
  const summary = dashboard?.summary

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      return
    }
    let isCancelled = false
    void ensureCurrentUser({})
      .then(() => {
        if (!isCancelled) {
          setInitializedUserId(userId)
        }
      })
      .catch((error) => {
        console.error('Failed to initialize current user:', error)
      })
    return () => {
      isCancelled = true
    }
  }, [ensureCurrentUser, isAuthenticated, userId])

  if (isLoading || (isAuthenticated && !isUserReady)) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="size-8 animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <AuthRedirect />
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <AdminBackdrop />
      <AdminDiscoveryProvider models={models}>
        <AdminLayoutShell
          navigate={navigate}
          isAdmin={isAdmin}
          dashboard={dashboard}
          models={models}
          providers={providers}
          users={users}
          summary={summary}
        />
      </AdminDiscoveryProvider>
    </div>
  )
}
