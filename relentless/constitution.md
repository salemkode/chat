# Project Constitution

**Version:** 1.0.0
**Ratified:** 2026-01-21
**Last Amended:** 2026-01-21

---

## Overview

This document defines the governing principles, patterns, and constraints for the Chat.salemkode.com project. All AI agents and developers MUST follow these guidelines when working on the codebase.

---

## Core Principles

### 1. Test-Driven Development (TDD)

**MUST:**

- Write tests BEFORE implementation code
- Verify tests FAIL before writing implementation
- All new features MUST have test coverage
- All bug fixes MUST include regression tests
- Tests MUST be part of acceptance criteria

**SHOULD:**

- Aim for >80% code coverage on critical paths
- Write integration tests for API endpoints and Convex functions
- Write E2E tests for user-facing flows
- Use descriptive test names that document behavior

**Rationale:** TDD ensures code correctness, documents behavior, and prevents regressions. Tests written first force clear thinking about requirements.

---

### 2. Quality Gates

**MUST:**

- All commits MUST pass lint (ESLint) with 0 errors AND 0 warnings
- All commits MUST pass test (Vitest) with 0 failures
- All code MUST be properly formatted (Prettier)
- No debug code in production (console.log, debugger)
- No unused imports or variables (enforced by strict TypeScript)

**SHOULD:**

- Run quality checks locally before pushing: `npm run check`
- Fix lint warnings immediately, don't accumulate debt
- Keep build times under reasonable limits

**Quality Commands:**

```bash
npm run test      # Run tests
npm run lint      # Run linting
npm run check     # Format and lint
npm run build     # Verify build succeeds
```

**Rationale:** Quality gates catch issues early and maintain codebase health over time.

---

### 3. Code Architecture

**MUST:**

- Follow TanStack Start file-based routing conventions
- Keep components in `src/components/`, organized by domain
- Place React components in `src/components/` and routes in `src/routes/`
- Keep modules focused and single-purpose
- Avoid circular dependencies
- Export types alongside implementations

**SHOULD:**

- Prefer composition over inheritance
- Keep components small and focused (<150 lines)
- Write self-documenting code
- Use meaningful names (no abbreviations)
- Use Radix UI primitives for accessible components
- Leverage Tailwind CSS for styling

**Rationale:** Consistent architecture makes code predictable and maintainable. TanStack Start patterns ensure proper routing and data loading.

---

### 4. Type Safety

**MUST:**

- Use strict TypeScript mode (enabled in tsconfig.json)
- No `any` type except in documented exceptional cases
- Validate external input using Zod schemas
- Export type definitions for public APIs
- Use Convex's generated types for database operations

**SHOULD:**

- Use Zod for runtime validation
- Prefer type inference over explicit annotations
- Use discriminated unions for state machines
- Document complex type constraints

**Rationale:** Type safety prevents runtime errors and improves developer experience.

---

### 5. Version Control

**MUST:**

- Write clear, descriptive commit messages
- Reference user story IDs: `feat: [US-XXX] - Description`
- Keep commits focused and atomic
- Never commit broken code
- Never commit secrets or credentials

**SHOULD:**

- Use conventional commit format (feat, fix, chore, docs, etc.)
- Keep PR size manageable
- Update documentation with code changes
- Use `npm run check` before committing

**Rationale:** Good version control practices enable collaboration and debugging.

---

### 6. Error Handling

**MUST:**

- Handle all error cases explicitly
- Provide descriptive error messages
- Validate input at system boundaries
- Never swallow errors silently
- Use Convex error handling patterns for backend functions

**SHOULD:**

- Include context in error messages
- Use Sonner for toast notifications
- Provide recovery suggestions
- Log errors appropriately

**Rationale:** Proper error handling improves debugging and user experience.

---

### 7. Documentation

**MUST:**

- Document public APIs and interfaces
- Document breaking changes in commits
- Keep README updated with setup instructions
- Document non-obvious design decisions

**SHOULD:**

- Document Convex schema changes
- Include usage examples for complex components
- Document troubleshooting steps
- Keep inline comments minimal but meaningful

**Rationale:** Documentation reduces onboarding time and prevents knowledge loss.

---

### 8. Security

**MUST:**

- Never commit secrets or credentials
- Validate and sanitize user input with Zod
- Use Convex's built-in authentication and authorization
- Follow principle of least privilege in Convex functions

**SHOULD:**

- Keep dependencies updated
- Run security audits periodically
- Use environment variables for configuration
- Implement proper auth checks for protected routes

**Rationale:** Security is non-negotiable and must be built in from the start.

---

### 9. AI Integration

**MUST:**

- Use OpenRouter AI SDK for AI interactions
- Handle AI responses safely (no code injection)
- Validate AI-generated content before rendering
- Use React Markdown with proper sanitization (remark-gfm)

**SHOULD:**

- Cache responses when appropriate
- Provide clear feedback during AI processing
- Handle streaming responses gracefully
- Implement proper error boundaries

**Rationale:** AI integration requires careful handling to ensure security and reliability.

---

## Technology Stack

### Language & Runtime

- **TypeScript** - Primary language (strict mode enabled)
- **React 19** - UI framework
- **Node.js** - Runtime environment

### Key Libraries

- **TanStack Start** - Full-stack React framework
- **TanStack Router** - File-based routing
- **Convex** - Backend as a Service (database, functions, auth)
- **Radix UI** - Accessible component primitives
- **Tailwind CSS** - Utility-first styling
- **Zod** - Runtime type validation
- **AI SDK (OpenRouter)** - AI integration
- **React Hook Form** - Form management
- **Sonner** - Toast notifications

### Quality Tools

- **ESLint** - Code linting (TanStack config)
- **Prettier** - Code formatting
- **Vitest** - Testing framework
- **TypeScript** - Type checking

---

## File Organization

```
project/
├── src/                      # Source code
│   ├── components/           # React components
│   │   ├── ui/              # Radix UI primitives
│   │   ├── chat/            # Chat-specific components
│   │   └── [domain]/        # Domain-specific components
│   ├── routes/              # TanStack Router routes (file-based)
│   │   ├── __root.tsx       # Root layout
│   │   ├── index.tsx        # Home page
│   │   └── [route].tsx      # Other routes
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utilities
│   └── router.tsx           # Router configuration
├── convex/                  # Convex backend
│   ├── schema.ts            # Database schema
│   └── [functions]/         # Server functions
├── relentless/              # Relentless workspace
│   ├── config.json          # Configuration
│   ├── constitution.md      # This file
│   ├── prompt.md            # Agent prompt
│   └── features/            # Feature workspaces
└── package.json
```

---

## Agent-Specific Guidelines

### For All AI Agents

**MUST:**

- Read spec.md and plan.md BEFORE starting work
- Read only the relevant story section from tasks.md
- Work on ONE story per iteration
- Follow TDD - write tests first
- Run ALL quality checks (test, lint, check) before committing
- Update PRD after completing a story
- Append learnings to progress.txt
- Use Convex for all data persistence

**SHOULD:**

- Review existing code patterns before modifying
- Ask questions when requirements are unclear
- Document non-obvious decisions
- Keep commits small and focused
- Leverage existing Radix UI components

### Iteration Workflow

1. Read spec.md, plan.md, checklist.md
2. Find your story in tasks.md (only read that section)
3. Review relevant existing code
4. Write tests FIRST (TDD)
5. Verify tests FAIL
6. Implement minimum code to pass tests
7. Run `npm run test`, `npm run lint`, `npm run check`
8. Commit with proper message format
9. Update PRD: `passes: true`
10. Append to progress.txt
11. Check if all stories complete

---

## Routing and Cost Optimization

When using Relentless Auto Mode:

**MUST:**

- Respect routing decisions in prd.json
- Report actual costs vs estimated costs
- Not override routing without explicit permission

**SHOULD:**

- Use appropriate model for task complexity
- Consider cost when choosing approaches
- Track and report token usage

**Modes:**

- `free` - Free tier models only (~95% savings)
- `cheap` - Budget models (~75% savings)
- `good` - Balanced quality/cost (~50% savings)
- `genius` - Premium models (no savings)

---

## Project-Specific Patterns

### Component Organization

- Use Radix UI primitives for all interactive components
- Compose Radix components in `src/components/ui/`
- Create domain-specific components in subdirectories (e.g., `src/components/chat/`)

### State Management

- Use React state for local component state
- Use TanStack Query for server state
- Use Convex for persistent data and real-time sync
- Avoid global state when possible

### Forms

- Use React Hook Form for form management
- Use Zod schemas for validation
- Leverage Radix UI form components

### Styling

- Use Tailwind CSS for all styling
- Follow Tailwind conventions and utility classes
- Use Tailwind variants for component variants

### Convex Backend

- Define schema in `convex/schema.ts`
- Use generated types for type safety
- Organize functions by domain
- Use Convex auth for authentication

---

## Governance

### Amendment Process

1. Propose changes via PR
2. Discuss with team
3. Update version semantically:
   - **MAJOR**: Breaking changes to principles
   - **MINOR**: New principles added
   - **PATCH**: Clarifications, typo fixes
4. Update `Last Amended` date
5. Document rationale for change

### Compliance

- Constitution is checked before each feature implementation
- Violations should be flagged in code review
- Repeated violations require team discussion
- Emergency exceptions require documentation

### Review Schedule

- **Quarterly**: Full constitution review
- **Per Feature**: Relevance check
- **On Issues**: Investigate if constitution gap

---

**Template Version:** 2.1.0
**Generated:** 2026-01-21
