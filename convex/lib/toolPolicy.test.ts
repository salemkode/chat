import { describe, expect, it } from 'vitest'
import { evaluateToolPolicy, runThreadMetadataPolicy } from './toolPolicy'

describe('evaluateToolPolicy', () => {
  it('requires memory_add for explicit remember intents', () => {
    const policy = evaluateToolPolicy({
      threadId: 'thread-1',
      userId: 'user-1',
      prompt: 'Remember that I prefer concise answers.',
      currentTitle: 'New Chat',
      currentEmoji: '💬',
      lastLabelUpdateAt: 0,
      firstUserMessage: 'Remember that I prefer concise answers.',
      messageCount: 1,
      now: 31 * 60 * 1000,
    })

    expect(policy.detectedIntent).toBe('memory_add')
    expect(policy.requiredActions).toContain('memory_add_required')
    expect(policy.systemAddendum).toContain('memory_add')
  })

  it('requires memory_search when the user asks what is remembered', () => {
    const policy = evaluateToolPolicy({
      threadId: 'thread-1',
      userId: 'user-1',
      prompt: 'What do you remember about me?',
      currentTitle: 'Profile chat',
      currentEmoji: '🧠',
      lastLabelUpdateAt: 0,
      firstUserMessage: 'What do you remember about me?',
      messageCount: 3,
      now: 31 * 60 * 1000,
    })

    expect(policy.detectedIntent).toBe('memory_search')
    expect(policy.requiredActions).toEqual(
      expect.arrayContaining(['memory_search_required']),
    )
  })

  it('requires memory_search before ambiguous deletes', () => {
    const policy = evaluateToolPolicy({
      threadId: 'thread-1',
      userId: 'user-1',
      prompt: 'Forget my old stack preference.',
      currentTitle: 'Stack preferences',
      currentEmoji: '💻',
      lastLabelUpdateAt: 0,
      firstUserMessage: 'Forget my old stack preference.',
      messageCount: 3,
      now: 31 * 60 * 1000,
    })

    expect(policy.detectedIntent).toBe('memory_delete')
    expect(policy.requiredActions).toContain('memory_search_required')
    expect(policy.systemAddendum).toContain('memory_delete')
  })

  it('does not force memory tools for ordinary chat', () => {
    const policy = evaluateToolPolicy({
      threadId: 'thread-1',
      userId: 'user-1',
      prompt: 'Explain vector search in simple terms.',
      currentTitle: 'Vector search',
      currentEmoji: '🔍',
      lastLabelUpdateAt: 0,
      firstUserMessage: 'Explain vector search in simple terms.',
      messageCount: 1,
      now: 31 * 60 * 1000,
    })

    expect(policy.detectedIntent).toBe('none')
    expect(policy.requiredActions).toEqual([])
    expect(policy.systemAddendum).toBe('')
  })
})

describe('runThreadMetadataPolicy', () => {
  it('triggers metadata updates for placeholder titles with strong first messages', () => {
    const policy = runThreadMetadataPolicy({
      prompt: 'Please help me build a Convex memory policy for chat tools.',
      currentTitle: 'New Chat',
      currentEmoji: '💬',
      lastLabelUpdateAt: 0,
      firstUserMessage:
        'Please help me build a Convex memory policy for chat tools.',
      messageCount: 1,
      now: 31 * 60 * 1000,
    })

    expect(policy.requiredActions).toContain('metadata_update_required')
    expect(policy.detectedIntent).toBe('metadata_refresh')
    expect(policy.update?.title.length).toBeGreaterThan(0)
  })

  it('does not update non-placeholder accurate titles', () => {
    const policy = runThreadMetadataPolicy({
      prompt: 'Please help me build a Convex memory policy for chat tools.',
      currentTitle: 'Convex Tool Policy',
      currentEmoji: '💻',
      lastLabelUpdateAt: 0,
      firstUserMessage:
        'Please help me build a Convex memory policy for chat tools.',
      messageCount: 7,
      now: 31 * 60 * 1000,
    })

    expect(policy.requiredActions).toEqual([])
    expect(policy.update).toBeNull()
  })

  it('suppresses metadata updates during cooldown', () => {
    const policy = runThreadMetadataPolicy({
      prompt: 'Please help me build a Convex memory policy for chat tools.',
      currentTitle: 'New Chat',
      currentEmoji: '💬',
      lastLabelUpdateAt: 10 * 60 * 1000,
      firstUserMessage:
        'Please help me build a Convex memory policy for chat tools.',
      messageCount: 7,
      now: 20 * 60 * 1000,
    })

    expect(policy.requiredActions).toEqual([])
    expect(policy.update).toBeNull()
  })
})
