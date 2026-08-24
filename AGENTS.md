# Repository Guidelines

## Project Scope

- Build otter as a TypeScript web app for travel/friend expense tracking, balance splitting, and settlement suggestions.
- Keep changes aligned with `GOAL.md`: trips/groups, participants, expenses, balances, settlements, browser UI, PostgreSQL persistence, tests, or docs that support those goals.
- User prompts override this file. If a nested `AGENTS.md` is added later, follow the closest one for files under that path.

## Code Organization

- Edit source under `src/`: compose the Hono API in `src/server.ts` and `src/server-*.ts`, keep shared money and settlement logic in `src/shared/`, and keep browser code in `src/client/`.
- Keep raw schema changes in `db/migrations/` and the migration runner in `scripts/migrate.ts`.
- Keep generated/runtime artifacts out of hand edits and commits: `dist/`, `node_modules/`, database dumps, coverage, logs, and `.env*` files.
- If a single source code file grows beyond 1,000 lines, split it into smaller, cohesive files before adding more logic.

## Commands

Run commands from the repository root.

- `npm install` - install dependencies for local development.
- `npm ci` - install dependencies exactly from `package-lock.json`, as CI does.
- [UNREVIEWED] `npm run dev` - start the complete foreground development stack with Docker Compose; use `npm run dev:server` with `DATABASE_URL` to run only the Hono/Vite server.
- `npm run migrate` - apply pending PostgreSQL migrations from `db/migrations/`.
- `npm run db:reset:dev` - remove the dev compose stack and database volume.
- `npm run biome:ci` - run Biome formatting/lint checks.
- `npm run typecheck` - check client/shared and server TypeScript projects.
- [UNREVIEWED] `npm test` - run Vitest server, shared, and component test files under `src/`; DB-backed suites run when `TEST_DATABASE_URL` is set.
- [UNREVIEWED] `npm run test:components` - run Testing Library component tests in the Vitest JSDOM environment without PostgreSQL.
- `npm run test:e2e` - run Playwright Chromium workflow, responsive, and accessibility tests; requires a migrated `DATABASE_URL` and installed Chromium.
- `npm run build` - build Vite client output and compile the server.
- `npm run check` - run Biome, typecheck, tests, and build.

## Style and Testing

- Write TypeScript only for app code; avoid new plain JavaScript unless there is a clear tool/config reason.
- Preserve strict TypeScript settings from `tsconfig.json` and `tsconfig.server.json`; do not silence errors with `any` or broad casts when a narrow type works.
- Follow Biome formatting/linting (`biome.json`, space indentation, recommended rules).
- Put shared behavior tests next to the shared module as `*.test.ts`; add or update tests when changing money, balance, settlement, or validation behavior.
- [UNREVIEWED] Build visual components with Radix Themes first, use Radix Primitives for behavior not covered by Themes, map custom colors through Radix Colors semantic tokens, and use Radix Icons for product icons.
- [UNREVIEWED] Use Vitest APIs for unit and component suites, Testing Library for user-visible React behavior, and Playwright for browser workflows and accessibility.

## Security and Data

- Do not commit secrets, `.env*`, database dumps, or local data.
- Treat `DATABASE_URL`, `COOKIE_SECURE`, and auth/session behavior in `src/server.ts` as runtime configuration; document changes that affect persistence or cookies.
