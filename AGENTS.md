# AGENTS.md

## Scope
This file applies to the entire repository. It is the single source of truth for architectural decisions.

## Mandatory project rules
- **No legacy burden**: Never preserve deprecated behavior. Prefer clean refactors and simplification.

## Required workflow for feature/state changes
- When behavior changes, treat tests as required:
  - Search for and update existing related tests first (`src/**/*.test.ts` for unit, `tests/` for e2e).
  - Add at least minimal tests for every new feature path. Choose unit or e2e based on the nature of the change.
- Run, at minimum, these commands after relevant code changes:
  - `npm run build`
  - `npm run test:unit`
  - `npm run test:e2e`

## State and architecture defaults
- Prefer existing Zustand actions for progression-related state updates.
- Keep changes focused; avoid introducing new global state patterns without clear benefit.
- Keep e2e test location in `tests/` and use explicit naming where applicable (e.g., rename/organize under an explicit e2e-focused naming style as the suite evolves).

## Repo hygiene
- Respect `.gitignore` in all decisions about what to edit or commit.

## Collaboration output expectations
- Every agent response for code changes should include a long underline separator first. Then:
  - A short list of possible misalignments with current architecture.
  - Better architecture options when they materially improve the implementation.
