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

## Current PM candidate ranking

| Rank | Candidate | User impact | Correctness | Reliability | Dev speed | Maintainability | Verification clarity | Effort | Risk | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Edit expense amount | High | High | Medium | Medium | High | High | Medium | Medium | Completed this cycle: fixes wrong balances without changing payer/split. |
| 2 | Edit expense payer/split | High | High | Medium | Medium | Medium | Medium | Medium | Medium | Next likely candidate, but changes settlement relationships. |
| 3 | Add expense date display/input | Medium | Medium | Medium | Medium | High | Medium | Medium | Low | Later: useful history context, less urgent than correcting money. |
| 4 | Split DB integration tests into focused files | Low | Medium | Medium | Medium | High | High | Medium | Low | Later: improves maintainability, less user-visible. |
| 5 | Add participant merge flow | Medium | High | Medium | Low | Medium | Low | High | High | Later: risky because it rewrites expense ownership. |
