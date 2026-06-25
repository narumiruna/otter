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

## Current PM candidate ranking

| Rank | Candidate | User impact | Correctness | Reliability | Dev speed | Maintainability | Verification clarity | Effort | Risk | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Split oversized server module | Low | Medium | Medium | Medium | High | High | Medium | Low | Completed this cycle: `src/server.ts` is below 1,000 lines and backend helpers are isolated. |
| 2 | Edit expense currency | Medium | High | Medium | Low | Medium | Low | High | High | Next user-facing candidate after server split; risky because amount semantics change across currencies. |
| 3 | Add participant merge flow | Medium | High | Medium | Low | Medium | Low | High | High | Later: risky because it rewrites expense ownership. |
| 4 | Add basic print stylesheet | Low | Low | High | High | High | Low | Low | Low | Later: low impact compared with data export. |
| 5 | Add recurring expense templates | Medium | Medium | Medium | Low | Medium | Low | High | Medium | Later: speculative until repeated-entry pain is clear. |
