# @narumitw/otter-contracts

## 0.2.1

### Patch Changes

- Updated dependencies [f87b31c]
  - @narumitw/otter-core@0.3.0

## 0.2.0

### Minor Changes

- e7f44c8: Support SGD, GBP, AUD, CAD, and KRW for group creation, expenses, and Visa settlements. Preserve currency precision and distinguish missing bank spot quotes from fixed estimates. Keep base-currency previews consistent with saved balances when quotes are missing, and update the agent-facing CLI reference. Apply migration 024 before deployment.
- a97eea8: Add optional Visa-based settlements in a user-selected currency. Save dated source-to-target rates for all expenses, round in the selected currency, preserve original amounts and base-currency snapshots, and support history and backups. Keep the option off by default.

### Patch Changes

- Updated dependencies [e7f44c8]
- Updated dependencies [a97eea8]
  - @narumitw/otter-core@0.2.0

## 0.1.2

### Patch Changes

- dd29121: Allow selecting or taking a receipt photo while creating an expense, and return the created expense ID for safe attachment and retry.

## 0.1.1

### Patch Changes

- 75d04e7: Allow participants to settle another member's net balance through a designated representative without changing expense splits. Release the bundled CLI settlement preview with the new behavior.
- 3146193: Expose the per-group API write setting in trip payloads. API token writes are disabled by default until the group owner enables them in the browser.
- 5144017: Queue new expenses on an already-loaded offline workspace and safely replay them once online using durable, user-scoped operation receipts.
- Updated dependencies [75d04e7]
- Updated dependencies [3146193]
  - @narumitw/otter-core@0.1.1
