# Phase 4 - Step 12: Create Memory Search Viewer

## Status: ⏳ Pending

## Objective

Create `src/components/memory-search-viewer.tsx` for searching and viewing memories.

## Features

- Search input with Enter key support
- Scope selector (all/user/thread/project)
- MinScore threshold slider
- Display search results with:
  - Title
  - Content snippet
  - Scope badge
  - Category badge
  - Score
  - Updated date
- Loading state
- Empty state for no results

## UI Components

- Input with search icon
- Select for scope
- Range slider for score threshold
- Search button with loading state
- Card-based results display
- Empty state message

## State Management

- query state
- scope state
- minScore state
- searchResults state
- isSearching state

## Verification

- [ ] Component created
- [ ] Search input functional
- [ ] Scope selector working
- [ ] Score slider functional
- [ ] Results displayed correctly
- [ ] Loading state working
- [ ] Empty state working
- [ ] Convex action integrated
- [ ] Styled with shadcn/ui
- [ ] Responsive design
- [ ] Error handling in place

## Dependencies

- Requires Step 3 (search functions)
