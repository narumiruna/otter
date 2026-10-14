# Repository Guidelines

## Documentation

- Follow ASD-STE100 (Simplified Technical English) for English technical prose.
  - Use the vocabulary and writing rules approved by ASD-STE100.
  - Keep required technical names.
- Use indented sub-items for rules that depend on a parent rule.

## Project Scope

- Build otter as a TypeScript web application for travel expenses and shared expenses with friends.
  - Support expense tracking, balance calculations, and settlement suggestions.
- Keep changes within the scope of `GOAL.md`.
  - Include trips, groups, participants, expenses, balances, settlements, the browser UI, and PostgreSQL persistence.
  - Include tests and documentation that support these functions.
- User instructions take priority over this file.
- For files in a subdirectory, follow the nearest applicable `AGENTS.md` file.

## Code Organization

- Keep application source code in `apps/`.
  - Put React and Vite browser code in `apps/web`.
  - Put Hono code, PostgreSQL code, migrations, and server tests in `apps/api`.
- Keep reusable source code in `packages/`.
  - Put environment-neutral domain logic in `packages/core`.
  - Put HTTP DTOs and payload guards in `packages/contracts`.
  - Put the published command in `packages/cli`.
- Keep dependencies in the direction `apps/* -> packages/*`.
  - `packages/*` must not import `apps/*`.
  - Web and CLI code must not import API implementation files.
  - `core` must not depend on `contracts`.
- Keep SQL schema changes in `apps/api/db/migrations/`.
  - Keep the migration runner in `apps/api/scripts/migrate.ts`.
- Do not manually edit or commit generated files or runtime artifacts.
  - These include `dist/`, `node_modules/`, database dumps, coverage reports, logs, and `.env*` files.
- If a source file exceeds 1,000 lines, split it before adding more logic.
  - Give each smaller file one main purpose.

## Commands

Run commands from the repository root.

- `npm install` - install dependencies for local development.
- `npm ci` - install the dependencies specified in `package-lock.json`, as CI does.
- [UNREVIEWED] `npm run dev` - start the complete development stack in the foreground with Docker Compose.
  - [UNREVIEWED] To run without Compose, use `npm run dev:server` with `DATABASE_URL`.
  - [UNREVIEWED] This alternative builds and watches shared packages and runs the API and Vite workspaces.
- [UNREVIEWED] `docker compose up --build` - build and start the application with bundled PostgreSQL.
  - [UNREVIEWED] Supply `POSTGRES_PASSWORD` for deployments outside development.
- `npm run migrate` - apply pending PostgreSQL migrations from `apps/api/db/migrations/`.
- `npm run db:reset:dev` - remove the development Compose stack and database volume.
- `npm run biome:ci` - run Biome formatting and lint checks.
- `npm run typecheck` - check root orchestration and every workspace TypeScript project.
- [UNREVIEWED] `npm test` - build shared packages and run Vitest suites in all workspaces.
  - [UNREVIEWED] API suites that use a database run when `DATABASE_URL` is set.
- [UNREVIEWED] `npm run test:components` - run Testing Library component tests in the Vitest JSDOM environment without PostgreSQL.
- `npm run test:e2e` - run Playwright Chromium workflow, responsive layout, and accessibility tests.
  - First, set `DATABASE_URL`, apply the database migrations, and install Chromium.
- `npm run build` - build core/contracts, the Vite client, the API, and the bundled CLI.
- `npm run check` - run Biome checks, type checks, tests, and the build.

## Style and Testing

- Write application code in TypeScript.
  - Add plain JavaScript only when there is a clear reason related to tools or configuration.
- Keep strict settings in the root and workspace `tsconfig*.json` files.
  - Do not use `any` or broad type assertions to hide type errors when a narrow type works.
- Follow Biome formatting and lint rules in `biome.json`.
  - Use space indentation and the recommended rules.
- Put shared behavior tests next to the module in `packages/core/src` as `*.test.ts`.
  - Add or update tests when money, balance, settlement, or validation behavior changes.
- [UNREVIEWED] Build visual components with Radix Themes first.
  - [UNREVIEWED] Use Radix Primitives for behavior that Radix Themes does not support.
  - [UNREVIEWED] Map custom colors through Radix Colors semantic tokens.
  - [UNREVIEWED] Use Radix Icons for product icons.
- [UNREVIEWED] Use Vitest APIs for unit and component test suites.
  - [UNREVIEWED] Use Testing Library for user-visible React behavior.
  - [UNREVIEWED] Use Playwright for browser workflows and accessibility tests.

## Git and Pull Requests

- Every pull request must include a Changesets file under `.changeset/`.
  - For package changes, run `npm run changeset`.
  - If no package version change is necessary, run `npm run changeset -- --empty`.

## Security and Data

- Do not commit secrets, `.env*` files, database dumps, or local data.
- Treat `DATABASE_URL`, `COOKIE_SECURE`, and authentication and session behavior in `apps/api/src/server.ts` as runtime configuration.
  - Document changes that affect persistence or cookies.
