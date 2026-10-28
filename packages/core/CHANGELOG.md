# @narumitw/otter-core

## 0.4.1

### Patch Changes

- 81406ec: Simplify expense calculations, CSV participant lookup, group creation, passkey persistence, trip settings, participant merge cleanup, and timestamp conversion without changing existing behavior.

## 0.4.0

### Minor Changes

- d0aaab5: Use Visa as the only automatic exchange-rate source. Save dated base-currency, payment, and bridge snapshots without bank or fixed-rate fallback. Keep historical snapshots and the bank-rate workspace. Export complete version 3 backups and retain old backup readers.
  
  Deploy compatible API, Web, and CLI readers together after migrations 027 and 028. Floating legacy conversions require an approved cutover baseline; missing data stops the migration. See docs/visa-rate-cutover.md before deployment.

## 0.3.1

### Patch Changes

- 61b8ca6: Restore release tag publishing and release all workspace packages with a patch version.

## 0.3.0

### Minor Changes

- f87b31c: Add account-scoped group preferences, personal expense summaries, and copy-as-new expense forms. Personal summaries use the same exchange conversion and rounding rules as balances.

## 0.2.0

### Minor Changes

- e7f44c8: Support SGD, GBP, AUD, CAD, and KRW for group creation, expenses, and Visa settlements. Preserve currency precision and distinguish missing bank spot quotes from fixed estimates. Keep base-currency previews consistent with saved balances when quotes are missing, and update the agent-facing CLI reference. Apply migration 024 before deployment.
- a97eea8: Add optional Visa-based settlements in a user-selected currency. Save dated source-to-target rates for all expenses, round in the selected currency, preserve original amounts and base-currency snapshots, and support history and backups. Keep the option off by default.

## 0.1.1

### Patch Changes

- 75d04e7: Allow participants to settle another member's net balance through a designated representative without changing expense splits. Release the bundled CLI settlement preview with the new behavior.
- 3146193: Expose the per-group API write setting in trip payloads. API token writes are disabled by default until the group owner enables them in the browser.
