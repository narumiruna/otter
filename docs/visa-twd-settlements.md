# Visa TWD settlements

## Enable the option

The group owner can enable **Visa TWD settlements** under **Group settings → Group preferences**. The option is off by default. It applies to every expense, including cash expenses. The group keeps its base currency and all original expense amounts.

When enabled, each expense uses a Visa rate for its expense date to convert its original amount directly to TWD. Balances and settlement suggestions use TWD. The spending summary still uses the group base currency. The expense rate details show the saved Visa rate, its date, and the TWD amount.

Visa rates are indicative. The issuer can use a different processing date or add fees. This option uses 0% bank fees. Set the expense date to the card transaction date if you want that date\u0027s indicative rate. The feature does not read card statements or payment processing dates.

## Saved rates and rounding

- Enabling fetches any missing dated rates for existing expenses before changing the setting. No setting or expense snapshot is changed if a required rate is unavailable.
- Each expense stores a separate `visaExchangeRate` snapshot: source currency, date, rate to TWD, and fetch time. The existing `exchangeRate` snapshot remains unchanged.
- Reads do not query Visa or update saved Visa rates. Unrelated edits and amount-only edits keep the saved rate. Date or currency changes require a matching dated rate.
- Rates are reused for the same currency and date within the group. TWD expenses use an identity rate of 1 and do not query Visa.
- Each expense is converted and rounded to whole TWD before splitting. Explicit shares use the same saved rate. Rounding differences are allocated so the split total equals the converted expense total.
- Missing or unavailable Visa rates cause an error. There is no bank-rate or fixed-rate fallback in Visa settlement calculations.

The public calculator limits date availability. Old trips can fail to enable if their rates are no longer available. Saved snapshots remain usable even if the public calculator later becomes unavailable.

## Payments and disabling

When enabled, settlement payments must use TWD. The API defaults new payments to TWD. A group with existing non-TWD payment records cannot enable this option; remove those records first if appropriate. TWD payments reduce the TWD balance directly, without a second exchange conversion.

Disabling restores the existing base-currency calculation. Saved Visa snapshots remain available for re-enabling. TWD payment records remain unchanged and use the existing base-currency payment conversion when the option is off. Editing an expense date or currency while off removes a stale Visa snapshot.

## API and persistence

`PATCH /api/trips/:tripId/visa-settlement` accepts `{ "enabled": true }` or `{ "enabled": false }`. Only owners can change the setting. Archived and read-only groups cannot change it. API tokens remain subject to the group\u0027s API write permission.

Run `npm run migrate` before deploying the updated API. Migration `023_visa_settlement.sql` adds a default-false group setting and nullable expense snapshots. Backup export and restore preserve the setting and saved snapshots. Expense history records snapshot changes, and restoring an expense version retains its dated Visa snapshot when present. CSV imports fetch required dated rates before the transaction. Group copies preserve the setting but do not copy expenses.

The API uses `@narumitw/otter-visa-exchange-rates`. It finishes Visa requests before taking trip row locks and checks the locked data again before saving. If concurrent edits introduce a date that was not prefetched, the operation fails without partial snapshot changes. Retry with the current group data.
