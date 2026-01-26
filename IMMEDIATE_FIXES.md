# IMMEDIATE FIXES - Get App Running

## Status: 🔴 BLOCKED - Cannot Start Dev Servers

### Current Blocker
```
✘ [ERROR] Could not resolve "../../../src/lib/agent/deltas.js"
✘ [ERROR] Could not resolve "../../../src/lib/agent/UIMessages.js"
```

---

## Quick Win Fixes (5 minutes)

### Fix 1: Remove `.js` extensions from imports
**File:** `convex/agent/streams.ts` lines 22, 27, 28

```diff
- } from "../../../src/lib/agent/deltas.js";
+ } from "../../../src/lib/agent/deltas";
- import { fromUIMessages } from "../../../src/lib/agent/UIMessages.js";
+ import { fromUIMessages } from "../../../src/lib/agent/UIMessages";
```

---

### Fix 2: Add missing `internal` import
**File:** `convex/agent/streams.ts` line ~10

```diff
import {
  internalMutation,
  mutation,
  type MutationCtx,
  query,
  action,
+ internal,
} from "../_generated/server.js";
```

---

### Fix 3: Fix exports in index.ts
**File:** `convex/agent/index.ts`

Update to use actual exported function names:

```diff
// Main agent module exports
export {
  createThread as createThreadAgent,
  deleteThread as deleteThreadAgent,
  listThreads as listThreadsAgent,
  searchThreadTitles,
- deleteAllForThreadIdAsync,
} from './threads.js'

export {
- addMessages,
- updateMessage,
  listMessages as listMessagesAgent,
- listUIMessages,
- searchMessages,
- textSearch,
- getMessageSearchFields,
- deleteByIds,
- deleteByOrder,
} from './messages.js'

export {
- getFile,
- storeFile,
+ get as getFile,
+ addFile as storeFile,
- changeRefcount,
} from './files.js'

export {
- startGeneration,
- listStreams,
- abortStream,
- syncStreams,
+ create as startGeneration,
+ list as listStreams,
+ abort as abortStream,
} from './streams.js'
```

---

### Fix 4: Fix schema import in files.ts
**File:** `convex/agent/files.ts` line ~4

```diff
- import schema from "../_generated/server.js";
+ import { schema } from "../_generated/server.js";
```

**Note:** If this fails, the schema might not be exported. In that case:
```diff
- import schema from "../_generated/server.js";
- const deltaValidator = schema.tables.streamDeltas.validator;
+ import { tables } from "../_generated/server.js";
+ const deltaValidator = tables.streamDeltas.validator;
```

---

## Apply Fixes Now

Would you like me to apply these fixes automatically?

---

## After Fixes

1. Run `npx convex dev` - should start successfully
2. Run `npm run dev` - should start on port 3000
3. Test with Chrome DevTools MCP

---

## Remaining Issues (Non-Blocking)

### TypeScript Errors
- Various type mismatches in agent files (see fix.md)
- Can be fixed incrementally while app runs

### Linting Errors
- ~63 explicit table ID violations
- Unused imports
- Type assertions
- Can be fixed with `npm run check` or manually

### Missing Functions
The commented-out exports in `index.ts` may need to be implemented if the app uses them. Check if these are actually called:
- `deleteAllForThreadIdAsync` - used?
- `addMessages` - used?
- `updateMessage` - used?
- `listUIMessages` - used?
- `searchMessages` - used?
- etc.

If they are used, add them to the respective files. If not, removing them from exports is fine.

---

## Next Steps After Fix

1. ✅ Apply the 4 quick fixes above
2. ✅ Start servers: `npx convex dev` and `npm run dev`
3. ✅ Test app loads at http://localhost:3000
4. ✅ Use Chrome MCP to test functionality
5. 🔄 Fix any runtime errors that appear
6. 🔄 Incrementally fix linting issues
7. 🔄 Continue with agent_base integration (see plan.md)
