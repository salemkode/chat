# Phase 3 - Step 9: Implement Auto-Context Injection

## Status: ⏳ Pending

## Objective

Modify agent generation to inject relevant memory context:

- Search for relevant memories before processing user query
- Build context string from top results
- Inject into agent's context/message history

## Implementation

Update `generateMessage` action in `convex/functions/agents.ts`:

```typescript
export const generateMessage = action({
  args: {...},
  handler: async (ctx, args) => {
    // 1. Search for relevant context
    const contextMemories = await searchMemory(...)

    // 2. Build context string
    const contextString = `<RELEVANT_MEMORIES>\n...\n</RELEVANT_MEMORIES>`

    // 3. Inject into agent's context
    // Either as system message or in message history

    // 4. Proceed with generation
  }
})
```

## Features

- Automatic context retrieval
- Scope filtering (all/user/thread)
- Configurable number of results
- Configurable minScore threshold
- Context format for agent

## Verification

- [ ] generateMessage updated
- [ ] Context search working
- [ ] Context string built correctly
- [ ] Context injected properly
- [ ] Agent uses context in responses
- [ ] Tested with relevant/irrelevant queries
- [ ] No performance degradation

## Dependencies

- Requires Steps 3, 8 (search and tools)
- Requires agent system
