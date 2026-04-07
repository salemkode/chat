import type {
  AdminModel,
  AdminModelCollection,
  AdminProvider,
  DashboardData,
} from '@/components/admin/types'

export type AdminOutletContext = {
  dashboard: DashboardData
  onOpenProviderDialog: (provider?: AdminProvider) => void
  onOpenModelDialog: (model?: AdminModel) => void
  onOpenCollectionDialog: (collection?: AdminModelCollection) => void
}
