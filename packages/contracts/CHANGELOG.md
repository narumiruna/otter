# @narumitw/otter-contracts

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
