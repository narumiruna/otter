# Goal-oriented UX workflow redesign

## Approval

Approved and implemented on 2026-07-25. The completed checklist and verification evidence below describe the shipped repository state.

## Goal

Redesign otter around the jobs users perform most often—switching groups, recording expenses, reviewing balances, and settling up—while progressively disclosing uncommon or risky controls and preserving every current API, database, data-format, permission, sharing, and PWA capability.

## Context

The current React shell renders the authenticated workspace through HTML-string views and an imperative compatibility controller. Desktop uses a persistent group sidebar and five same-level tabs: `記帳`, `總覽`, `支出紀錄`, `成員`, and `設定/匯出`. Mobile uses horizontal scrolling for the group list and workspace tabs. The expense form exposes optional metadata and all split controls immediately; the overview places spending charts before settlement results; and the settings page mixes routine exports, permissions, data tools, calculation settings, lifecycle actions, and irreversible deletion in one long surface.

Evidence reviewed:

- Product scope and documented behavior in `GOAL.md` and `README.md`.
- React shell, workspace views, handlers, responsive CSS, shared money/settlement/import/backup logic, and client tests.
- Current desktop add-expense and settings flows at 1440px and overview at 390px.
- Existing owner/editor permissions, archived/read-only states, CSV and backup formats, and PostgreSQL-backed API behavior.

There is no analytics or user-research evidence. Frequency rankings are product assumptions inferred from `GOAL.md`, current defaults, and workflow prominence and must not be presented as measured behavior.

## Users and Jobs

- **Group owner:** set up a trip or gathering, record and correct expenses, understand balances, settle debts, manage collaborators/sharing, and protect or retire the group.
- **Collaborator:** switch to the right group, record and correct expenses, maintain split participants, and review or record settlement without owner-only controls.
- **Read-only visitor:** verify expenses, balances, and who should pay whom without encountering mutation affordances.

## Capability Classification

- **Primary:** current-group switching, record expense, pending settlements, balances, expense history.
- **Secondary:** create group, add/rename participants, edit expenses, receipts, common search/filter/sort, record settlement payment.
- **Advanced:** unequal splits, tags, advanced filters, merge participants, custom exchange rates, CSV import, backup restore.
- **Owner-only:** collaborators, read-only links, base currency, archive, and group deletion.
- **Destructive:** deleting expenses, receipts, settlement records, participants, collaborators, links, or a group.
- **Compatibility-only:** current API semantics, PostgreSQL schema/data, CSV headers, JSON backup v1, `/share/:token`, archived data, receipt URLs, role restrictions, PWA manifest, and currently accepted unknown backup fields.

## Flow Priorities

| Flow | Assumed frequency | Importance | Complexity | Risk / reversibility |
| --- | --- | --- | --- | --- |
| Switch group | High | High | Low | Reversible |
| Record equal-split expense | Very high | High | Medium | Editable; changes balances |
| Review balances and settlement | High near trip end | High | Medium | Read-only |
| Record settlement payment | Medium | High | Medium | Deletable; changes settlement |
| Correct an expense | Medium | High | Medium | Changes all calculated results |
| Add split participant | Occasional | High during setup | Low | Reversible while unused |
| Share or collaborate | Occasional | Medium/high | Medium | Permission/data exposure |
| Change currency/rates | Rare | High | High | Changes all displayed calculations |
| Import or restore | Rare | High | High | Batch creation |
| Delete group | Very rare | High | Low | Irreversible |

## Proposed Information Architecture

### Global shell

- Brand and skip link.
- Current-group switcher with selected group, loading, archived, and empty states.
- Connectivity status.
- Accessible user menu with visible account identity and logout.

### Group workspace

- **總覽:** pending settlement first, balances, recent expenses, then collapsible spending analysis.
- **支出:** search, compact common filters, active filter chips, expense history, details/edit/receipt/delete.
- **成員:** split participants and advanced merge tools. Login collaborators are not called members here.
- **更多:** share/access, group preferences, data/export, conversion, and lifecycle sections.
- **記一筆:** persistent primary action rather than a peer destination.

Desktop keeps a compact group sidebar. Mobile replaces horizontal group and tab carousels with an accessible group-selection sheet and four labeled destinations plus the prominent record-expense action. Critical actions must not depend on swipe discovery.

### Shallow URL state

Preserve `/` and `/share/:token`, and add optional owned query keys:

```text
/?trip=<id>&view=overview
/?trip=<id>&view=expenses
/?trip=<id>&view=people
/?trip=<id>&view=more
/?trip=<id>&mode=add-expense
```

Use the History API without adding a router dependency. Browser Back must leave add/edit/subsection modes predictably. Updating owned keys must preserve unknown query parameters and invalid values must safely fall back to an existing group and `overview`.

## Architecture

### React boundaries

Replace the legacy workspace incrementally with cohesive React feature components:

- `AuthenticatedWorkspace` owns selected-group URL state and adaptive layout.
- `TripSwitcher` and `TripHeader` own group selection and visible status.
- `WorkspaceNavigation` owns the four destinations and record-expense entry.
- `OverviewPage`, `ExpenseComposer`, `ExpensesPage`, `PeoplePage`, and `MorePage` own goal-based surfaces.
- Shared confirmation, preview, status, empty-state, and unsaved-change components use shadcn/ui generated for the existing Base UI preset.

Keep the relevant legacy view/handler available until each React surface passes parity tests. Remove `views.ts`, `settings-view.ts`, `settings-handlers.ts`, and `legacy-controller.ts` only after all selectors, routes, forms, and role-specific capabilities have React replacements. Decompose before extending any file near or above 1,000 lines.

### Server state and mutations

- TanStack Query owns bootstrap, group collection, selected payload, and mutation states.
- Mutations update visible data only after successful API responses; prefer invalidation/refetch over optimistic financial calculations.
- Failed mutations retain the previous valid query data and current form draft.
- Busy state is scoped to the affected action and dependent controls rather than globally making unrelated controls appear available but inert.
- Existing API request/response bodies and server transactions remain unchanged.

### Forms and previews

- React Hook Form owns create/edit/settings drafts, dirty state, validation, focus, cancellation, and server-error placement.
- Extract pure split normalization/preview behavior into a shared TypeScript module used by both client preview and server validation so rounding and split semantics cannot diverge.
- Reuse `calculateBalances`, `calculateSettlements`, `parseExpenseImportCsv`, and `validateTripBackupV1` for side-effect-free previews where applicable.
- Preview never calls a mutation endpoint. Confirm/apply performs one atomic request. Cancel and Escape perform no request and do not update query data.

### Compatibility

- No database migration.
- Preserve TWD, JPY, USD, EUR behavior and fixed/custom rates.
- Preserve CSV headers and explicit-split syntax.
- Preserve backup version 1 acceptance and current treatment of extra fields; do not claim unsupported unknown-field round trips.
- Preserve readonly share URLs, owner/editor permissions, archive semantics, receipt limits/URLs, and restore-without-selected-group access.
- PATCH only changed fields. URL state only changes owned parameters.

## Interaction Specifications

### Record expense

Show description, amount, date, payer, currency, and a compact split summary first. Default to today, the group base currency, the first current participant, all participants, and equal split as today. Show a live concrete allocation preview. Disclose participant selection and unequal split controls under labeled actions, and disclose category/tags under `更多資料`. `記錄支出` applies; `取消` exits. Dirty exit asks whether to discard without saving.

### Overview and settlement

Put unresolved settlement suggestions before charts. A payment flow previews payer, recipient, date, full suggested amount by default, optional custom partial amount, note, and remaining balance. `確認記錄付款` applies; `取消` does nothing. A fully settled group shows a compact explicit state instead of an empty region. Spending charts remain available under `花費分析` with text values and summaries.

### Expense history

Keep search, sort, and a small set of common filters visible. Put date, split participant, currency, category, and tag controls behind `更多篩選`; keep active filters visible as removable chips with result count. Expense detail clearly separates view, edit, receipt, and delete. Editing shows the resulting split allocation before save. Delete confirmation names the expense and explains that balances will be recalculated.

### People

Use `分帳成員` for people included in expenses and reserve `協作者` for accounts with edit access. Used participants remain non-deletable with an actionable path to edit expenses or merge duplicates. Merge preview names source/target, counts affected records, and states that the source participant will be deleted.

### More

Present one-level task cards with current summaries:

- `分享與權限`: active links and collaborator count.
- `群組偏好`: name and base currency.
- `資料與匯出`: exports, print, backup, import, and restore.
- `換算方式`: built-in/custom rate summary.
- `群組生命週期`: active/archived state and separated danger zone.

Base-currency and custom-rate drafts preview recalculated totals, balances, and settlements before apply. CSV import previews valid/error rows and applies nothing when any row is invalid. Backup restore previews group/member/expense/payment counts and creates a new group only after confirmation. Link creation explains readonly exposure before creation. Archive explains the resulting readonly state. Group deletion requires typing the current group name.

## State Model

- **Bootstrap loading:** layout-matched skeleton without cumulative shift.
- **Group switching:** keep previous valid group visible, identify the requested group as loading, and commit selection only on success.
- **Loading failure:** retain previous group and expose retry; initial failure gets a full-page retry state.
- **No groups:** offer `建立群組` and `還原備份`.
- **One participant/no expenses:** guide to add participants before expense entry.
- **Participants/no expenses:** offer first-expense action.
- **Filtered empty:** show active filters and clear action.
- **Success:** object-local feedback plus polite announcement; no persistent layout-shifting banner.
- **Validation/server failure:** preserve draft and previous data, explain recovery, and focus the first actionable error.
- **Offline:** retain readable data, show a persistent connection state, and disable mutations with `需連線` explanation.
- **Archived:** persistent `已封存・唯讀` state; only owner sees restore.
- **Editor:** visible role where it explains unavailable owner actions.
- **Readonly share:** persistent readonly context and no mutation affordances.
- **Partial data:** explicit `沒有收據` or `使用內建固定匯率` labels rather than blank regions.

## Tech Stack

- React 19 + TypeScript + Vite.
- shadcn/ui with Base UI primitives and existing semantic green tokens.
- Tailwind CSS for new component styling; remove legacy CSS only with migrated surfaces.
- TanStack Query for remote state and mutation lifecycle.
- React Hook Form for form state.
- Lucide for structural icons; remove emoji category icons.
- Add Testing Library + user-event + jsdom for interactive component tests.
- Add Playwright Chromium + `@axe-core/playwright` for browser, responsive, and accessibility coverage.

Keep `npm run check` database-independent. Add `npm run test:e2e`; CI runs it after `npm run check` against its PostgreSQL service and a freshly seeded development server.

## Non-Goals

- No live exchange-rate provider.
- No offline creation, queueing, or synchronization.
- No delete undo without server support.
- No automatic mapping between a login account and a split participant.
- No new roles, approval workflow, payment transfer, or notification system.
- No cosmetic rebrand; retain otter's existing green identity and Traditional Chinese terminology.

## Terminology

- `群組` for a trip/gathering expense group.
- `記一筆` for the primary entry action; `新增支出` for the form; `記錄支出` for apply.
- `分帳成員` for participants.
- `協作者` for login accounts with edit access.
- `結清` for settlement.
- `預覽`, `取消`, `儲存變更`, `套用變更`, and explicit destructive labels must not be interchangeable.

## Plan

### Phase 1 — Baseline and test harness

- [x] Capture the current route, selector, API, permission, empty-state, import/export, share, archive, and receipt capability inventory in a focused compatibility test/helper; verify it against existing `views` and PostgreSQL tests before replacing UI code.
- [x] Add Testing Library, user-event, jsdom, Playwright Chromium, and `@axe-core/playwright` with `test:components` and `test:e2e` scripts; verify one interactive RHF test and one production-layout browser smoke test pass locally and in CI.
- [x] Add deterministic test fixtures for owner, editor, readonly, archived, empty, offline, import-error, and long-content states; verify fixtures reuse current API/data types without introducing schema changes.

### Phase 2 — Navigation and application state

- [x] Implement and unit-test an owned-query-parameter URL state module for `trip`, `view`, and `mode`; verify browser Back/Forward, invalid fallback, old `/`, `/share/:token`, and preservation of unknown parameters.
- [x] Replace global mutable workspace state with React state plus TanStack Query data/mutations while retaining the legacy surface as fallback; verify failed group selection preserves the prior selected group and retry succeeds.
- [x] Build the responsive global shell, group switcher/sheet, trip header, visible role/archive/offline status, four destinations, and persistent `記一筆`; verify keyboard order, mobile safe area, and no horizontal body overflow at target widths.
- [x] Implement no-group creation and restore entry points outside selected-group content; verify existing restore-without-selection behavior remains reachable.

### Phase 3 — Primary expense flow

- [x] Extract pure equal/amount/ratio/shares draft normalization and allocation preview into a shared module used by client and server; prove current rounding, validation, and API behavior remain unchanged with focused shared and DB-backed tests.
- [x] Build the RHF `ExpenseComposer` with minimal defaults, live allocation preview, participant disclosure, unequal-split disclosure, optional metadata disclosure, dirty-exit confirmation, and scoped errors; verify equal entry, each advanced split mode, cancellation, Escape/Back, retry, and failure draft preservation.
- [x] Verify preview interactions issue no mutation request, one confirmation issues exactly one request, success invalidates/refetches selected group state, and double submit is prevented.

### Phase 4 — Goal-first overview and settlement

- [x] Build the overview in the order pending settlement, balances, recent expenses, and disclosed spending analysis; verify settled, unsettled, no-expense, zero-conversion, archived, editor, and readonly variants.
- [x] Build the settlement-payment dialog with full-payment default, optional partial amount, remaining-balance preview, date, note, explicit cancel/confirm, and delete-record confirmation; verify cancel has no side effect and failures retain the prior settlement state.
- [x] Replace visual-only chart reliance with visible values and screen-reader summaries while preserving CSV/print output; verify chart data remains understandable with CSS disabled and in print mode.

### Phase 5 — Expense history and correction

- [x] Build the expense history with search, sort, common filters, disclosed advanced filters, removable active chips, result count, empty recovery, and preserved filter/scroll state; verify keyboard and Back navigation restore context.
- [x] Build expense detail/edit with allocation preview, explicit cancel/save, receipt upload/view/delete, and separated expense deletion; verify previous data remains until save succeeds and all failures are actionable.
- [x] Add long-description, long-name, many-tag, missing-receipt, 50+ expense, and same-date ordering coverage; verify no ambiguous truncation or harmful layout shift.

### Phase 6 — People, sharing, and permissions

- [x] Build the split-participant surface with add, rename, actionable disabled-delete reasons, delete confirmation, and advanced merge preview; verify used-participant protections and merge record rewrites with existing DB tests.
- [x] Build `分享與權限` for active/revoked readonly links and owner/editor collaborators; verify link-scope preview, copy feedback, revoke/remove confirmations, clipboard failure recovery, and role-specific visibility.
- [x] Verify readonly links expose expenses/balances/settlements only, archived groups remain readable, and editor users cannot reach owner mutations by keyboard, URL, or direct control rendering.

### Phase 7 — Preferences, data tools, and lifecycle

- [x] Build `群組偏好` with dirty drafts and a base-currency preview of total, balances, and settlements; verify cancel preserves the current currency and apply performs one PATCH only after confirmation.
- [x] Build `換算方式` with built-in/custom status, rate draft validation, recalculation preview, reset-to-built-in choice, and atomic apply; verify failed saves retain prior rates and preview values never enter query data.
- [x] Build `資料與匯出` preserving expense/results CSV, print, backup download, restore-without-selection, and accepted formats; verify filenames, headers, explicit splits, and backup v1 compatibility.
- [x] Add CSV and JSON file preflight previews with row/object errors and explicit apply; verify invalid import writes zero records, valid import applies once, restore creates rather than overwrites, and unknown currently accepted fields are not newly rejected.
- [x] Build lifecycle controls with archive consequence preview, owner-only restore, separated danger zone, and typed-name group deletion; verify cancellation has no side effect and deletion cannot be the default/focused action.

### Phase 8 — State, accessibility, and responsive hardening

- [x] Replace persistent top banners with object-local feedback and an accessible global announcement region; verify success does not shift layout, errors focus correctly, and announcements do not steal focus.
- [x] Standardize dialogs/sheets/confirmations so focus enters correctly, Escape cancels, outside-dismiss follows dirty-state rules, and focus returns to the trigger; verify every overlay with keyboard tests.
- [x] Audit and fix headings, landmarks, labels, descriptions, `aria-current`, readonly/disabled semantics, non-color cues, 4.5:1 text contrast, 3:1 UI contrast, 44px targets, and reduced motion; verify with axe and manual keyboard flows.
- [x] Test 320, 375, 768, 1024, and 1440px widths plus 200% text zoom, landscape, safe-area insets, long localized content, and print; assert body width never exceeds viewport and fixed navigation never obscures content.

### Phase 9 — Compatibility removal and documentation

- [x] Complete a route/selector/capability parity audit, then remove migrated HTML-string views, imperative handlers, obsolete CSS, and compatibility state without leaving any source file above 1,000 lines; verify no API or user capability disappears.
- [x] Update `README.md` and repository command guidance with the new navigation, defaults, advanced splits, preview/apply/cancel behavior, permission states, offline/archive behavior, and e2e command; verify examples match the rendered UI.
- [x] Run `npm run check`, the complete PostgreSQL-backed test suite, `npm run test:e2e`, production build, headless browser primary flows, `git diff --check`, and a final capability/acceptance audit; archive this plan only when every item is checked with evidence.

## Acceptance Criteria

### Behavior

- [x] A user can record an equal expense using only the primary fields and defaults; advanced capability remains available in labeled disclosure.
- [x] Every consequential draft has a concrete preview and preview performs no mutation.
- [x] `取消`, Escape, Back, and discard confirmation produce no server or query-cache side effects.
- [x] Apply/save performs one atomic mutation, prevents duplicate submission, and provides immediate scoped feedback.
- [x] Failure preserves previous valid data and drafts and gives a retry or correction path.
- [x] Pending settlement precedes charts, payment preview shows the remaining amount, and settled state is explicit.
- [x] All existing expense, receipt, participant, collaborator, sharing, import/export, backup, rate, archive, delete, and readonly workflows remain reachable within one navigation level.

### Responsive and accessibility

- [x] At 320–1440px and 200% zoom there is no body overflow, clipped critical state/action, unsafe fixed overlap, ambiguous truncation, or avoidable layout shift.
- [x] All controls are keyboard reachable with logical order; overlays manage and restore focus and have no traps.
- [x] Screen readers receive semantic structure, current/readonly/disabled state, errors, and polite updates; charts have textual equivalents.
- [x] Contrast, touch targets, reduced motion, print, and mobile safe areas meet the specifications above.

### Compatibility and quality

- [x] Existing PostgreSQL data requires no migration and all API/DB tests pass unchanged or with stronger assertions.
- [x] CSV, backup v1, share URLs, archived groups, permissions, receipts, currencies, rates, PWA behavior, and accepted unknown fields retain current semantics.
- [x] Node/component/browser tests cover primary flows, previews, confirmations, cancellations, navigation, failures, responsive layouts, accessibility, and compatibility.
- [x] User and contributor documentation describes final behavior and verified commands.

## Risks and Mitigations

- **Scope size:** migrate one surface at a time behind parity checks; do not remove legacy code early.
- **Client/server split divergence:** use one pure shared normalization module and retain DB-backed contract tests.
- **Progressive-disclosure discoverability:** use explicit labels and always-visible current summaries; never hide critical state/errors.
- **Preview correctness:** calculate from immutable drafts and server-equivalent shared logic; update query state only from server responses.
- **URL regressions:** preserve old routes and unknown parameters and add Back/Forward tests before navigation replacement.
- **Mobile fixed-navigation overlap:** reserve layout space and test safe areas, zoom, and landscape in real Chromium.
- **Browser-test CI cost:** keep Chromium-only e2e focused on critical workflows; leave `npm run check` usable without a database and run e2e in the PostgreSQL CI job.
- **Backup extras:** preserve current acceptance but do not promise round-trip storage for fields the database does not model; document and test the exact existing boundary.

## Verification Evidence

- `npm run check`: Biome, TypeScript, Node/component tests, and production build passed.
- PostgreSQL-backed `npm test`: 47/47 tests passed with no skips.
- `npm run test:e2e`: 12/12 Playwright Chromium tests passed, including primary apply/cancel/failure flows, preview-only settings, Back/URL state, archived/readonly/offline states, 320–1440px reflow, 200% text, long/dense content, focus management, and axe checks.
- Chrome DevTools verified the development and production bundles with one main landmark, no Vite error overlay, no legacy workspace selectors, side-effect-free expense preview/cancel, and no body overflow at 200% text.
- `git diff --check` passed and every TypeScript source file is below 1,000 lines.

## Rollback / Recovery

No schema or stored-data migration is planned. Keep each legacy surface until its React replacement passes parity, allowing a code rollback without data rollback. Do not deploy a phase that removes legacy behavior before full API, DB, and browser verification. If URL-state rollout fails, `/` must continue to select the first available group using current behavior.

## Completion Checklist

- [x] All plan and acceptance items are checked with command or test evidence.
- [x] No unresolved primary-flow, destructive-action, accessibility, responsive, or compatibility defect remains.
- [x] All required checks and database/browser suites pass from a clean worktree.
- [x] The final documentation matches production behavior.
- [x] The completed plan is moved to `docs/plans/archived/` without overwriting an existing artifact.
