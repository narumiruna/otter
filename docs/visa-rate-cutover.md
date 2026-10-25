# Visa rate cutover

This change makes Visa the only automatic rate source. It keeps bank code in `packages/exchange-rates`, but removes bank calls from the application. Authentication, cookie settings, permissions, and database connection settings do not change. No provider-selection environment variable or feature flag is added.

Do not run these steps against production without an approved maintenance window and a tested database backup. A local fixture test is not evidence for a production-data rehearsal.

## Compatibility boundary

- New expense base snapshots use `source: "visa"`, `provider: "VISA"`, `rateType: "visa"`, `date`, and `fetchedAt`.
- Expenses can also have an `exchangeRateBridge`. Payments can have `exchangeRate` and `exchangeRateBridge`.
- Old bank, custom, fixed, and legacy expense snapshots remain unchanged. Stored revisions are not rewritten.
- Backup exports use version 3. Imports continue to accept versions 1 and 2, with explicit legacy estimates for missing conversion data.
- The preview endpoint now returns Visa metadata and an explicit list of unavailable currencies. It is not a bank rate board.
- The API, Web client, and bundled CLI must use readers that understand the new formats.
  - Ask users to reload open browser clients and update the CLI.
  - Do not run old API writers beside the new API after cutover.

## Identify records that need a baseline

Before switching writers, run this read-only query on an isolated database copy. It also works before migration 027:

```sql
SELECT DISTINCT t.id AS trip_id, t.base_currency,
  CASE WHEN e.exchange_rate IS NULL THEN e.currency
    ELSE e.exchange_rate->>'baseCurrency' END AS source_currency
FROM expenses e JOIN trips t ON t.id = e.trip_id
WHERE (e.exchange_rate IS NULL AND e.currency <> t.base_currency)
   OR e.exchange_rate->>'baseCurrency' <> t.base_currency
UNION
SELECT DISTINCT t.id, t.base_currency, p.currency
FROM settlement_payments p JOIN trips t ON t.id = p.trip_id
WHERE NOT t.visa_settlement_enabled AND p.currency <> t.base_currency
ORDER BY trip_id, source_currency;
```

These records had a floating conversion in the old app. There is no unique historical rate to recover from their data alone. Existing payments in selected-currency mode can remain without a base snapshot until that mode is disabled. Disabling then needs the payment-date rate before it can commit.

An existing explicit custom rate can supply a cutover value for the required pair. Other records need an approved baseline. Missing values stop migration 028. The migration does not query Visa, a bank, or an internal fixed table.

## Capture and approve the baseline

1. On the isolated copy, capture the previous release's group payloads and effective conversion values at one stated time.
   - Use credentials with access to those groups. Keep the records and rate inputs fixed for the comparison.
   - Store financial data and backups outside the repository. Do not commit payloads, baseline files, credentials, or database dumps.
2. For each required source currency, record the rate to that group's current base currency.
   - The base currency has rate 1. These are direct source-to-base rates, not mixed rates to another currency.
   - When both values existed in the old response's rate map, its conversion used `sourceRate / targetRate`.
   - When either value was missing, the old calculation used the legacy fixed table for both currencies. Do not fill one missing rate with a fixed value and combine it with a current bank quote.
   - Keep the original expense-to-old-base snapshot. Capture only the missing old-base-to-current-base bridge for that expense. This preserves both rounding steps.
3. Compare spending totals, balances, settlement suggestions, original amounts, and revision fingerprints before and after the isolated cutover.
   - The floating portion becomes fixed at this approved baseline. It is labelled `legacy`, not Visa.
   - Investigate every difference. Do not approve a new estimate as if it were a saved historical quote.
4. Obtain the data owner's or deployment operator's approval for the baseline and any accepted difference before the production maintenance window.

The importer accepts a JSON array. This synthetic example is not a market quote:

```json
[
  {
    "tripId": "trip_example",
    "baseCurrency": "JPY",
    "rates": { "JPY": 1, "TWD": 5, "USD": 160 },
    "capturedAt": "2026-10-25T00:00:00.000Z"
  }
]
```

The file must contain finite positive rates and valid app currency codes. Duplicate trip IDs are rejected. `capturedAt` records the cutover capture time, not the expense date. The importer checks the group's base currency while holding its row lock. A changed base or missing trip rolls back the whole import.

## Apply the cutover

1. Complete the isolated rehearsal and backup-restore test. Record approval and the before/after comparison.
2. Stop all old API writers. Capture the approved baseline before stopping the old readers that supplied it. Keep writes stopped until verification is complete.
3. Set `DATABASE_URL` to the intended database and run `npm run migrate`.
   - Migration 027 adds the compatible schema, guards, and `rate_cutover_baselines` table.
   - Migration 028 locks the financial tables before it checks or freezes values. A 10-second lock-wait timeout stops a busy cutover instead of waiting without a limit.
   - It commits only if the required conversion values exist. Its failure leaves 027 applied and stops startup before the new API serves requests.
4. If 028 reports a missing baseline, import the approved file from outside the repository:

   ```sh
   npm exec --workspace @narumitw/otter-api -- tsx scripts/import-rate-baseline.ts /approved/path/rate-baselines.json
   npm run migrate
   ```

   - The importer takes the migration advisory lock and locks trip rows in ID order.
   - It cannot change the approved baseline after 028 has completed.
   - Do not bypass the failure with a constraint change, a guessed rate, or a fabricated migration record.
5. Deploy the compatible API and Web build, and provide the updated CLI. Do not use an old reader for new Visa records.
6. Before resuming writes, compare the fixed cutover amounts, bank snapshot JSON, original amounts, and stored revisions with the approved baseline.
7. Resume writes only after the comparison passes. Confirm that new automatic snapshots use Visa and that no application request calls a bank endpoint.

## Verification

From the repository root, on disposable databases:

```sh
npm run check
npm run test:components
npm run migrate
npm test
npm run test:e2e -- --workers=1
```

Use a fresh isolated database for each full browser run. Set `DATABASE_URL` before the database-backed commands. Chromium must be installed. Do not treat skipped database tests as a pass.

- `server.visa-rate-cutover.test.ts` verifies the missing-baseline stop, approved import, unchanged history, fixed balances, SQL guards, and migration reruns.
- `server.expense-exchange-rate.test.ts` verifies dated base snapshots, manual overrides, history, bridges, backup versions, provider failures, and unsafe conversions.
- `server-trip-mutation.test.ts` verifies that slow Visa requests hold no trip lock and cannot overwrite a concurrent edit.
- `visa-rates-persistence.spec.ts` uses the real API and PostgreSQL at desktop and phone widths. It tests two JPY dates, a TWD expense, TWD settlement and payment, reload persistence, and an unavailable date.
  - `apps/api/scripts/serve-e2e.ts` injects only the external Visa transport. No browser route replaces the API or database.
  - This server is for tests only. Its fixture values are not Visa market quotes.
- The other browser suites retain their interface, localization, responsive layout, and accessibility checks.

The public Visa endpoint can change or reject a pair or date. A small manual live check can verify current access, but cannot prove all dates will remain available. CI uses mocked transport and captured responses. Production-data approval remains a separate deployment requirement.

## Recovery

- If a migration fails, keep writers stopped and inspect the exact failure. Each migration runs in its own transaction.
  - A missing baseline does not modify current financial records in 028. Supply the approved data, then rerun.
- Before any new-format write, the previous application can be restored only after checking compatibility with the expanded schema.
- After a new Visa, payment, or bridge snapshot has been written, do not directly start an old API or CLI that rejects it.
  - Stop affected writes and deploy a compatible correction. Keep saved rates and history intact.
  - Do not silently switch to banks or fixed estimates during an outage. Reads and complete backups can still use saved snapshots.
- Restoring the pre-cutover database backup needs explicit approval of the lost writes and outage window. Rehearse this operation before deployment.
- Keeping `packages/exchange-rates` is not a rollback procedure. Data-format compatibility determines which application can safely read the database.
