export default function MemoryDemo() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Memory System Demo
          </h1>
          <p className="text-muted-foreground text-lg">
            This example demonstrates how to use the Convex-powered memory
            system with native vector search capabilities.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-card text-card-foreground p-6 rounded-lg border-border">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              🔍 Vector Search
            </h2>
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-md">
                <p className="font-semibold mb-2 text-foreground">
                  Using Convex Native Vector Search
                </p>
                <p className="text-sm text-muted-foreground">
                  The system uses{' '}
                  <code className="text-primary">ctx.vectorSearch()</code> for
                  fast, approximate nearest neighbor search with cosine
                  similarity.
                </p>
              </div>

              <div className="bg-muted/50 p-4 rounded-md">
                <h3 className="font-semibold text-foreground mb-2">
                  Example Code
                </h3>
                <code className="text-xs leading-relaxed">
                  {`import { useMutation } from 'convex/react'
import { api } from './convex/_generated/api'

const searchMemory = useMutation(api.memorySearch.vectorSearchChunks)

function SearchExample() {
  const [results, setResults] = useState([])

  const handleSearch = async () => {
    const data = await searchMemory({
      query: 'authentication best practices',
      agentId: 'current-user',
      maxResults: 5,
    })
    setResults(data)
  }

  return (
    <div>
      <input
        type="text"
        placeholder="Search memory..."
        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
      />
      <button onClick={handleSearch}>Search</button>
      <ul>
        {results.map(r => (
          <li key={r.id}>
            <div>Score: {r.score.toFixed(2)}</div>
            <div>{r.path}:{r.startLine}-{r.endLine}</div>
            <div>{r.source}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}`}
                </code>
              </div>

              <h3 className="font-semibold text-foreground mb-2">
                How It Works
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>1. Query text is embedded into vector (1536 dimensions)</li>
                <li>
                  2. Convex finds most similar chunks using cosine similarity
                </li>
                <li>3. Results ranked by relevance score (0-1 scale)</li>
                <li>4. Returns text snippets showing matched content</li>
              </ul>
            </div>

            <div className="bg-accent/10 p-4 rounded-md">
              <p className="text-sm text-accent-foreground">
                <strong>Performance:</strong> Native Convex vector search is
                ~10x faster
              </p>
            </div>
          </div>

          <div className="bg-card text-card-foreground p-6 rounded-lg border-border">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              📄 Memory File Structure
            </h2>
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-md">
                <code className="text-xs">
                  {`workspace/
├── MEMORY.md          # Primary memory file
└── memory/           # Detailed memory
    ├── project-info.md
    ├── conventions.md
    ├── decisions.md
    └── api-documentation.md`}
                </code>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-foreground mb-2">
                  Best Practices
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>
                    <span className="text-primary">Markdown format:</span> Use
                    clear structure
                  </li>
                  <li>
                    <span className="text-primary">Atomic entries:</span> One
                    concept per entry
                  </li>
                  <li>
                    <span className="text-primary">Include context:</span>{' '}
                    When/where to use
                  </li>
                  <li>
                    <span className="text-primary">Keep updated:</span> Document
                    changes
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-card text-card-foreground p-6 rounded-lg border-border">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              🔐 Agent Memory Organization
            </h2>
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-md">
                <p className="text-sm text-muted-foreground">
                  <strong>Key Concept:</strong> Memory is organized by{' '}
                  <code className="text-primary">agentId</code>, not by user.
                </p>
                <p className="text-sm text-muted-foreground">
                  Each agent has their own isolated memory space.
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-foreground mb-2">Example</h3>
                <code className="text-xs leading-relaxed">
                  {`memoryFiles: {
  path: "memory/auth.md",
  agentId: "agent-123",  // Agent 1's memory
}

memoryChunks: {
  path: "memory/auth.md",
  agentId: "agent-123",  // Same content
}`}
                </code>
              </div>

              <div className="bg-accent/10 p-4 rounded-md">
                <p className="text-sm text-accent-foreground">
                  <strong>What this means:</strong>
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                  <li>
                    <span className="text-primary">✓ Shared knowledge:</span>{' '}
                    Content is accessible to all agents
                  </li>
                  <li>
                    <span className="text-primary">✓ Semantic search:</span>{' '}
                    Finds based on meaning
                  </li>
                  <li>
                    <span className="text-primary">✓ Persistent:</span> Remains
                    across sessions
                  </li>
                  <li>
                    <span className="text-primary">✗ Personal store:</span> No
                    user profiles stored
                  </li>
                </ul>
              </div>

              <div className="bg-accent/10 p-4 rounded-md">
                <p className="text-sm text-accent-foreground">
                  <strong>Example Scenarios:</strong>
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                  <li>
                    <strong>Team agents:</strong> Share code documentation
                    across team
                  </li>
                  <li>
                    <strong>Personal use:</strong> Each agent remembers your
                    project context
                  </li>
                  <li>
                    <strong>Cross-session:</strong> Knowledge persists across
                    conversations
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-card text-card-foreground p-6 rounded-lg border-border">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              🎨 CSS Variables
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  Primary Colors
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-primary"></div>
                    <code className="text-xs">--primary</code>
                  </div>
                  <div className="w-4 h-4 rounded bg-secondary"></div>
                  <code className="text-xs">--secondary</code>
                </div>
                <div className="w-4 h-4 rounded bg-accent"></div>
                <code className="text-xs">--accent</code>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Semantic Colors
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-background"></div>
                <code className="text-xs">--background</code>
              </div>
              <div className="w-4 h-4 rounded bg-foreground"></div>
              <code className="text-xs">--foreground</code>
            </div>
            <div className="w-4 h-4 rounded bg-card"></div>
            <code className="text-xs">--card</code>
          </div>
          <div className="w-4 h-4 rounded bg-muted-foreground">
            <code className="text-xs">--muted-foreground</code>
          </div>
        </div>
      </div>
    </div>
  )
}
