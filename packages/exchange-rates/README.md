# `@narumitw/otter-exchange-rates`

Typed Taiwanese-bank exchange-rate fetching for Otter. The package follows the normalized model used by `/home/narumi/src/twrate`.

## Sources and semantics

- Default source: Bank of Taiwan (`BANK_OF_TAIWAN`) official text rate board.
- Additional source: SinoPac Bank (`BANK_SINOPAC`) public exchange-rate endpoint.
- Target currency: TWD.
- Normalized values: spot buy/sell and optional cash buy/sell.
- Otter default conversion: midpoint of Bank of Taiwan's spot buy and sell prices.
- Missing, zero, malformed, non-finite, and anti-bot responses are never exposed as valid rates.

Bank of Taiwan serves an anti-bot challenge to ordinary Node HTTP clients. The package uses `impit` with a Chrome TLS fingerprint, matching the browser impersonation approach used by the Python `twrate` package. Prebuilt `impit` binaries support both glibc and Alpine/musl Linux containers.

## API

```ts
import {
  createCachedRateFetcher,
  fetchRates,
  spotMid,
} from "@narumitw/otter-exchange-rates";

const fetchCachedRates = createCachedRateFetcher(() => fetchRates());
const rates = await fetchCachedRates(); // Bank of Taiwan by default
const usd = rates.find((rate) => rate.source === "USD");
const usdToTwd = usd ? spotMid(usd) : undefined;
```

Bank requests use a 10-second timeout. `createCachedRateFetcher` coalesces concurrent requests, caches successful results for 15 minutes, and backs off for 1 minute after a failed request.
