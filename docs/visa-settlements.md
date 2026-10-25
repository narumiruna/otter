# Exchange rates and Visa settlements

## Automatic rates

Visa is the only automatic rate source. The API does not request bank rate boards. `packages/exchange-rates` remains in the workspace, with its source, tests, and build commands.

Original expense amounts and currencies do not change. New automatic conversions use the expense date, with 0% bank fees. A late entry or an offline sync uses the saved expense date, not the sync date. The app supports TWD, JPY, USD, EUR, SGD, GBP, AUD, CAD, and KRW. Visa determines which dates and currency pairs are available.

Visa rates are estimates, not final card charges. An issuer can use another processing date or add fees. Cash expenses use the same rule. The app does not read card statements or processing dates.

## Base currency and settlement currency

The group base currency controls spending totals, daily and category charts, and amount sorting. New base-currency conversions use dated Visa rates unless the owner has set a manual rate. Manual changes apply to new conversion snapshots only. They do not replace saved expense rates.

The owner can enable a separate settlement currency under **Group settings → Group preferences → Visa-based settlements**. This option is off by default.

- When off, balances and settlement suggestions use the group base currency.
  - Automatic base-currency rates still come from Visa.
- When on, balances and settlement suggestions use the selected settlement currency.
  - All expenses use dated Visa rates for this target, including cash expenses.
  - Manual base-currency rates do not override this settlement rate.
  - Existing payments must use the selected currency before enabling or changing the target.

For example, a JPY group can keep JPY expense records and spending totals, then settle in TWD. Each JPY expense uses its own expense date for the JPY/TWD rate. A TWD expense needs a separate TWD/JPY rate for spending totals, but its TWD settlement rate is 1.

The switch selects the settlement rule and target. It is not a switch between bank and Visa providers.

## Saved rates and rounding

- `expense.exchangeRate` stores the base-currency conversion.
  - New Visa snapshots include the source, quote date, target, rate, and fetch time.
  - Existing bank, custom, fixed, and legacy snapshots retain their original values and labels.
- `expense.visaExchangeRate` stores the separate selected-currency Visa conversion.
  - Enabling or changing the target fetches missing rates before saving the setting.
- Reads, amount-only edits, description edits, and operation-ID replays do not fetch a replacement rate.
  - A changed expense date, source currency, or conversion target needs a matching snapshot.
  - A new or copied expense can reuse a matching Visa quote, but does not reuse another expense's old bank estimate as a new quote.
- A change to the group base currency retains the original snapshot and saves a separate conversion bridge.
  - The bridge uses the record date for the required conversion to the new base.
  - The calculation retains both rounding steps. It does not multiply the rates into one rounded conversion.
- Each expense is rounded to the target's minor units before splitting.
  - USD, EUR, SGD, GBP, AUD, and CAD use two decimal places; JPY, TWD, and KRW use whole units.
  - Explicit shares use the same saved rate. Remainders follow participant order so shares equal the converted total.
- Fetch time is not the rate publication time or the expense date.

A matching saved snapshot remains usable if Visa later becomes unavailable. The API shares concurrent rate requests by source, target, and date. It caches successful requests for 15 minutes and failed requests for 1 minute. External requests are sequential. The cache holds at most 1,024 completed entries and permits at most 64 pending requests. These limits do not expire saved record snapshots.

## Payments and failures

In base-currency mode, an other-currency payment saves a conversion for its `paidAt` date. It does not float with the next page load. In selected-currency mode, payments must use the selected currency and reduce the balance directly.

Disabling selected-currency mode can need base-currency rates for existing payments. Changing the base currency can also need conversion bridges. The API gets these rates before taking the trip lock. It checks the locked records and settings again before saving.

A missing rate, invalid response, timeout, or stale candidate does not cause a bank or fixed-rate fallback. Provider failures return HTTP 502. Invalid amounts and unsafe conversions return HTTP 400. The operation leaves settings, records, and history unchanged. A stale manual-rate form can return HTTP 409 if its expected base currency has changed.

The owner can set an explicit manual rate and retry a base-currency conversion. Selected-currency Visa settlements still need a valid Visa rate. A public calculator can stop serving old dates; an old group can therefore fail to enable or change targets.

## Rate preview and backups

**View today's Visa rates** is a read-only preview. It uses today's date in `Asia/Taipei` and shows unavailable currencies. It does not clear manual inputs, save rates to expenses, or apply one date's quote to the whole group. Opening a group, reading a share, and exporting a backup do not request current rates.

Backup version 3 preserves payment snapshots and conversion bridges as well as both expense rate snapshots. A complete version 3 backup restores without a rate-provider connection. Versions 1 and 2 remain accepted. Missing data in old formats uses saved custom rates or a labelled legacy estimate, not an invented historical Visa quote. Expense history retains the original snapshots; restoring a version only obtains missing conversions required by the current target.

## API and deployment

`PATCH /api/trips/:tripId/visa-settlement` keeps its existing input:

```json
{ "enabled": true, "currency": "TWD" }
```

Use `enabled: false` to return to base-currency settlement. The API retains the selected currency and expense Visa snapshots. Only owners can change these settings. Archived, read-only, and API-write-disabled groups retain their existing restrictions.

`GET /api/exchange-rates/:baseCurrency` returns a read-only Visa preview with `source: "VISA"`, `rateType: "visa"`, `date`, `fetchedAt`, `rates`, and `unavailableCurrencies`. Group `exchangeRateInfo.source` is `visa`, or `custom` with a `visa` default policy. It does not claim a single quote date for all expenses. First-party readers still accept historical bank metadata.

Migrations 027 and 028 must complete before the new API serves requests. Floating legacy payments and conversions can require an approved cutover baseline. Do not deploy over a missing baseline. See [Visa rate cutover](visa-rate-cutover.md) for migration, compatibility, verification, and recovery steps.
