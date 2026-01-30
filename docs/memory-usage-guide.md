# Memory System Usage Guide for AI Models

## Introduction

This guide explains how AI models and agents can use the memory system to store, retrieve, and share information across sessions. The memory system acts as a persistent knowledge base, enabling continuity and knowledge accumulation over time.

## Quick Start

### Basic Setup

```typescript
import { getMemorySearchManager } from './memory/index.js'

// Initialize memory manager
const result = await getMemorySearchManager({
  cfg: config,
  agentId: 'your-agent-id',
})

if (result.manager) {
  console.log('Memory system available')
} else {
  console.log('Memory system unavailable:', result.error)
}
```

### Basic Search

```typescript
const results = await manager.search('how to authenticate API requests')

for (const result of results) {
  console.log(`Score: ${result.score.toFixed(2)}`)
  console.log(`Source: ${result.path}:${result.startLine}-${result.endLine}`)
  console.log(`Snippet: ${result.snippet}`)
}
```

## Information Storage

### What to Store

**Store information that:**

- Will be useful in future sessions
- Represents reusable knowledge or patterns
- Documents important decisions or requirements
- Explains domain-specific concepts
- Contains solutions to complex problems

**Examples:**

````markdown
# Authentication Pattern

**Context:** All API endpoint development
**Last Updated:** 2026-01-26

Our project uses JWT tokens for authentication:

1. Clients authenticate via `/api/auth/login` endpoint
2. Server returns JWT token valid for 24 hours
3. Include token in requests: `Authorization: Bearer <token>`
4. Token format: `ey...` (standard JWT)

Example request:

```bash
curl -H "Authorization: Bearer ey..." https://api.example.com/data
```
````

### JWT Structure

- Header: algorithm and token type
- Payload: user claims (user_id, role, exp)
- Signature: cryptographic verification

```

### Memory File Structure

```

workspace/
├── MEMORY.md # Primary overview and index
└── memory/ # Detailed knowledge files
├── project-info.md # Project overview, goals, stakeholders
├── conventions.md # Coding standards, patterns
├── decisions.md # Architectural and technical decisions
├── api-reference.md # API documentation
├── domain-knowledge.md# Business domain concepts
└── troubleshooting.md # Common issues and solutions

````

### Writing Effective Memory Entries

**Good Entry Structure:**
```markdown
## [Descriptive Title]

**Context:** When/where this information applies
**Relevance:** Who should read this, when to reference it

[Clear, concise explanation]

### Key Points

- Point 1
- Point 2
- Point 3

### Examples

[Practical examples if helpful]

### Related

- Link to related entries
- Cross-reference files

**Last Updated:** YYYY-MM-DD
````

**Example - High Quality:**

````markdown
## Database Connection Pooling

**Context:** All database operations in the application
**Relevance:** Backend developers, performance optimization

Our application uses connection pooling to manage database connections efficiently:

### Configuration

```typescript
const pool = createPool({
  host: process.env.DB_HOST,
  port: 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20, // Maximum connections
  min: 5, // Minimum connections
  idleTimeoutMillis: 30000,
})
```
````

### Best Practices

1. Always use the pool, never create direct connections
2. Release connections back to pool with `pool.end()`
3. Handle pool exhaustion gracefully
4. Monitor pool metrics in production

### Common Issues

**Connection Timeout:**

- Check if max connections reached
- Verify database can accept more connections
- Consider increasing pool size

**Leaked Connections:**

- Ensure all queries have proper error handling
- Use try/finally to release connections

**Last Updated:** 2026-01-26

````

**Example - Poor Quality:**
```markdown
## DB Stuff

Use pool for database.

```typescript
const pool = createPool({...})
````

That's it.

````

### Memory Entry Guidelines

**1. Be Specific**
- ❌ "Handle errors properly"
- ✅ "Always wrap database queries in try/catch and call pool.end() in finally block"

**2. Include Context**
- ❌ "Use JWT tokens"
- ✅ "Authentication uses JWT tokens with 24-hour expiration, passed via Authorization header"

**3. Provide Examples**
- ❌ "Format dates as ISO 8601"
- ✅ "Format dates as ISO 8601: `2026-01-26T10:30:00Z`"

**4. Keep It Current**
- Update entries when practices change
- Mark deprecated entries with `[DEPRECATED]` prefix
- Remove outdated information

**5. Make It Searchable**
- Use terms future agents might search for
- Include synonyms and alternative names
- Structure content to match likely queries

## Information Retrieval

### Search Strategies

**1. Direct Query**
```typescript
const results = await manager.search("authentication flow");
````

**2. Query Variations**

```typescript
const queries = [
  'authentication flow',
  'API token handling',
  'how to login',
  'JWT tokens',
]

const allResults = []
for (const query of queries) {
  const results = await manager.search(query, { maxResults: 5 })
  allResults.push(...results)
}

// Deduplicate and sort
const uniqueResults = deduplicateResults(allResults)
const sortedResults = uniqueResults.sort((a, b) => b.score - a.score)
```

**3. Context-Aware Search**

```typescript
// Search with session context
const results = await manager.search(query, {
  sessionKey: sessionId, // Prioritizes context from this session
})
```

**4. Progressive Refinement**

```typescript
// Broad search first
const broadResults = await manager.search('API')

// Filter and refine
const relevantResults = broadResults
  .filter((r) => r.snippet.toLowerCase().includes('authentication'))
  .slice(0, 5)

// Read full content for relevant results
for (const result of relevantResults) {
  const content = await manager.readFile({ relPath: result.path })
  // Process full content
}
```

### Reading Full Content

```typescript
// Read entire file
const { text, path } = await manager.readFile({
  relPath: 'memory/authentication.md',
})

// Read specific lines
const { text } = await manager.readFile({
  relPath: 'memory/authentication.md',
  from: 10, // Start at line 10
  lines: 20, // Read 20 lines
})

// Extract section by searching
const lines = text.split('\n')
const startMarker = lines.findIndex((l) => l.startsWith('## JWT Structure'))
const endMarker = lines.findIndex((l) => l.startsWith('## '), startMarker + 1)
const section = lines.slice(startMarker, endMarker).join('\n')
```

### Evaluating Search Results

**Consider:**

- Score (higher = more relevant)
- Source (memory vs sessions)
- Recency (check last updated)
- Completeness (does it fully answer the question?)

**When Results Are Poor:**

1. Try different query terms
2. Lower `minScore` threshold
3. Check if information exists in memory
4. Consider adding the information to memory
5. Ask user for clarification

## Integration Patterns

### Pattern 1: Answer Generation

```typescript
async function answerQuestion(question: string) {
  // Search memory first
  const results = await manager.search(question, {
    maxResults: 5,
    minScore: 0.4,
  })

  if (results.length > 0) {
    // Use memory as context
    const context = results.map((r) => r.snippet).join('\n')
    return generateAnswerWithContext(question, context)
  }

  // No relevant memory found
  return generateAnswerFromKnowledge(question)
}
```

### Pattern 2: Task Execution

```typescript
async function executeTask(task: string) {
  // Search for similar tasks
  const previousResults = await manager.search(`how to ${task}`, {
    maxResults: 3,
  })

  // Extract patterns from previous solutions
  const patterns = extractPatterns(previousResults)

  // Apply patterns to current task
  const solution = applyPatterns(task, patterns)

  // Store solution if successful
  if (solution.success) {
    await storeSolution(task, solution)
  }

  return solution
}
```

### Pattern 3: Decision Support

```typescript
async function makeDecision(decision: string) {
  // Search for related decisions
  const previousDecisions = await manager.search(`decision ${decision}`, {
    maxResults: 5,
  })

  // Analyze patterns
  const analysis = analyzeDecisions(previousDecisions)

  // Provide recommendation
  return {
    recommendation: generateRecommendation(analysis),
    context: analysis.context,
    confidence: analysis.confidence,
  }
}
```

### Pattern 4: Learning Capture

```typescript
async function captureLearning(conversation: Conversation) {
  // Identify important insights
  const insights = extractInsights(conversation)

  for (const insight of insights) {
    // Check if already in memory
    const existing = await manager.search(insight.topic, {
      maxResults: 1,
      minScore: 0.8,
    })

    if (existing.length === 0) {
      // Store new insight
      await storeInsight(insight)
    }
  }
}
```

### Pattern 5: Cross-Session Continuity

```typescript
async function restoreSessionContext(sessionId: string) {
  // Warm session for better results
  await manager.warmSession(sessionId)

  // Search for recent decisions
  const recentDecisions = await manager.search('decision', {
    sessionKey: sessionId,
    maxResults: 10,
  })

  // Build context from memory and sessions
  const context = buildContext(recentDecisions)

  return context
}
```

## Advanced Usage

### Hybrid Search Tuning

```typescript
// Adjust for semantic-heavy queries
const semanticResults = await manager.search(query, {
  minScore: 0.5,
})

// Adjust for keyword-heavy queries
const keywordResults = await manager.search('exact phrase here', {
  minScore: 0.3, // Lower threshold for keyword matches
})

// Custom hybrid weights (via configuration)
// vectorWeight: 0.8  // More emphasis on semantic
// textWeight: 0.2    // Less emphasis on keywords
```

### Source Filtering

```typescript
// Search only memory files
const config = {
  sources: ['memory'], // Exclude sessions
}

// Search only sessions
const config = {
  sources: ['sessions'],
}

// Search both (default)
const config = {
  sources: ['memory', 'sessions'],
}
```

### Batch Operations

```typescript
// Search multiple queries efficiently
const queries = ['auth', 'database', 'api']
const results = await Promise.all(queries.map((q) => manager.search(q)))

// Combine and deduplicate
const combined = deduplicate(results.flat())
```

### Progress Tracking

```typescript
await manager.sync({
  progress: (update) => {
    console.log(`${update.completed}/${update.total}: ${update.label}`)
    // Update UI or log progress
  },
})
```

## Best Practices

### For AI Agents

**1. Search Before Acting**

```typescript
// Always search memory before making decisions
const existing = await manager.search(currentTask)
if (existing.length > 0) {
  // Use existing knowledge
} else {
  // Proceed without memory
}
```

**2. Store Important Learnings**

```typescript
// After solving a complex problem
if (problemWasComplex) {
  await storeSolution(problem, solution)
}
```

**3. Update Outdated Information**

```typescript
// When you discover information is outdated
await updateMemoryEntry(oldEntry, newInformation)
```

**4. Provide Context in Answers**

```typescript
// Reference memory when answering
const memory = await manager.search(question);
const answer = `Based on our documentation: ${memory[0]?.snippet || ...}`;
```

**5. Acknowledge Memory Gaps**

```typescript
// When information is missing
if (results.length === 0) {
  return "I don't have information about this in memory. Would you like me to add it?"
}
```

### For Information Quality

**1. Atomic Storage**

- Store one concept per entry
- Combine related concepts in same file
- Use clear sectioning

**2. Progressive Detail**

- High-level overview in MEMORY.md
- Detailed information in memory/\*.md
- Link related entries

**3. Regular Maintenance**

- Review and update entries monthly
- Remove or deprecate outdated content
- Consolidate duplicate information

**4. Consistent Formatting**

- Use established structure
- Include metadata (context, relevance, last updated)
- Provide examples for complex concepts

## Troubleshooting

### Search Returns No Results

**Causes:**

- Query terms don't match stored content
- Information not in memory
- MinScore threshold too high
- Recent changes not yet indexed

**Solutions:**

```typescript
// Try multiple query variations
const variations = ['auth', 'authentication', 'login', 'sign in']

// Lower threshold
const results = await manager.search(query, { minScore: 0.3 })

// Check if files are indexed
const status = manager.status()
console.log(`Indexed: ${status.files} files, ${status.chunks} chunks`)

// Trigger sync if needed
await manager.sync()
```

### Search Results Are Poor Quality

**Causes:**

- Memory entries lack context
- Vague or unclear content
- Mismatched terminology
- Outdated information

**Solutions:**

1. Improve memory entries with better context and examples
2. Use multiple search terms
3. Update outdated entries
4. Add synonyms and alternative terms to entries

### Sync Issues

**Causes:**

- Embedding provider unavailable
- API key missing
- Network connectivity issues
- File permission problems

**Solutions:**

```typescript
// Check provider availability
const probe = await manager.probeEmbeddingAvailability()
if (!probe.ok) {
  console.error('Embedding provider error:', probe.error)
}

// Check vector extension
const vectorReady = await manager.probeVectorAvailability()
console.log('Vector available:', vectorReady)

// Get detailed status
const status = manager.status()
console.log('Provider:', status.provider)
console.log('Fallback:', status.fallback)
console.log('Batch errors:', status.batch?.failures)
```

### Performance Issues

**Causes:**

- Too many memory files
- Large chunk sizes
- Frequent syncs
- Inefficient queries

**Solutions:**

```typescript
// Adjust chunking (in configuration)
chunking: {
  tokens: 300,  // Larger chunks = fewer embeddings
  overlap: 75
}

// Adjust sync frequency
sync: {
  intervalMinutes: 30,  // Sync less often
  watchDebounceMs: 10000  // Longer debounce
}

// Use source filtering
// Only search memory files if sessions aren't needed
sources: ["memory"]

// Limit search results
const results = await manager.search(query, {
  maxResults: 5  // Fewer results = faster
});
```

## Real-World Examples

### Example 1: API Documentation Assistant

```typescript
async function answerAPIQuestion(question: string) {
  // Search for related API documentation
  const results = await manager.search(`API ${question}`, {
    maxResults: 5,
    minScore: 0.4,
  })

  if (results.length > 0) {
    // Build answer from memory
    const answer = buildAnswerFromResults(results)
    return answer
  }

  // Not found in memory
  return "I don't have information about that API endpoint in memory. Would you like me to document it?"
}
```

### Example 2: Code Convention Enforcer

```typescript
async function checkCodeConventions(code: string) {
  // Extract patterns from code
  const patterns = extractPatterns(code)

  // Search memory for conventions
  for (const pattern of patterns) {
    const conventions = await manager.search(`convention ${pattern}`, {
      maxResults: 3,
      minScore: 0.3,
    })

    if (conventions.length > 0) {
      // Check if code follows convention
      const follows = checkAgainstConvention(code, conventions[0])
      if (!follows) {
        return {
          issue: 'Convention violation',
          convention: conventions[0].snippet,
        }
      }
    }
  }

  return { status: 'OK' }
}
```

### Example 3: Problem Solver

```typescript
async function solveProblem(problem: string) {
  // Search for similar problems
  const similar = await manager.search(`problem ${problem}`, { maxResults: 5 })

  // Extract solutions from memory
  const solutions = similar
    .filter((r) => r.snippet.includes('solution'))
    .map((r) => extractSolution(r.snippet))

  if (solutions.length > 0) {
    // Apply similar solutions
    return adaptSolution(problem, solutions)
  }

  // No similar problems found
  return { message: 'No similar problems found in memory' }
}
```

## Conclusion

The memory system is a powerful tool for building persistent, knowledgeable AI agents. By following these patterns and best practices, you can:

- Store knowledge for future use
- Retrieve relevant information quickly
- Maintain context across sessions
- Learn and improve over time
- Provide more accurate, consistent responses

Remember:

- Search memory before acting
- Store important learnings
- Keep memory entries clear and current
- Use search strategically
- Maintain information quality

For detailed architecture information, see `docs/memory-architecture.md`.
For AI agent rules and guidelines, see `agent.md`.
