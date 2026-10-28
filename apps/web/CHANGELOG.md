# @narumitw/otter-web

## 0.7.2

### Patch Changes

- ce649ff: Show the web package version as small, muted text beside the app name.

## 0.7.1

### Patch Changes

- 81406ec: Simplify expense calculations, CSV participant lookup, group creation, passkey persistence, trip settings, participant merge cleanup, and timestamp conversion without changing existing behavior.
- Updated dependencies [81406ec]
  - @narumitw/otter-core@0.4.1
  - @narumitw/otter-contracts@0.4.1

## 0.7.0

### Minor Changes

- d0aaab5: Use Visa as the only automatic exchange-rate source. Save dated base-currency, payment, and bridge snapshots without bank or fixed-rate fallback. Keep historical snapshots and the bank-rate workspace. Export complete version 3 backups and retain old backup readers.
  
  Deploy compatible API, Web, and CLI readers together after migrations 027 and 028. Floating legacy conversions require an approved cutover baseline; missing data stops the migration. See docs/visa-rate-cutover.md before deployment.

### Patch Changes

- Updated dependencies [d0aaab5]
  - @narumitw/otter-core@0.4.0
  - @narumitw/otter-contracts@0.4.0

## 0.6.0

### Minor Changes

- 1a6baf9: Add pi-ai provider connections and account-level model and thinking settings. Select the authentication method before searching providers. Store provider credentials with server-side encryption and keep AI inference out of scope.
  
  Keep new OpenAI connections on API-key authentication and use device authorization only for OpenAI Codex account sign-in. Reject fixed-port OpenAI OAuth before starting the SDK. Keep existing credentials and model preferences unchanged.

### Patch Changes

- c0f8fe9: Add an authenticated Streamable HTTP MCP endpoint with expense tools and preserve existing API permissions. Forward local MCP requests through the Vite proxy.
- Updated dependencies [1a6baf9]
  - @narumitw/otter-contracts@0.3.0

## 0.5.1

### Patch Changes

- 61b8ca6: Restore release tag publishing and release all workspace packages with a patch version.
- Updated dependencies [61b8ca6]
  - @narumitw/otter-core@0.3.1
  - @narumitw/otter-contracts@0.2.2

## 0.5.0

### Minor Changes

- 60a040e: Add Hindi, Spanish, French, Portuguese, Indonesian, German, Vietnamese, Turkish, Filipino, Thai, Italian, Polish, Malay, and Dutch browser UI catalogs. Match regional browser preferences and the Filipino `tl` alias, apply locale-specific plural rules, and keep the language menu compact and scrollable.

### Patch Changes

- d9005ed: Ignore queue refresh results and sync errors after workspace effect cleanup. This prevents state updates after unmount and stale results after changing accounts or groups.
- 0dcb9c7: Move spending analysis to its own group page between Expenses and People. Keep the existing charts, currency conversion, and member accounts. Preserve analysis in public read-only shares and move the mobile add-expense action above the five-page navigation bar.
- 35a47a5: Move language choices into a separate dialog so sign out stays visible in the account menu. Keep the current language in view and return keyboard focus to the account button when the dialog closes.

## 0.4.0

### Minor Changes

- f87b31c: Add account-scoped group preferences, personal expense summaries, and copy-as-new expense forms. Personal summaries use the same exchange conversion and rounding rules as balances.

### Patch Changes

- Updated dependencies [f87b31c]
  - @narumitw/otter-core@0.3.0
  - @narumitw/otter-contracts@0.2.1

## 0.3.0

### Minor Changes

- e7f44c8: Support SGD, GBP, AUD, CAD, and KRW for group creation, expenses, and Visa settlements. Preserve currency precision and distinguish missing bank spot quotes from fixed estimates. Keep base-currency previews consistent with saved balances when quotes are missing, and update the agent-facing CLI reference. Apply migration 024 before deployment.
- c15fa30: Add Japanese and Korean interface translations, language selection, browser language detection, and localized exchange-rate details.
- a97eea8: Add optional Visa-based settlements in a user-selected currency. Save dated source-to-target rates for all expenses, round in the selected currency, preserve original amounts and base-currency snapshots, and support history and backups. Keep the option off by default.

### Patch Changes

- Updated dependencies [e7f44c8]
- Updated dependencies [a97eea8]
  - @narumitw/otter-core@0.2.0
  - @narumitw/otter-contracts@0.2.0

## 0.2.2

### Patch Changes

- dd29121: Allow selecting or taking a receipt photo while creating an expense, and return the created expense ID for safe attachment and retry.
- 42121a0: Refresh the trip list as soon as an expense is created, even if its receipt upload fails.
- Updated dependencies [dd29121]
  - @narumitw/otter-contracts@0.1.2

## 0.2.1

### Patch Changes

- bd17360: Open expense editing from recent expenses on the overview and from any non-action cell in the expenses table.
- 4cd3500: Allow group owners to duplicate participants and currency preferences into a new empty group.
- 5144017: Queue new expenses on an already-loaded offline workspace and safely replay them once online using durable, user-scoped operation receipts.
- Updated dependencies [75d04e7]
- Updated dependencies [3146193]
- Updated dependencies [5144017]
  - @narumitw/otter-core@0.1.1
  - @narumitw/otter-contracts@0.1.1

## 0.2.0

### Minor Changes

- 0a88f74: Allow creating a passwordless account with a username and passkey.

### Patch Changes

- ce6fd82: Translate username in Traditional Chinese and allow language selection on the sign-in screen.

## 0.1.3

### Patch Changes

- 048218f: Correct the WebMCP demo's TWD amount display and enforce Chinese document language on the public demo route.
- 7f8d680: Add a public, API-independent WebMCP demo page with fixed sample balances and settlements for browser assistant testing.

## 0.1.2

### Patch Changes

- ebef10c: Add experimental read-only WebMCP tools for the selected group's balances and settlement suggestions.

## 0.1.1

### Patch Changes

- 7874d97: Handle malformed group deletion responses without exposing raw JSON parser errors.
