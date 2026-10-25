# @narumitw/otter-cli

## 0.5.0

### Minor Changes

- d0aaab5: Use Visa as the only automatic exchange-rate source. Save dated base-currency, payment, and bridge snapshots without bank or fixed-rate fallback. Keep historical snapshots and the bank-rate workspace. Export complete version 3 backups and retain old backup readers.
  
  Deploy compatible API, Web, and CLI readers together after migrations 027 and 028. Floating legacy conversions require an approved cutover baseline; missing data stops the migration. See docs/visa-rate-cutover.md before deployment.

## 0.4.1

### Patch Changes

- 61b8ca6: Restore release tag publishing and release all workspace packages with a patch version.

## 0.4.0

### Minor Changes

- e7f44c8: Support SGD, GBP, AUD, CAD, and KRW for group creation, expenses, and Visa settlements. Preserve currency precision and distinguish missing bank spot quotes from fixed estimates. Keep base-currency previews consistent with saved balances when quotes are missing, and update the agent-facing CLI reference. Apply migration 024 before deployment.

## 0.3.1

### Patch Changes

- 75d04e7: Allow participants to settle another member's net balance through a designated representative without changing expense splits. Release the bundled CLI settlement preview with the new behavior.

## 0.3.0

### Minor Changes

- 314d15c: Add conditional JPEG, PNG, and WebP receipt uploads from local files.

## 0.2.0

### Minor Changes

- 22931ca: Breaking change: `expenses update` and `expenses delete` now require `--version` from the expense returned by `expenses list` or `trips get`. The CLI sends that version in `If-Match`; deletion still requires `--yes`.

  Stale writes fail with HTTP 412 and JSON code `EXPENSE_VERSION_CONFLICT`, without fetching a newer version or retrying. Reread and review intervening changes before submitting again. Coordinate the CLI/API upgrade: older clients without the header receive HTTP 428. Legacy versionless trip JSON remains supported for offline settlement previews.

## 0.1.1

### Patch Changes

- 93a17ee: Support trip payloads calculated with automatic Bank of Taiwan exchange rates.
