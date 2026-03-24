import { internalQuery } from '../_generated/server'
import { v } from 'convex/values'

export const getUserMemoryById = internalQuery({
  args: {
    id: v.id('userMemories'),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})

export const getThreadMemoryById = internalQuery({
  args: {
    id: v.id('threadMemories'),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})

export const getProjectMemoryById = internalQuery({
  args: {
    id: v.id('projectMemories'),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})
