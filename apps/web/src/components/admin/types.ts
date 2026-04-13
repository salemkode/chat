import type { FunctionReturnType } from 'convex/server'
import { api } from '@convex/_generated/api'

export type DashboardData = FunctionReturnType<typeof api.admin.getDashboardData>
export type ProviderCatalogResult = FunctionReturnType<typeof api.admin.inspectProviderCatalog>
export type AdminProvider = DashboardData['providers'][number]
export type AdminModel = DashboardData['models'][number]
export type AdminModelCollection = DashboardData['collections'][number]

export type IconType = 'emoji' | 'lucide' | 'phosphor' | 'upload' | undefined
