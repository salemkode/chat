import { useOutletContext } from 'react-router'
import { AdminSettingsPanel } from '@/components/admin/admin-settings-panel'
import type { AdminOutletContext } from '@/components/admin/admin-outlet-context'

export default function AdminSettingsRoute() {
  const ctx = useOutletContext<AdminOutletContext>()
  return <AdminSettingsPanel dashboard={ctx.dashboard} />
}
