/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- Convex hooks */
import { useAuth } from '@clerk/react-router'
import { NavLink, Outlet, useNavigate } from 'react-router'
import { useMutation } from 'convex/react'
import { Bot, Boxes, CreditCard, Loader2, Settings2, Sparkles, User, Users } from '@/lib/icons'
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
} from '@/components/admin/admin-overview-section'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { useAdminProviderDialog } from '@/components/admin/admin-provider-dialog'
import { adminPanelClass } from '@/components/admin/admin-surface'
import type { DashboardData } from '@/components/admin/types'
import { AuthRedirect } from '@/components/auth-redirect'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useQuery } from '@/lib/convex-query-cache'
import { cn } from '@/lib/utils'

const adminSections = [
  {
    to: '/admin/providers',
    title: 'Providers',
    icon: Boxes,
  },
  {
    to: '/admin/models',
    title: 'Model Studio',
    icon: Bot,
  },
  {
    to: '/admin/collections',
    title: 'Collections',
    icon: Sparkles,
  },
  {
    to: '/admin/usage',
    title: 'Usage',
    icon: Users,
  },
  {
    to: '/admin/accounts',
    title: 'Accounts',
    icon: User,
  },
  {
    to: '/admin/offers',
    title: 'Offers',
    icon: CreditCard,
  },
  {
    to: '/admin/settings',
    title: 'Settings',
    icon: Settings2,
  },
] as const

function AdminLayoutShell({
  navigate,
  isAdmin,
  dashboard,
  models,
  providers,
  summary,
}: {
  navigate: ReturnType<typeof useNavigate>
  isAdmin: boolean | undefined
  dashboard: DashboardData | undefined
  models: DashboardData['models']
  providers: DashboardData['providers']
  summary: DashboardData['summary'] | undefined
}) {
  const providerDialog = useAdminProviderDialog({ providers })
  const modelDialog = useAdminModelDialog({ models, providers })
  const collectionDialog = useAdminCollectionDialog({ models })

  const outletContext = useMemo<AdminOutletContext | null>(() => {
    if (!dashboard) {
      return null
    }
    return {
      dashboard,
      onOpenProviderDialog: providerDialog.openProviderDialog,
      onOpenModelDialog: modelDialog.openModelDialog,
      onOpenCollectionDialog: collectionDialog.openCollectionDialog,
      onOpenCollectionDraft: collectionDialog.openCollectionDraft,
    }
  }, [
    dashboard,
    providerDialog.openProviderDialog,
    modelDialog.openModelDialog,
    collectionDialog.openCollectionDialog,
    collectionDialog.openCollectionDraft,
  ])

  return (
    <div className="relative mx-auto flex w-full max-w-[92rem] flex-col gap-5 px-4 py-6 md:px-8 md:py-8">
      <AdminPageHeader
        onNavigateHome={() => void navigate('/')}
        providerDialog={providerDialog.dialogProps}
        modelDialog={modelDialog.dialogProps}
        collectionDialog={collectionDialog.dialogProps}
        summary={summary}
      />

      {!isAdmin ? (
        <Card className={adminPanelClass}>
          <CardHeader>
            <CardTitle>Admin access required</CardTitle>
            <CardDescription>
              This user is authenticated but not registered in the `admins` table.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : dashboard === undefined ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="size-8 animate-spin" />
        </div>
      ) : (
        <>
          <nav className={`${adminPanelClass} flex flex-wrap gap-2 p-2`} aria-label="Admin sections">
            {adminSections.map(({ to, title, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    isActive
                      ? 'bg-foreground text-background shadow-sm'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                  )
                }
              >
                <Icon className="size-4" />
                {title}
              </NavLink>
            ))}
          </nav>
          <AdminOverviewSection summary={summary} />
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

  const isAdmin = useQuery(api.admin.isAdmin, isAuthenticated && isUserReady ? {} : 'skip')
  const dashboard = useQuery(
    api.admin.getDashboardData,
    isAuthenticated && isUserReady && isAdmin ? {} : 'skip',
  )

  const models: DashboardData['models'] = dashboard?.models ?? []
  const providers: DashboardData['providers'] = dashboard?.providers ?? []
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
          summary={summary}
        />
      </AdminDiscoveryProvider>
    </div>
  )
}
