# @narumitw/otter-api

## 0.3.0

### Minor Changes

- c0f8fe9: Add an authenticated Streamable HTTP MCP endpoint with expense tools and preserve existing API permissions. Forward local MCP requests through the Vite proxy.
- 1a6baf9: Add pi-ai provider connections and account-level model and thinking settings. Select the authentication method before searching providers. Store provider credentials with server-side encryption and keep AI inference out of scope.
  
  Keep new OpenAI connections on API-key authentication and use device authorization only for OpenAI Codex account sign-in. Reject fixed-port OpenAI OAuth before starting the SDK. Keep existing credentials and model preferences unchanged.

### Patch Changes

- Updated dependencies [1a6baf9]
  - @narumitw/otter-contracts@0.3.0

## 0.2.2

### Patch Changes

- 61b8ca6: Restore release tag publishing and release all workspace packages with a patch version.
- Updated dependencies [61b8ca6]
  - @narumitw/otter-core@0.3.1
  - @narumitw/otter-contracts@0.2.2
  - @narumitw/otter-exchange-rates@0.1.1
  - @narumitw/otter-visa-exchange-rates@0.2.1

## 0.2.1

### Patch Changes

- Updated dependencies [f87b31c]
  - @narumitw/otter-core@0.3.0
  - @narumitw/otter-contracts@0.2.1

## 0.2.0

### Minor Changes

- e7f44c8: Support SGD, GBP, AUD, CAD, and KRW for group creation, expenses, and Visa settlements. Preserve currency precision and distinguish missing bank spot quotes from fixed estimates. Keep base-currency previews consistent with saved balances when quotes are missing, and update the agent-facing CLI reference. Apply migration 024 before deployment.
- a97eea8: Add optional Visa-based settlements in a user-selected currency. Save dated source-to-target rates for all expenses, round in the selected currency, preserve original amounts and base-currency snapshots, and support history and backups. Keep the option off by default.

### Patch Changes

- Updated dependencies [e7f44c8]
- Updated dependencies [109b3ce]
- Updated dependencies [a97eea8]
  - @narumitw/otter-core@0.2.0
  - @narumitw/otter-contracts@0.2.0
  - @narumitw/otter-visa-exchange-rates@0.2.0

## 0.1.2

### Patch Changes

- dd29121: Allow selecting or taking a receipt photo while creating an expense, and return the created expense ID for safe attachment and retry.
- Updated dependencies [dd29121]
  - @narumitw/otter-contracts@0.1.2

## 0.1.1

### Patch Changes

- 4cd3500: Allow group owners to duplicate participants and currency preferences into a new empty group.
- 5144017: Queue new expenses on an already-loaded offline workspace and safely replay them once online using durable, user-scoped operation receipts.
- Updated dependencies [75d04e7]
- Updated dependencies [3146193]
- Updated dependencies [5144017]
  - @narumitw/otter-core@0.1.1
  - @narumitw/otter-contracts@0.1.1
