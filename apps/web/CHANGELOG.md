# @narumitw/otter-web

## 0.2.1

### Patch Changes

- 5144017: Queue new expenses on an already-loaded offline workspace and safely replay them once online using durable, user-scoped operation receipts.
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
