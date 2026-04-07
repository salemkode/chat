import { useOutletContext } from 'react-router'
import { AdminProvidersPanel } from '@/components/admin/admin-providers-panel'
import type { AdminOutletContext } from '@/components/admin/admin-outlet-context'

export default function AdminProvidersRoute() {
  const ctx = useOutletContext<AdminOutletContext>()
  return (
    <AdminProvidersPanel
      dashboard={ctx.dashboard}
      onOpenProviderDialog={ctx.onOpenProviderDialog}
    />
  )
}
