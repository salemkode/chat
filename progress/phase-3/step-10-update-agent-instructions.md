# Phase 3 - Step 10: Update Agent Instructions

## Status: ⏳ Pending

## Objective

Update agent instructions to include memory usage guidelines.

## Updated Instructions

```typescript
instructions: `You are a helpful assistant with access to memory tools.

Before answering user questions:
1. Search memory for relevant information using memory_search
2. Use found information to provide informed answers
3. If important new information emerges, store it using memory_write

Memory scopes:
- user: General knowledge about the user that applies across all conversations
- thread: Information specific to this conversation
- project: Shared knowledge across multiple conversations in a project

Always prefer user-scoped memory for general preferences and thread-scoped for conversation-specific details.
`,
```

## Verification

- [ ] Instructions updated
- [ ] Clear guidelines provided
- [ ] Memory scope explanations clear
- [ ] Examples of when to use memory
- [ ] Tested with agent responses

## Dependencies

- Requires Step 8 (tools)
