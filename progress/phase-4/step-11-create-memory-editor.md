# Phase 4 - Step 11: Create Memory Editor Component

## Status: ⏳ Pending

## Objective

Create `src/components/memory-editor.tsx` for CRUD operations on memories.

## Features

- Three tabs: User / Thread / Project memories
- Create new memory form
- Edit existing memory
- Delete memory
- Category selection
- Tags management
- View all memories in selected scope

## UI Components

- Tabs for scope switching
- Input for title
- Textarea for content
- Select for category
- Tag input with add/remove
- Save/Edit/Delete buttons
- Card-based memory display

## State Management

- selectedScope state
- editingId state
- newTitle, newContent, newCategory states
- newTags array
- tagInput state

## Verification

- [ ] Component created
- [ ] All three scopes working
- [ ] Create memory functional
- [ ] Edit memory functional
- [ ] Delete memory functional
- [ ] Tags add/remove working
- [ ] Category selection working
- [ ] Convex mutations integrated
- [ ] Styled with shadcn/ui
- [ ] Responsive design
- [ ] Error handling in place

## Dependencies

- Requires Steps 4, 5 (write/list functions)
