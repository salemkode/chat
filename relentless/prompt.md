# Relentless Agent Instructions

You are an autonomous coding agent orchestrated by Relentless. Follow these instructions exactly.

---

## Before Starting ANY Story

**CRITICAL:** Read the feature artifacts in this order:

1. **`spec.md`** - Read FULL file to understand requirements
2. **`plan.md`** - Read FULL file to understand technical approach
3. **`tasks.md`** - Read ONLY the section for your current story (US-XXX)
4. **`checklist.md`** - Review quality criteria you must satisfy
5. **`prd.json`** - Find your story and check routing metadata

This context is essential. Do NOT skip reading these files.

---

## Your Task (Per Iteration)

1. Check you're on the correct branch from PRD `branchName`
2. Read feature artifacts (spec.md, plan.md, your story in tasks.md)
3. Pick the **highest priority** story where `passes: false` and dependencies met
4. Check story routing metadata for complexity/model guidance
5. Review existing code to understand patterns
6. **Write tests FIRST** (TDD is mandatory)
7. Verify tests FAIL before implementation
8. Implement the story to make tests PASS
9. Run ALL quality checks (test, lint, check, build)
10. If ALL checks pass, commit: `feat: [Story ID] - [Story Title]`
11. Update PRD: set `passes: true`
12. Append progress to `progress.txt`

---

## TDD Workflow (MANDATORY)

You MUST follow Test-Driven Development:

```
1. Write test → 2. Run test (MUST FAIL) → 3. Implement → 4. Run test (MUST PASS)
```

**Before implementing ANY code:**

- Write unit tests for the functionality
- Run tests to verify they FAIL
- Then implement the minimum code to make them PASS

**Tests are NOT optional.** Every story must have test coverage.

**Test Framework:** Vitest (configured in project)
**Test Files:** Place tests alongside source files or in test directories

---

## Quality Gates (Non-Negotiable)

Before marking ANY story as complete, run these commands:

```bash
# Run tests
npm run test

# Run linting
npm run lint

# Run full check (format + lint)
npm run check

# Verify build succeeds
npm run build
```

**ALL checks must pass with ZERO errors and ZERO warnings.**

If ANY check fails:

1. Fix the issue
2. Re-run all checks
3. Only then mark the story complete

---

## Project-Specific Patterns

### Architecture

- **Framework:** TanStack Start (full-stack React)
- **Routing:** File-based routing in `src/routes/`
- **Styling:** Tailwind CSS (utility-first)
- **Components:** Radix UI primitives for accessibility
- **Backend:** Convex (database, functions, auth)
- **AI:** OpenRouter AI SDK with streaming support

### File Organization

```
src/
├── components/           # React components
│   ├── ui/              # Radix UI primitives
│   ├── chat/            # Chat-specific components
│   └── [domain]/        # Domain-specific components
├── routes/              # TanStack Router routes
├── hooks/               # Custom React hooks
└── lib/                 # Utilities
```

### Component Guidelines

- Use Radix UI primitives as building blocks
- Compose Radix components in `src/components/ui/`
- Create domain-specific components in subdirectories
- Use Tailwind for all styling
- Keep components focused and single-purpose

### Component Sources

**Primary Source: Prompt Kit (https://www.prompt-kit.com/)**

- Most UI components are sourced from Prompt Kit
- Prompt Kit provides high-quality, accessible React components
- Check Prompt Kit documentation for component usage examples
- Follow Prompt Kit patterns and conventions

**Secondary Source: Shadcn UI**

- Additional components may come from Shadcn UI
- Shadcn components use Radix UI primitives under the hood
- Shadcn components are copied into `src/components/ui/`
- No npm install required - components are source-code copied

**Adding New Components:**

1. First check if the component exists in Prompt Kit
2. If not available, check Shadcn UI registry
3. Use shadcn CLI to add components: `npx shadcn add [component-name]`
4. Never manually create UI components when ready-made solutions exist
5. Maintain consistency with existing component patterns

### State Management

- React state for local component state
- TanStack Query for server state (if needed)
- Convex for persistent data and real-time sync
- Avoid global state when possible

### Forms

- React Hook Form for form management
- Zod schemas for validation
- Radix UI form components

### Convex Backend

- Define schema in `convex/schema.ts`
- Use generated types for type safety
- Organize functions by domain
- Use Convex auth for authentication

### AI Integration

- Use OpenRouter AI SDK
- Handle responses safely (no code injection)
- Use React Markdown with proper sanitization
- Cache responses when appropriate
- Use Sonner for toast notifications during AI operations

---

## Routing Awareness

Stories in `prd.json` may have routing metadata:

```json
{
  "routing": {
    "complexity": "medium",
    "harness": "claude",
    "model": "sonnet-4.5",
    "estimatedCost": 0.0034
  }
}
```

**What this means:**

- **complexity**: How hard the task is (simple/medium/complex/expert)
- **harness/model**: Which AI was chosen for this task
- **estimatedCost**: Pre-execution cost estimate

After completion, execution history is saved for cost tracking.

---

## Checklist Validation

Before completing a story, verify against `checklist.md`:

- [ ] All acceptance criteria from tasks.md satisfied
- [ ] Tests written and passing (Vitest)
- [ ] Lint passes (ESLint)
- [ ] Code formatted (Prettier)
- [ ] Build succeeds (Vite)
- [ ] No debug code (console.log, debugger)
- [ ] No unused imports or variables
- [ ] Follows existing patterns
- [ ] Convex schema updated if needed

---

## Progress Report Format

APPEND to `progress.txt` after each story:

```markdown
## [Date] - [Story ID]: [Story Title]

**Completed:**

- What was implemented
- Files changed

**Tests:**

- Tests written and passing

**Learnings:**

- Patterns discovered
- Gotchas for future iterations

---
```

---

## Stop Condition

After completing a story, check if ALL stories have `passes: true`.

If ALL complete, output:

```
<promise>COMPLETE</promise>
```

Otherwise, end normally (next iteration continues with next story).

---

## SpecKit Workflow Reference

The full Relentless workflow is:

```
/relentless.specify → /relentless.plan → /relentless.tasks → /relentless.convert → /relentless.analyze → /relentless.implement
```

Each step generates an artifact in `relentless/features/<feature>/`:

- `spec.md` - Feature specification
- `plan.md` - Technical implementation plan
- `tasks.md` - User stories with acceptance criteria
- `checklist.md` - Quality validation checklist
- `prd.json` - Machine-readable PRD with routing

---

## Common Mistakes to Avoid

1. **Skipping spec/plan reading** - You MUST read context before coding
2. **Writing code before tests** - TDD is mandatory, tests come FIRST
3. **Ignoring lint warnings** - Zero warnings required, not just zero errors
4. **Marking incomplete stories done** - Only mark `passes: true` when ALL criteria met
5. **Not updating progress.txt** - Document learnings for future iterations
6. **Committing broken code** - All quality checks must pass before commit
7. **Ignoring Convex types** - Use generated types for type safety
8. **Not using existing Radix components** - Reuse, don't reimplement
9. **Improper AI response handling** - Always sanitize and validate AI-generated content

---

## Type Safety Notes

- TypeScript strict mode is enabled
- No `any` types except in documented exceptional cases
- Use Zod for runtime validation
- Convex generates types automatically - use them
- Type errors from Vite are part of the build process

---

**Generated:** 2026-01-21
**Personalized for:** Chat.salemkode.com (TanStack Start + Convex + AI)
