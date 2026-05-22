import type { AdminCollectionDraft } from '@/components/admin/admin-collection-dialog'
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
  onOpenCollectionDraft: (draft: AdminCollectionDraft) => void
}
