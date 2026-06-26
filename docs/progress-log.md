# Progress Log

## Completed cycles

- 2026-06-25: PostgreSQL persistence and migrations; pushed `f1d2254`.
- 2026-06-25: Delete expenses; pushed `9a2ee9c`.
- 2026-06-25: Delete trips; pushed `7c26d7a`.
- 2026-06-25: Rename trips; pushed `a14ad78`.
- 2026-06-25: Rename participants; pushed `3761951`.
- 2026-06-25: Delete unused participants; pushed `19638e6`.
- 2026-06-25: Confirm destructive expense deletion; verification passed (`npm run check`, dev compose `/api/me` smoke).
- 2026-06-25: Edit expense descriptions; verification passed (`TEST_DATABASE_URL=... npm test`, `npm run check`, dev compose `/api/me` smoke).
- 2026-06-25: Edit expense amounts; verification passed (`TEST_DATABASE_URL=... npm test`, `npm run check`, dev compose `/api/me` smoke).
- 2026-06-25: Edit expense payer; verification passed (`TEST_DATABASE_URL=... npm test`, `npm run check`, dev compose `/api/me` smoke).
- 2026-06-25: Edit expense split participants; verification passed (`TEST_DATABASE_URL=... npm test`, `npm run check`, dev compose `/api/me` smoke).
- 2026-06-25: Add expense dates; verification passed (`DATABASE_URL=... npm run migrate`, `TEST_DATABASE_URL=... npm test`, `npm run check`, dev compose `/api/me` smoke).
- 2026-06-25: Add CSV expense export; verification passed (`npm test`, `npm run check`, dev compose `/api/me` smoke).
- 2026-06-25: Edit expense dates; verification passed (`TEST_DATABASE_URL=... npm test`, `npm run check`, dev compose `/api/me` smoke).
- 2026-06-25: Export balances and settlements CSV; verification passed (`npm test`, `npm run check`, dev compose `/api/me` smoke).
- 2026-06-25: Split DB integration tests; verification passed (`TEST_DATABASE_URL=... npm test`, `npm run check`, dev compose `/api/me` smoke).
- 2026-06-25: Split oversized server module; verification passed (`TEST_DATABASE_URL=... npm test`, `npm run check`, dev compose `/api/me` smoke).
- 2026-06-25: Edit expense currencies; verification passed (`TEST_DATABASE_URL=... npm test`, `npm run check`, dev compose `/api/me` smoke).
- 2026-06-25: Prevent duplicate participant names; verification passed (`TEST_DATABASE_URL=... npm test`, `npm run check`, dev compose `/api/me` smoke).
- 2026-06-25: Prevent duplicate trip names; verification passed (`TEST_DATABASE_URL=... npm test`, `npm run check`, dev compose `/api/me` smoke).
- 2026-06-25: Edit trip base currency; verification passed (`TEST_DATABASE_URL=... npm test`, `npm run check`, dev compose `/api/me` smoke).
- 2026-06-25: Secure production session cookies by default; verification passed (`TEST_DATABASE_URL=... npm test`, `npm run check`, dev compose `/api/me` smoke).
- 2026-06-25: Split client UI support helpers; verification passed (`npm run check`, dev compose `/api/me` smoke).
- 2026-06-25: Add print-friendly trip view styles; verification passed (`npm run check`, dev compose `/api/me` smoke).
- 2026-06-25: Run DB-backed API tests in CI; verification passed (`TEST_DATABASE_URL=... npm run check`, dev compose `/api/me` smoke).
- 2026-06-25: Return 400 for malformed JSON bodies; verification passed (`TEST_DATABASE_URL=... npm run check`, `npm run check`, dev compose `/api/me` smoke).
- 2026-06-25: Return 413 for oversized JSON bodies; verification passed (`TEST_DATABASE_URL=... npm run check`, `npm run check`, dev compose `/api/me` smoke).
- 2026-06-25: Reject invalid split participant IDs on expense create; verification passed (`TEST_DATABASE_URL=... npm run check`, `npm run check`, dev compose `/api/me` smoke).
- 2026-06-25: Reject invalid trip base currency on create; verification passed (`TEST_DATABASE_URL=... npm run check`, `npm run check`, dev compose `/api/me` smoke).
- 2026-06-25: Disable impossible participant deletes in UI; verification passed (`TEST_DATABASE_URL=... npm run check`, `npm run check`, dev compose `/api/me` smoke).
- 2026-06-25: Show all-person splits as `所有人`; verification passed (`TEST_DATABASE_URL=... npm run check`, `npm run check`, dev compose `/api/me` smoke).
- 2026-06-25: Add split select/clear shortcuts; verification passed (`TEST_DATABASE_URL=... npm run check`, `npm run check`, dev compose `/api/me` smoke).
- 2026-06-25: Show client-side empty split feedback; verification passed (`TEST_DATABASE_URL=... npm run check`, `npm run check`, dev compose `/api/me` smoke).
- 2026-06-25: Add selected split count; verification passed (`TEST_DATABASE_URL=... npm run check`, `npm run check`, dev compose `/api/me` smoke).
- 2026-06-25: Add accessible live regions for feedback; verification passed (`npm run check`, dev compose `/api/me` smoke).
- 2026-06-25: Add visible print action; verification passed (`npm run check`, dev compose `/api/me` smoke).

## Current PM candidate ranking

| Rank | Candidate | User impact | Correctness | Reliability | Dev speed | Maintainability | Verification clarity | Effort | Risk | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Add visible print action | Medium | Low | High | High | High | High | Low | Low | Completed this cycle: makes the existing print-friendly view discoverable with minimal client-only code. |
| 2 | Split client UI before more features | Low | Low | High | Medium | High | High | Medium | Low | Later: main client file is 931 lines but still below the 1,000-line guard. |
| 3 | Add participant merge flow | Medium | High | Medium | Low | Medium | Low | High | High | Later: risky because it rewrites expense ownership. |
| 4 | Add trip archive flag | Low | Low | Medium | Medium | High | Medium | Medium | Low | Later: housekeeping after core correction flows. |
| 5 | Add recurring expense templates | Medium | Medium | Medium | Low | Medium | Low | High | Medium | Later: speculative until repeated-entry pain is clear. |
