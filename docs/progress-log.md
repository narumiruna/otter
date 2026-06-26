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

## Current PM candidate ranking

| Rank | Candidate | User impact | Correctness | Reliability | Dev speed | Maintainability | Verification clarity | Effort | Risk | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Add print-friendly trip view styles | Medium | Low | High | High | High | Medium | Low | Low | Completed this cycle: makes settlement results easier to share offline with CSS only. |
| 2 | Add participant merge flow | Medium | High | Medium | Low | Medium | Low | High | High | Later: risky because it rewrites expense ownership. |
| 3 | Add trip archive flag | Low | Low | Medium | Medium | High | Medium | Medium | Low | Later: housekeeping after core correction flows. |
| 4 | Add recurring expense templates | Medium | Medium | Medium | Low | Medium | Low | High | Medium | Later: speculative until repeated-entry pain is clear. |
| 5 | Add CSV import for expenses | Medium | Medium | Medium | Low | Medium | Medium | High | Medium | Later: useful but more validation-heavy than print styles. |
