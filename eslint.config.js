import { defineConfig } from 'eslint/config'
import tseslint from 'typescript-eslint'
import convexPlugin from '@convex-dev/eslint-plugin'

export default defineConfig([
  // TypeScript configuration
  ...tseslint.configs.recommendedTypeChecked,

  // Convex recommended configuration
  ...convexPlugin.configs.recommended,

  // General configuration for all files
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '.next/**',
      '.netlify/**',
      '.output/**',
      'convex/_generated/**',
      '*.config.js',
      '*.config.mjs',
    ],
  },

  // Convex-specific configuration
  {
    files: ['convex/**/*.ts'],
    rules: {
      // Require argument validators for all Convex functions
      '@convex-dev/require-args-validator': [
        'error',
        {
          ignoreUnusedArguments: true,
        },
      ],
      // Require explicit table names in database operations
      '@convex-dev/explicit-table-ids': 'error',
      // Allow unsafe operations in Convex files due to generated type limitations
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
    },
  },

  // TypeScript-specific rules
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Ensure no unused variables
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      // Require explicit return types for public functions
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
    },
  },

  // React configuration
  {
    files: ['**/*.tsx'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
  },

  // Test files - allow some unsafe operations due to test utility limitations
  {
    files: ['**/*.test.ts', '**/*.test.tsx'],
    rules: {
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
    },
  },
])
