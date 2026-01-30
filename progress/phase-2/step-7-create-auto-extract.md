# Phase 2 - Step 7: Create Auto-Extract Memory from Sessions

## Status: ⏳ Pending

## Objective

Implement automatic memory extraction from session transcripts:

- `extractSessionMemory` - Analyze session and extract important info
- `analyzeWithLLM` - Use LLM to identify key memories
- Store extracted memories automatically

## Functions to Implement

```typescript
export const extractSessionMemory = action({...})
async function analyzeWithLLM(prompt: string): Promise<any[]>
```

## Features

- Fetch thread messages from agent system
- Analyze with LLM for important information
- Extract: preferences, decisions, facts, tasks
- Store as thread memories with source='session'
- Configurable extraction frequency

## Verification

- [ ] extractSessionMemory functional
- [ ] analyzeWithLLM returns valid JSON
- [ ] Extracts relevant memories
- [ ] Stores in correct scope
- [ ] Handles errors gracefully
- [ ] Tested with real conversation data

## Dependencies

- Requires Step 1 (schema) deployed
- Requires Step 4 (write functions)
- Requires agent system with message history
