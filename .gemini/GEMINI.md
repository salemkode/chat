# Relentless - Universal AI Agent Orchestrator

This project uses Relentless for feature-driven development with AI agents.

## Available Skills

The following skills are available in `.claude/skills/`:

- **prd** - Generate Product Requirements Documents
- **constitution** - Create project governance and coding principles
- **specify** - Create feature specifications
- **plan** - Generate technical implementation plans
- **tasks** - Generate user stories and tasks
- **checklist** - Generate quality validation checklists
- **clarify** - Resolve ambiguities in specifications
- **analyze** - Analyze consistency across artifacts
- **implement** - Execute implementation workflows
- **taskstoissues** - Convert user stories to GitHub issues

## Workflow

1. Run `/relentless.constitution` to create project governance
2. Run `/relentless.specify "feature description"` to create a feature spec
3. Run `/relentless.plan` to generate technical plan
4. Run `/relentless.tasks` to generate user stories
5. Run `/relentless.checklist` to generate quality checklist

## Feature Directory Structure

```
relentless/features/<feature-name>/
├── spec.md       # Feature specification
├── plan.md       # Technical plan
├── tasks.md      # User stories
├── checklist.md  # Quality checklist
├── prd.json      # PRD JSON (for orchestrator)
└── progress.txt  # Progress log
```

For full documentation, see: https://github.com/ArvorCo/Relentless
