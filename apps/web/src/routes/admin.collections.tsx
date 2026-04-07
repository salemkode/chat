import { useOutletContext } from 'react-router'
import { AdminCollectionsPanel } from '@/components/admin/admin-collections-panel'
import type { AdminOutletContext } from '@/components/admin/admin-outlet-context'

export default function AdminCollectionsRoute() {
  const ctx = useOutletContext<AdminOutletContext>()
  return (
    <AdminCollectionsPanel
      dashboard={ctx.dashboard}
      onOpenCollectionDialog={ctx.onOpenCollectionDialog}
    />
  )
}
