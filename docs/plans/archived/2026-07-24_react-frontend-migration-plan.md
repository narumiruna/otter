# React frontend migration

## Goal

Migrate otter's browser entry point to React + Vite, shadcn/ui on Base UI, Tailwind CSS, TanStack Query, and React Hook Form while preserving the existing Express/PostgreSQL API and user-visible expense workflows.

## Context

The current browser UI is generated as HTML strings and rebound with DOM event listeners after each render. The backend API, shared money logic, database schema, and deployment model do not need to change.

## Architecture

- React owns the root lifecycle, global app state rendering, initial server-state query, status regions, and authentication forms.
- TanStack Query owns bootstrap/trip request caching and invalidation; the existing API helper remains the network boundary.
- React Hook Form owns login and registration form state and client validation.
- shadcn/ui components generated for the Base UI primitive layer provide the migrated shell controls; Tailwind v4 provides utility styling and theme tokens.
- Existing dashboard HTML renderers and their proven event controller remain behind a bounded compatibility component during this migration, preserving all current trip/expense/settings behavior without backend changes.

## Non-Goals

- No server API, database, authentication, money, or settlement behavior changes.
- No visual redesign or workflow removal.
- No client-side router or offline mutation support.

## Risks

- React reconciliation and legacy DOM event binding can conflict. Keep legacy markup under one leaf component and bind only after that leaf commits.
- Global legacy CSS can override utility classes. Scope new shell styles with explicit Tailwind utilities and preserve existing CSS until dashboard components are migrated individually.

## Plan

- [x] Add a focused React shell test and prove it fails before the React component exists. Evidence: `node --import tsx --test src/client/app-shell.test.tsx` failed with `ERR_MODULE_NOT_FOUND` for `react-dom` before dependencies/components were added.
- [x] Install and configure React, Tailwind v4, shadcn/ui with Base UI, TanStack Query, and React Hook Form; verified `package.json`, `package-lock.json`, `components.json`, `tsconfig.json`, and `vite.config.ts`.
- [x] Replace the browser entry point with a React root, QueryClient provider, query-backed bootstrap, RHF authentication forms, and shadcn shell components; the focused React test and TypeScript check pass.
- [x] Extract the existing imperative dashboard controller behind a React compatibility boundary, preserving every current trip, expense, receipt, settlement, sharing, import/export, and settings handler; all 56 tests pass, including the PostgreSQL-backed suite with `TEST_DATABASE_URL`.
- [x] Update project documentation to describe the new frontend stack and migration boundary; verified `README.md` paths and commands.
- [x] Run Biome, typecheck, tests, production build, and the full `npm run check` gate. Evidence: `npm run check` passed on 2026-07-24.

## Completion Checklist

- [x] `src/client/main.tsx` mounts React and the old `.ts` browser entry is removed.
- [x] React, Base UI-backed shadcn/ui, Tailwind CSS, TanStack Query, and React Hook Form are present and exercised in runtime code.
- [x] Existing browser capabilities remain reachable through the React application; a headless Chrome production smoke test completed RHF login, rendered the trip dashboard, and navigated the legacy expenses tab without browser exceptions.
- [x] No changed source file exceeds 1,000 lines; the largest migrated controller is under 1,000 lines.
- [x] `npm run check` passes.
