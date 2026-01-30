# Phase 4 - Step 13: Create Sync Dashboard

## Status: ⏳ Pending

## Objective

Create `src/components/sync-dashboard.tsx` for monitoring memory sync status.

## Features

- Display current sync status (idle/syncing/error)
- Show last sync timestamp
- Force sync button
- Error message display (if error)
- Statistics:
  - User memories count
  - Thread memories count
  - Project memories count
- Status badges and icons

## UI Components

- Card for status overview
- Icons for each status state
- Force sync button
- Error alert (if error)
- Stats grid (3 columns)
- Badges for status

## State Management

- Query syncState from Convex
- Display in UI

## Verification

- [ ] Component created
- [ ] Sync status displayed
- [ ] Last sync timestamp shown
- [ ] Force sync button functional
- [ ] Error state displayed correctly
- [ ] Statistics accurate
- [ ] Icons appropriate for status
- [ ] Convex query integrated
- [ ] Styled with shadcn/ui
- [ ] Responsive design

## Dependencies

- Requires memory functions for sync state
- Requires Step 5 (list functions) for stats
