/* eslint-disable */
// @ts-nocheck

import type { ClawdbotConfig } from '../config/config.js'
import type { MemoryIndexManager } from './manager.js'
import type { ConvexMemoryManager } from './convex-manager.js'

export type MemorySearchManagerResult = {
  manager: MemoryIndexManager | ConvexMemoryManager | null
  error?: string
}

export async function getMemorySearchManager(params: {
  cfg: ClawdbotConfig
  agentId: string
  useConvex?: boolean
}): Promise<MemorySearchManagerResult> {
  try {
    if (params.useConvex === false) {
      const { MemoryIndexManager } = await import('./manager.js')
      const manager = await MemoryIndexManager.get(params)
      return { manager }
    }

    const convexDeploymentUrl = process.env.CONVEX_DEPLOYMENT_URL
    if (!convexDeploymentUrl) {
      const { MemoryIndexManager } = await import('./manager.js')
      const manager = await MemoryIndexManager.get(params)
      return { manager }
    }

    const { ConvexMemoryManager } = await import('./convex-manager.js')
    const memorySearchConfig = params.cfg.agents?.defaults?.memorySearch
    const manager = new ConvexMemoryManager({
      deploymentUrl: convexDeploymentUrl,
      agentId: params.agentId,
      workspaceDir: `/path/to/workspace/${params.agentId}`,
      provider: memorySearchConfig?.provider || 'openai',
      model: memorySearchConfig?.model || 'text-embedding-3-small',
      chunking: {
        tokens: memorySearchConfig?.chunking?.tokens || 200,
        overlap: memorySearchConfig?.chunking?.overlap || 50,
      },
      providerKey: `provider_${params.agentId}`,
    })

    await manager.initialize()
    return { manager }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { manager: null, error: message }
  }
}
