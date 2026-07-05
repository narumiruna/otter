## Goal

Make the current expense-group workspace feel like a travel expense app instead of an admin form, while keeping the implementation small: better first-run guidance, a more compact header, task-first tab order, visible primary actions, and clearer empty states.

## Context

Current UI already has group selection and workspace tabs in `src/client/views.ts`, app-level header/state in `src/client/main.ts`, tab definitions in `src/client/client-support.ts`, and styling in `src/client/styles.css`. The screenshot shows a one-person empty group with the app immediately on the long expense form, where the submit button is below the fold.

## Non-Goals

- Do not replace native `prompt()` editing flows in this pass.
- Do not add a component framework, router, or UI dependency.
- Do not change API shape, database schema, or settlement logic.

## Plan

- [x] Reorder `workspaceTabs` in `src/client/client-support.ts` to put `add-expense` first, and update `selectTrip()` in `src/client/main.ts` so selected groups default to the task-first tab; verified with `npm test -- src/client/views.test.ts`, `npm run check`, and source review of `workspaceTabs`.
- [x] Add a one-person empty-group nudge in `src/client/views.ts`: when a group has only the owner and no expenses, show a concise “先新增同行成員” CTA in the add-expense panel instead of dropping straight into a normal expense form; verified with focused `src/client/views.test.ts` assertions and Chrome screenshot check.
- [x] Add empty-state CTAs in `overviewPanel()` and `expenseList()` so users can jump to recording the first expense or adding members; verified rendered HTML includes `data-workspace-tab="add-expense"` / `data-workspace-tab="members"` buttons in view tests.
- [x] Compact the app header in `src/client/main.ts` and `src/client/styles.css` so the logged-in header uses less vertical space and preserves logout visibility; verified with `npm run check` and a Chrome screenshot check at `http://localhost:3420`.
- [x] Keep the expense form primary submit action visible by reducing form spacing and adding a sticky form action area only inside `.expense-create-card`; verified in Chrome at `http://localhost:3420` that `記錄支出` is visible without scrolling on the screenshot-sized viewport.
- [x] Strengthen selected group/tab affordances in `src/client/styles.css` by adding a subtle active background to selected group buttons and keeping tab contrast accessible; verified with screenshot review and `npm run check`.
- [x] Not applicable: `README.md` did not need user-facing updates for these in-app UI refinements; verified with empty `git diff -- README.md`.

## Risks

- Switching the default tab to `記帳` can hide balances on group open; mitigated with empty-state CTAs and keeping `總覽` one click away.
- Sticky actions can interfere with print styles or small screens; mitigated by scoping sticky CSS to `.expense-create-card button[type="submit"]`; existing print CSS still hides forms/buttons and `npm run check` passes.

## Completion Checklist

- [x] Empty one-person groups guide the user to add members before normal expense entry, verified by `src/client/views.test.ts` and Chrome screenshot/user acceptance evidence.
- [x] Group workspace opens on the task-first tab order with `記帳` first, verified by tests and source review.
- [x] Empty overview/expense states include clear next-step CTAs, verified by rendered view tests.
- [x] Header and form changes reduce above-the-fold friction, verified by Chrome screenshot checks at `http://localhost:3420`.
- [x] Quality gates pass, verified by `npm run check`.
