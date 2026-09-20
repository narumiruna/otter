# Otter HTTP contracts

This private workspace owns transport types shared by the browser, API tests, and CLI. It depends on domain models from `@narumitw/otter-core`; it does not own UI state, database rows, sessions, or Hono internals.

## Contract inventory

| API area | Contract owner |
| --- | --- |
| Configuration and authentication | `User`, `UserResponse`, `ApiErrorResponse`, `OkResponse` |
| API tokens | `ApiToken`, `ApiTokensResponse`, `CreateApiTokenResponse` |
| Trip collections and details | `TripSummary`, `TripsResponse`, `TripPayload`, `TripRole` |
| Collaboration and share links | `TripCollaborator`, `TripShareLink` inside `TripPayload` |
| Expense writes | `CreateExpenseRequest`, `UpdateExpenseRequest`; expense results use `TripPayload` |
| Settlement payments | `CreateSettlementPaymentRequest`; results use `TripPayload` |
| Device authorization | `DeviceAuthorization`, `DeviceInspection`, `DeviceTokenResponse` |
| Backup and CSV import | backup data is a core domain format; restore/import success uses `TripPayload`, failures use `ApiErrorResponse` |
| Receipts | upload/delete success uses `TripPayload`; receipt download is a binary response |
| Passkeys | ceremony option types remain with SimpleWebAuthn at their browser/API boundary; common success and error envelopes use `OkResponse` and `ApiErrorResponse` |

`parseTripPayload` is the runtime guard for saved or remote trip JSON used by local CLI calculations. API validation remains authoritative when requests reach the server.
