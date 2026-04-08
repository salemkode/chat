import { useOutletContext } from 'react-router'
import { AdminOffersPanel } from '@/components/admin/admin-offers-panel'
import type { AdminOutletContext } from '@/components/admin/admin-outlet-context'

export default function AdminOffersRoute() {
  const ctx = useOutletContext<AdminOutletContext>()
  return <AdminOffersPanel dashboard={ctx.dashboard} />
}
