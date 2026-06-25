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

## Current PM candidate ranking

| Rank | Candidate | User impact | Correctness | Reliability | Dev speed | Maintainability | Verification clarity | Effort | Risk | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Add expense date display/input | Medium | Medium | Medium | Medium | High | High | Medium | Low | Completed this cycle: records when expenses happened with native date input. |
| 2 | Add CSV export | Medium | Low | High | Medium | High | Medium | Medium | Low | Next likely candidate: useful reporting after core entry fields are complete. |
| 3 | Split DB integration tests into focused files | Low | Medium | Medium | Medium | High | High | Medium | Low | Later: improves maintainability, less user-visible. |
| 4 | Add participant merge flow | Medium | High | Medium | Low | Medium | Low | High | High | Later: risky because it rewrites expense ownership. |
| 5 | Edit expense currency | Medium | High | Medium | Low | Medium | Low | High | High | Later: risky because amount semantics change across currencies. |
