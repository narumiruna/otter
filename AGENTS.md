# Repository Guidelines

## Project Scope

- Build otter as a TypeScript web app for travel/friend expense tracking, balance splitting, and settlement suggestions.
- Keep changes aligned with `GOAL.md`: trips/groups, participants, expenses, balances, settlements, browser UI, PostgreSQL persistence, tests, or docs that support those goals.
- User prompts override this file. If a nested `AGENTS.md` is added later, follow the closest one for files under that path.

## Code Organization

- Keep deployable source in `apps/`: React/Vite browser code belongs to `apps/web`, while Hono, PostgreSQL, migrations, and server tests belong to `apps/api`.
- Keep reusable source in `packages/`: environment-neutral domain logic belongs to `packages/core`, HTTP DTOs and payload guards to `packages/contracts`, and the published command to `packages/cli`.
- Preserve the dependency direction `apps/* -> packages/*`. `packages/*` must not import `apps/*`; web and CLI must not import API implementation files; `core` must not depend on `contracts`.
- Keep raw schema changes in `apps/api/db/migrations/` and the migration runner in `apps/api/scripts/migrate.ts`.
- Keep generated/runtime artifacts out of hand edits and commits: `dist/`, `node_modules/`, database dumps, coverage, logs, and `.env*` files.
- If a single source code file grows beyond 1,000 lines, split it into smaller, cohesive files before adding more logic.

## Commands

Run commands from the repository root.

- `npm install` - install dependencies for local development.
- `npm ci` - install dependencies exactly from `package-lock.json`, as CI does.
- [UNREVIEWED] `npm run dev` - start the complete foreground development stack with Docker Compose; use `npm run dev:server` with `DATABASE_URL` to build/watch shared packages and run the API and Vite workspaces without Compose.
- [UNREVIEWED] `docker compose up --build` - build and start the app with bundled PostgreSQL; provide `POSTGRES_PASSWORD` for a non-development deployment.
- `npm run migrate` - apply pending PostgreSQL migrations from `apps/api/db/migrations/`.
- `npm run db:reset:dev` - remove the dev compose stack and database volume.
- `npm run biome:ci` - run Biome formatting/lint checks.
- `npm run typecheck` - check root orchestration and every workspace TypeScript project.
- [UNREVIEWED] `npm test` - build shared packages and run Vitest suites in all workspaces; DB-backed API suites run when `DATABASE_URL` is set.
- [UNREVIEWED] `npm run test:components` - run Testing Library component tests in the Vitest JSDOM environment without PostgreSQL.
- `npm run test:e2e` - run Playwright Chromium workflow, responsive, and accessibility tests; requires a migrated `DATABASE_URL` and installed Chromium.
- `npm run build` - build core/contracts, the Vite client, the API, and the bundled CLI.
- `npm run check` - run Biome, typecheck, tests, and build.

## Style and Testing

- Write TypeScript only for app code; avoid new plain JavaScript unless there is a clear tool/config reason.
- Preserve strict settings in the root and workspace `tsconfig*.json` files; do not silence errors with `any` or broad casts when a narrow type works.
- Follow Biome formatting/linting (`biome.json`, space indentation, recommended rules).
- Put shared behavior tests next to the module in `packages/core/src` as `*.test.ts`; add or update tests when changing money, balance, settlement, or validation behavior.
- [UNREVIEWED] Build visual components with Radix Themes first, use Radix Primitives for behavior not covered by Themes, map custom colors through Radix Colors semantic tokens, and use Radix Icons for product icons.
- [UNREVIEWED] Use Vitest APIs for unit and component suites, Testing Library for user-visible React behavior, and Playwright for browser workflows and accessibility.

## Security and Data

- Do not commit secrets, `.env*`, database dumps, or local data.
- Treat `DATABASE_URL`, `COOKIE_SECURE`, and auth/session behavior in `apps/api/src/server.ts` as runtime configuration; document changes that affect persistence or cookies.
