## Parent PRD

`issues/prd.md`

## Type

AFK

## What to build

Add the development feedback loop Ralph expects for this repo. The app currently has build and lint scripts, but Ralph's prompt expects `npm run test` and `npm run typecheck`. Create scripts and minimal behavior-oriented tests for the deepest easy-to-test product behavior.

## Acceptance criteria

- [x] `npm run typecheck` runs TypeScript checking successfully.
- [x] `npm run test` runs successfully without requiring network, wallet, or browser extension access.
- [x] At least one test verifies user-visible product behavior, preferably portable context generation or encryption round-trip behavior.
- [x] Existing `npm run build` still passes.

## Blocked by

None - can start immediately.

## User stories addressed

- User story 17
- User story 18
- User story 19
