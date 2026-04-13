import { useOutletContext } from 'react-router'
import { AdminModelsPanel } from '@/components/admin/admin-models-panel'
import type { AdminOutletContext } from '@/components/admin/admin-outlet-context'

export default function AdminModelsRoute() {
  const ctx = useOutletContext<AdminOutletContext>()
  return <AdminModelsPanel dashboard={ctx.dashboard} onOpenModelDialog={ctx.onOpenModelDialog} />
}
