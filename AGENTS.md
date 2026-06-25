# Repository Guidelines

## Project Scope

- Build otter as a TypeScript web app for travel/friend expense tracking, balance splitting, and settlement suggestions.
- Keep changes aligned with `GOAL.md`: trips/groups, participants, expenses, balances, settlements, browser UI, local prototype persistence, tests, or docs that support those goals.
- User prompts override this file. If a nested `AGENTS.md` is added later, follow the closest one for files under that path.

## Code Organization

- Edit source under `src/`: server/API code in `src/server.ts`, shared money and settlement logic in `src/shared/`, and browser assets in `src/client/`.
- Keep generated/runtime artifacts out of hand edits and commits: `dist/`, `node_modules/`, `data/`, coverage, logs, and `.env*` files.
- If a single source code file grows beyond 1,000 lines, split it into smaller, cohesive files before adding more logic.

## Commands

Run commands from the repository root.

- `npm install` - install dependencies for local development.
- `npm ci` - install dependencies exactly from `package-lock.json`, as CI does.
- `npm run dev` - start the Express/Vite dev server.
- `npm run biome:ci` - run Biome formatting/lint checks.
- `npm run typecheck` - check client/shared and server TypeScript projects.
- `npm test` - run Node test files matching `src/**/*.test.ts`.
- `npm run build` - build Vite client output and compile the server.
- `npm run check` - run Biome, typecheck, tests, and build.

## Style and Testing

- Write TypeScript only for app code; avoid new plain JavaScript unless there is a clear tool/config reason.
- Preserve strict TypeScript settings from `tsconfig.json` and `tsconfig.server.json`; do not silence errors with `any` or broad casts when a narrow type works.
- Follow Biome formatting/linting (`biome.json`, space indentation, recommended rules).
- Put shared behavior tests next to the shared module as `*.test.ts`; add or update tests when changing money, balance, settlement, or validation behavior.

## Security and Data

- Do not commit secrets, `.env*`, or local JSON data from `data/`.
- Treat `DATA_DIR`, `DATA_FILE`, `COOKIE_SECURE`, and auth/session behavior in `src/server.ts` as runtime configuration; document changes that affect local persistence or cookies.
