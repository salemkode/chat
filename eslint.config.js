import js from '@eslint/js'
import tseslint from 'typescript-eslint'

const tsFiles = ['src/**/*.ts', 'src/**/*.tsx', 'convex/**/*.ts', 'shared/**/*.ts']
const ignores = [
  'node_modules/**',
  'dist/**',
  '.output/**',
  'coverage/**',
  'build/**',
  '.netlify/**',
  'convex/_generated/**',
  'src/routeTree.gen.ts',
]

export default [
  { ignores },
  {
    files: ['**/*.{js,mjs,cjs}'],
    ...js.configs.recommended,
  },
  {
    files: tsFiles,
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: [
          './tsconfig.app.json',
          './tsconfig.worker.json',
          './convex/tsconfig.json',
        ],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-assertions': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
    },
  },
]
