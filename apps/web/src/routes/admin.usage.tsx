import { useOutletContext } from 'react-router'
import { AdminUsagePanel } from '@/components/admin/admin-usage-panel'
import type { AdminOutletContext } from '@/components/admin/admin-outlet-context'

export default function AdminUsageRoute() {
  const ctx = useOutletContext<AdminOutletContext>()
  return <AdminUsagePanel dashboard={ctx.dashboard} />
}
