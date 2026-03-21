import { createFileRoute } from '@tanstack/react-router'
import { AdminPage } from '@/routes/admin/page'

export const Route = createFileRoute('/admin')({
  ssr: false,
  component: AdminPage,
})
