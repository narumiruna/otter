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
- 2026-06-25: Split client view rendering; verification passed (`TEST_DATABASE_URL=... npm run check`, `npm run check`, dev compose `/api/me` smoke).
- 2026-06-25: Mark active trip for assistive tech; verification passed (`npm run check`, dev compose `/api/me` smoke).
- 2026-06-25: Add contextual expense action labels; verification passed (`npm run typecheck`, `npm run check`, dev compose `/api/me` smoke).
- 2026-06-25: Add participant action labels and disabled delete descriptions; verification passed (`npm run typecheck`, `npm run check`, dev compose `/api/me` smoke).
- 2026-06-25: Add client view rendering smoke tests; verification passed (`npm test -- src/client/views.test.ts`, `npm run check`, dev compose `/api/me` smoke).
- 2026-06-25: Make client API errors robust to non-JSON responses; verification passed (`npm test -- src/client/client-support.test.ts`, `npm run check`, dev compose `/api/me` smoke).
- 2026-06-25: Show stable client API message when fetch fails; verification passed (`npm test -- src/client/client-support.test.ts`, `npm run check`, dev compose `/api/me` smoke).
- 2026-06-25: Sort expense list by expense date; verification passed (`npm run typecheck`, `npm test -- src/client/views.test.ts`, `npm run check`, dev compose `/api/me` smoke).
- 2026-06-25: Reject successful non-JSON client API responses; verification passed (`npm test -- src/client/client-support.test.ts`, `npm run check`, dev compose `/api/me` smoke).
- 2026-06-25: Ignore malformed cookie values; verification passed (`npm test -- src/server-support.test.ts`, `npm run check`, dev compose `/api/me` smoke).

## Current PM candidate ranking

| Rank | Candidate | User impact | Correctness | Reliability | Dev speed | Maintainability | Verification clarity | Effort | Risk | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Ignore malformed cookie values | Medium | Medium | High | High | High | High | Low | Low | Completed this cycle: malformed Cookie headers no longer crash auth checks or logout. |
| 2 | Add participant merge flow | Medium | High | Medium | Low | Medium | Low | High | High | Later: risky because it rewrites expense ownership. |
| 3 | Add trip archive flag | Low | Low | Medium | Medium | High | Medium | Medium | Low | Later: housekeeping after core correction flows. |
| 4 | Add CSV import for expenses | Medium | Medium | Medium | Low | Medium | Medium | High | Medium | Later: more parsing/validation surface than cookie parsing. |
| 5 | Add recurring expense templates | Medium | Medium | Medium | Low | Medium | Low | High | Medium | Later: speculative until repeated-entry pain is clear. |
