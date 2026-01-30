# Phase 2 - Step 6: Create Project Management Functions

## Status: ⏳ Pending

## Objective

Implement project CRUD operations:

- `createProject` - Create a new project
- `listProjects` - List user's projects
- `addThreadToProject` - Add thread to project
- `updateProject` - Update project details
- `deleteProject` - Delete a project

## Functions to Implement

```typescript
export const createProject = mutation({...})
export const listProjects = query({...})
export const addThreadToProject = mutation({...})
export const updateProject = mutation({...})
export const deleteProject = mutation({...})
```

## Features

- Project name and description
- Project-thread association
- User ownership
- Timestamps
- Thread array management

## Verification

- [ ] createProject working
- [ ] listProjects returns user's projects
- [ ] addThreadToProject prevents duplicates
- [ ] updateProject functional
- [ ] deleteProject functional
- [ ] Authorization enforced
- [ ] All functions tested

## Dependencies

- Requires Step 1 (schema) deployed
