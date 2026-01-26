// Main agent module exports
// Migrated from @convex-dev/agent

// Export with aliases to avoid conflicts
export {
  createThread as createThreadAgent,
  deleteThread as deleteThreadAgent,
  listThreads as listThreadsAgent,
  searchThreadTitles,
  // deleteAllForThreadIdAsync, // TODO: Does not exist yet
} from './threads.js'

export {
  // addMessages, // TODO: Does not exist yet
  // updateMessage, // TODO: Does not exist yet
  listMessages as listMessagesAgent,
  // listUIMessages, // TODO: Does not exist yet
  // searchMessages, // TODO: Does not exist yet
  // textSearch, // TODO: Does not exist yet
  // getMessageSearchFields, // TODO: Does not exist yet
  // deleteByIds, // TODO: Does not exist yet
  // deleteByOrder, // TODO: Does not exist yet
} from './messages.js'

export {
  get as getFile,
  addFile as storeFile,
  // changeRefcount, // TODO: Does not exist yet
} from './files.js'

export {
  create as startGeneration,
  list as listStreams,
  abort as abortStream,
  // syncStreams, // TODO: Does not exist yet
} from './streams.js'

export * from './functions.js'
export * from './validators.js'

// Re-export vector utilities
export * from './vector/tables.js'
