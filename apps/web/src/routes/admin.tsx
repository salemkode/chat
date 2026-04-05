/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- Convex hooks */
import { useAuth } from '@clerk/react-router'
import { useNavigate } from 'react-router'
import { useMutation } from 'convex/react'
import { Loader2 } from '@/lib/icons'
import { useEffect, useReducer } from 'react'
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
import {
  AdminOverviewSection,
  useAdminOverviewUserControls,
} from '@/components/admin/admin-overview-section'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { useAdminProviderDialog } from '@/components/admin/admin-provider-dialog'
import { AdminTabsSection } from '@/components/admin/admin-tabs-section'
import type { DashboardData } from '@/components/admin/types'
import { AuthRedirect } from '@/components/auth-redirect'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useQuery } from '@/lib/convex-query-cache'

function AdminPage() {
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
        <div className="relative mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:px-8">
          <AdminPageInner
            navigate={navigate}
            isAdmin={isAdmin}
            dashboard={dashboard}
            providers={providers}
            models={models}
            users={users}
            summary={summary}
          />
        </div>
      </AdminDiscoveryProvider>
    </div>
  )
}

function AdminPageInner({
  navigate,
  isAdmin,
  dashboard,
  providers,
  models,
  users,
  summary,
}: {
  navigate: ReturnType<typeof useNavigate>
  isAdmin: boolean | undefined
  dashboard: DashboardData | undefined
  providers: DashboardData['providers']
  models: DashboardData['models']
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

  return (
    <>
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
          <AdminTabsSection
            dashboard={dashboard}
            onOpenProviderDialog={providerDialog.openProviderDialog}
            onOpenModelDialog={modelDialog.openModelDialog}
            onOpenCollectionDialog={collectionDialog.openCollectionDialog}
          />
        </>
      )}
    </>
  )
}
export default AdminPage
