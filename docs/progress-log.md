# Progress Log

## Completed cycles

- 2026-06-25: PostgreSQL persistence and migrations; pushed `f1d2254`.
- 2026-06-25: Delete expenses; pushed `9a2ee9c`.
- 2026-06-25: Delete trips; pushed `7c26d7a`.
- 2026-06-25: Rename trips; pushed `a14ad78`.
- 2026-06-25: Rename participants; pushed `3761951`.
- 2026-06-25: Delete unused participants; pushed `19638e6`.
- 2026-06-25: Confirm destructive expense deletion; verification passed (`npm run check`, dev compose `/api/me` smoke).

## Current PM candidate ranking

| Rank | Candidate | User impact | Correctness | Reliability | Dev speed | Maintainability | Verification clarity | Effort | Risk | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Confirm destructive expense deletion | Medium | Medium | High | High | High | High | Low | Low | Completed this cycle: prevents accidental data loss with tiny, safe UI change. |
| 2 | Edit existing expense fields | High | High | Medium | Medium | Medium | Medium | Medium | Medium | Later: valuable but larger UI/API surface. |
| 3 | Add expense date display/input | Medium | Medium | Medium | Medium | High | Medium | Medium | Low | Later: useful history context, less urgent than data-loss guard. |
| 4 | Split DB integration tests into focused files | Low | Medium | Medium | Medium | High | High | Medium | Low | Later: improves maintainability, less user-visible. |
| 5 | Add participant merge flow | Medium | High | Medium | Low | Medium | Low | High | High | Later: risky because it rewrites expense ownership. |
