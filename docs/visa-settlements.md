# Visa-based settlements

## Choose a settlement currency

The group owner can choose **Settlement currency** under **Group settings → Group preferences → Visa-based settlements**. The selector offers the app's supported currencies: TWD, JPY, USD, and EUR. It initially uses the group base currency if no selection has been saved.

Visa mode is off by default. Choose a currency and enable the option to convert every expense, including cash expenses, with a dated Visa rate. The group keeps its base currency and all original expense amounts. For example, a JPY group can settle in TWD, USD, or EUR.

Balances, settlement suggestions, and new settlement payments use the selected currency when enabled. The spending summary still uses the group base currency. Expense details show the saved Visa rate, date, and converted amount.

Visa rates are indicative. The issuer can use a different processing date or add fees. This option uses 0% bank fees. Set the expense date to the card transaction date if you want that date's indicative rate. The feature does not read card statements or processing dates.

## Saved rates and rounding

- Enabling fetches missing dated rates for existing expenses before changing the setting.
- Each expense stores a separate `visaExchangeRate` snapshot: source currency, target currency, date, rate, and fetch time. The existing `exchangeRate` snapshot remains unchanged.
- Reads do not query Visa or change saved Visa rates. Unrelated edits and amount-only edits keep the saved rate. Date or source currency changes require a matching quote.
- Rates are reused only for the same source currency, target currency, and date. When source and target are identical, the rate is 1 and Visa is not queried.
- Each expense is converted and rounded to the selected currency's minor units before splitting. USD and EUR use cents; JPY and TWD use whole units. Explicit shares use the same saved rate. Rounding differences are allocated so the split total equals the converted expense total.
- Missing rates cause an error. There is no bank-rate or fixed-rate fallback in Visa settlement calculations.

The public calculator limits date and currency-pair availability. An old trip can fail to enable if its rates are no longer available. Saved snapshots remain usable if the calculator later becomes unavailable.

## Change the currency or disable the option

Select another currency and use **Apply changes**. If Visa mode is enabled, the API obtains matching rates and replaces the snapshots in one transaction. It does not reuse snapshots for a different target currency. If a rate request or validation fails, the existing setting and snapshots stay unchanged.

Existing payment records must use the selected currency before enabling or changing targets. While enabled, the API defaults new payments to that currency and rejects payments in other currencies. Payments reduce balances directly, without a second exchange conversion.

Disabling restores the existing base-currency calculation. The selected currency and Visa snapshots are retained for re-enabling. Payment records stay unchanged and use the existing base-currency conversion when the option is off. An expense date or currency edit while off removes a stale Visa snapshot.

## API and persistence

`PATCH /api/trips/:tripId/visa-settlement` accepts:

```json
{ "enabled": true, "currency": "USD" }
```

Use `enabled: false` to disable. The currency can be saved while the option is off. If omitted, the API uses the previously selected currency or the group base currency. Unsupported currencies are rejected.

Only owners can change the setting. Archived and read-only groups cannot change it. API tokens remain subject to the group's API write permission.

Run `npm run migrate` before deploying the updated API. Migration `023_visa_settlement.sql` adds a default-false Visa mode, an optional selected currency, and nullable target-aware expense snapshots. Existing amounts, exchange-rate snapshots, payment records, and history remain unchanged.

Backup export and restore preserve the setting, selected currency, and snapshots. Expense history records snapshot changes. A restored expense version uses a snapshot that matches the current target, rather than reverting the group to its historical target. CSV imports fetch required quotes before their transaction. Group copies preserve the setting and selected currency but do not copy expenses.

The API uses `@narumitw/otter-visa-exchange-rates`. It finishes rate requests before taking trip row locks and checks the locked data again before saving. Concurrent changes that introduce an unprepared pair or date cause an error without partial changes. Retry with the current group data.
