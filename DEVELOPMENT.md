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
