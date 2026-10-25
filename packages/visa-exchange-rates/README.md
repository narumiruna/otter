# Visa card exchange rates

`@narumitw/otter-visa-exchange-rates` queries the public API used by the [Visa Taiwan calculator](https://www.visa.com.tw/support/consumer/travel-support/exchange-rate-calculator.html). This internal workspace package supplies the app's only automatic rate source. The API saves dated snapshots with 0% bank fees. Base-currency and selected-settlement-currency snapshots are separate. See [app rate rules](../../docs/visa-settlements.md).

## Use

Build shared packages with `npm run build:packages`. Use this package from server-side TypeScript:

```ts
import { fetchVisaRate } from "@narumitw/otter-visa-exchange-rates";

const result = await fetchVisaRate({ source: "JPY", target: "TWD" });
console.log(result.date, result.visaRate); // TWD for 1 JPY, without bank fees.

const conversion = await fetchVisaRate({
  source: "JPY",
  target: "TWD",
  date: "2026-07-05",
  amount: 10000,
  bankFeePercent: 1.5,
});
console.log(conversion.rate, conversion.convertedAmount);
```

- `source` is the transaction currency. `target` is the card billing currency. Codes are normalized to uppercase. Visa determines which currency pairs are supported.
- `date` uses `YYYY-MM-DD`. The default is today in `Asia/Taipei`, not the server local date. The calculator permits dates within the past year. Visa determines rate availability; unavailable dates cause an error.
- `amount` defaults to 1 and must be positive and finite.
- `bankFeePercent` defaults to 0 and must be non-negative and finite. Enter 1.5 for a 1.5% fee.
- `visaRate` excludes bank fees. `rate` includes the requested fee. Both use target currency units per source currency unit.
- `convertedAmount` is the amount returned by Visa, with its rounding. Do not apply the bank fee again.
- `fetchedAt` records the request start time in UTC. It is not the Visa rate publication time.

## Transport and limits

Requests use HTTPS GET at `https://www.visa.com.tw/cmsapi/fx/rates`. The calculator sends `fromCurr` as the billing currency and `toCurr` as the transaction currency. Both `exchangedate` and `utcConvertedDate` use `MM/DD/YYYY`.

The default transport uses `impit` with a Chrome TLS profile, as in the existing bank-rate package. Standard HTTP clients can receive a Cloudflare challenge. This does not guarantee access. The default timeout is 10 seconds. HTTP errors, invalid JSON, failed conversions, mismatched conversion fields, and invalid numeric values reject the promise. There are no automatic retries or fallback rates.

For tests or a different transport, pass `{ fetch, now, timeoutMs }` as the second argument. The custom fetch implementation must respect the supplied abort signal. `now` returns a `Date`.

This is a public website endpoint, not the authenticated Visa Developer API. It can change without notice. No API key is required by the observed endpoint. Use this package on a server; the browser can have CORS restrictions, and the default transport requires Node.js.

Visa provides an indicative rate, not a guaranteed final charge. The issuer can use a different processing date or rate and add other fees. Dynamic currency conversion can use the merchant\u0027s rate instead.

## Checks

```sh
npm run check --workspace @narumitw/otter-visa-exchange-rates
```

Tests use a captured response and mocked transport. They do not require network access.
