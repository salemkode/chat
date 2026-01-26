// Stub types for client functionality
// Full implementation can be copied from agent_base if needed

import type { GenericActionCtx, GenericMutationCtx } from 'convex/server'

export type ActionCtx = GenericActionCtx<any, any>
export type MutationCtx = GenericMutationCtx<any, any>
export type AgentComponent = any
