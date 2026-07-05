## Goal

Fix the highest-impact UI/UX review findings without changing backend behavior or adding dependencies. Success means core mutation flows are accessible without native browser prompts, busy/error/focus feedback is clearer, and `npm run check` passes.

## Context

The UI review found good basics already in place: 44px controls, visible focus rings, skip link, ARIA tabs, reduced-motion handling, and responsive layout. The main gaps are native `prompt()`/`confirm()` flows, global-only busy feedback, focus reset after rerenders, weak auth helper text, hidden horizontal tab overflow, and repeated raw color values.

## Non-Goals

- Do not redesign the full visual style.
- Do not add a modal/dialog dependency.
- Do not change API contracts, database schema, or settlement logic.
- Do not implement dark mode in this pass.

## Plan

- [x] Replace `prompt()` and `confirm()` calls in `src/client/main.ts` and `src/client/settings-handlers.ts` with existing-page inline controls or native `<dialog>` markup to preserve accessible labels, validation, and keyboard escape paths; verify with `rg "prompt\(|confirm\(" src/client` returning no matches and `npm run typecheck`.
- [x] Add per-action busy feedback to form/button flows so the active action is disabled and announces clear loading text while requests run; verify with a focused view/client test and `npm test -- src/client/*.test.ts`.
- [x] Restore useful focus after rerenders by focusing field-level errors first, then status messages or the active workspace tab/panel; verify with keyboard smoke testing in Chrome and any feasible DOM helper tests.
- [x] Add auth form helper text for password requirements and field-local submit errors for login/register; verify with `src/client/views.test.ts` assertions and `npm test -- src/client/views.test.ts`.
- [x] Make mobile workspace tab overflow discoverable by adding a small CSS affordance or allowing wrapped tabs without shrinking touch targets below 44px; verify at 375px width with Chrome screenshot or manual browser check.
- [x] Promote repeated state colors in `src/client/styles.css` to semantic CSS variables for secondary, danger, notice, and divider states; verify with `rg "#[0-9a-fA-F]{3,8}" src/client/styles.css` showing only token definitions and unavoidable print colors.
- [x] Run full quality checks; verify with `npm run check` exit 0.

## Risks

- Replacing native confirmations can accidentally make destructive actions too easy; keep destructive controls visually separated and require an explicit confirm action.
- Focus management can become noisy if every render steals focus; only move focus after submit/error/action completion.

## Completion Checklist

- [x] Native `prompt()`/`confirm()` flows are gone, verified by `rg "prompt\(|confirm\(" src/client` returning no matches.
- [x] Busy, error, and focus behavior is covered by tests or a recorded manual keyboard check.
- [x] Mobile workspace navigation remains touch-friendly, verified at 375px width.
- [x] CSS color usage is tokenized for repeated UI states, verified by the planned `rg` check.
- [x] All checks pass, verified by `npm run check` exit 0.
