# Development Setup

## Package Manager: Bun

This project uses **Bun** as the package manager. The `.npmrc` file is configured to enforce this.

### Why Bun?

- ⚡ Ultra-fast installation (up to 20x faster than npm)
- 📦 Built-in bundler, test runner, and package manager
- 🔥 Drop-in npm/yarn compatibility
- 💾 Efficient disk usage

### Installation

```bash
# Install Bun (if not already installed)
curl -fsSL https://bun.sh/install | bash

# Install dependencies
bun install

# Run development server
bun run dev

# Build for production
bun run build

# Run tests
bun run test

# Lint code
bun run lint
```

## React Compiler

This project uses **React Compiler** for automatic performance optimizations.

### What is React Compiler?

React Compiler is a new compiler that automatically optimizes your React code. It:

- ✅ Automatically memoizes components and hooks
- ✅ Eliminates the need for `useMemo`, `useCallback`, and `React.memo`
- ✅ Optimizes re-renders automatically
- ✅ Works with React 19

### Configuration

The compiler is configured in:

- `vite.config.ts` - Babel plugin configuration
- `react-compiler.config.js` - Compiler options

### Current Settings

```javascript
{
  target: '19',           // Optimize for React 19
  compileMode: 'auto'     // Auto-optimize in development
}
```

### Best Practices with Compiler

1. **Remove Manual Optimizations**: You don't need `useMemo`, `useCallback`, or `React.memo` anymore
2. **Write Idempotent Code**: Functions should return the same output for the same input
3. **Avoid Mutation**: Don't mutate props or state directly
4. **Keep Purity**: Render functions should be pure (no side effects)

### Example

```tsx
// ❌ Before (manual optimization)
function ExpensiveComponent({ items }) {
  const sorted = useMemo(() => [...items].sort(), [items])
  const handleClick = useCallback((id) => {
    console.log(id)
  }, [])

  return <div onClick={() => handleClick(1)}>{sorted.map(...)}</div>
}

// ✅ After (with React Compiler)
function ExpensiveComponent({ items }) {
  const sorted = [...items].sort()
  const handleClick = (id) => {
    console.log(id)
  }

  return <div onClick={() => handleClick(1)}>{sorted.map(...)}</div>
}
```

### Troubleshooting

If you see compiler warnings:

1. **"Function has implicit dependencies"**
   - The function uses values that should be dependencies
   - Move those values into the function or pass them as arguments

2. **"Function is not idempotent"**
   - The function has side effects or mutations
   - Refactor to be pure or use `useEffect` for side effects

3. **"Component has unstable props"**
   - Props are changing too often
   - Check parent components for unnecessary re-renders

### Learn More

- [React Compiler Documentation](https://react.dev/learn/react-compiler)
- [React Compiler GitHub](https://github.com/facebook/react/tree/main/compiler)
- [Bun Documentation](https://bun.sh/docs)

## Exa Web Search

To enable the in-chat web search tool, set the `EXA_API_KEY` environment variable for your Convex deployment.

Example:

```bash
bunx convex env set EXA_API_KEY <your_exa_api_key>
```

## TanStack Devtools Event Bus

The TanStack devtools event bus is disabled by default so local development does not fail when port `42069` is already in use.

Opt in only when you need it:

```bash
TANSTACK_DEVTOOLS_EVENT_BUS=1 bun run dev
```

To use a custom port:

```bash
TANSTACK_DEVTOOLS_EVENT_BUS=1 TANSTACK_DEVTOOLS_EVENT_BUS_PORT=42123 bun run dev
```

## React Scan

`react-scan` is wired into the app entrypoint but stays off unless you opt in during local development.

Use the dedicated script:

```bash
bun run dev:scan
```

Or set the flag manually:

```bash
VITE_ENABLE_REACT_SCAN=1 bun run dev
```

The scan toolbar will appear in development and can be used to spot expensive or unnecessary re-renders while you interact with the app.
