/**
 * React Compiler Configuration
 *
 * This file configures the React Compiler (Babel plugin) for automatic optimizations.
 *
 * Learn more: https://react.dev/learn/react-compiler
 */

export default {
  // Target React version
  target: '19',

  // Compile in dev mode (set to false to only compile in production)
  // NOTE: Set to true to test compiler optimizations during development
  compileMode: process.env.NODE_ENV === 'production' ? 'full' : 'auto',

  // Enable verbose logging for debugging (not recommended in production)
  // verbose: true,

  // Optional: Explicitly opt-in specific files or directories
  // sources: [
  //   'src/components/**',
  //   'src/routes/**',
  // ],
}
