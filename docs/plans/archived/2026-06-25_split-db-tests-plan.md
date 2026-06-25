## Goal

把單一大型 DB-backed server integration test 拆成較聚焦的測試檔，讓後續 API 變更更容易定位失敗原因與維護測試資料。

## Context

`src/server.test.ts` 已累積多輪 auth、trip、participant、expense 行為驗證。測試仍會過，但失敗時很難快速判斷是哪個 API 面向壞掉；拆成 auth/trip 與 participant/expense 兩個測試檔，並共用最小測試 app helper，即可降低後續修改成本。

## Non-Goals

- 不改 API 行為。
- 不新增測試框架或第三方依賴。

## Plan

- [x] Extract shared Postgres test setup, API helper, and response types from `src/server.test.ts` into one small test utility; verified with `npm test`.
- [x] Split auth/trip coverage into `src/server.auth.test.ts` and participant/expense coverage into `src/server.expenses.test.ts`, preserving existing assertions; verified with `TEST_DATABASE_URL=postgres://otter:otter_dev_password@127.0.0.1:55432/otter_dev npm test`.
- [x] Remove the old monolithic `src/server.test.ts` after coverage is preserved; verified with `test ! -e src/server.test.ts`.
- [x] Update `docs/progress-log.md`; verified by reading it.
- [x] Run full QA and compose smoke; verified with `npm run check`, `docker compose -f compose.dev.yml up --build -d`, and `curl http://127.0.0.1:3000/api/me`.

## Risks

- Splitting tests can accidentally drop coverage; mitigated by preserving existing assertions in the two focused files and running DB-backed tests.

## Completion Checklist

- [x] DB-backed auth/trip behavior is covered by a focused test file, verified by `TEST_DATABASE_URL=postgres://otter:otter_dev_password@127.0.0.1:55432/otter_dev npm test`.
- [x] DB-backed participant/expense behavior is covered by a focused test file, verified by `TEST_DATABASE_URL=postgres://otter:otter_dev_password@127.0.0.1:55432/otter_dev npm test`.
- [x] The old monolithic test file is removed, verified by `test ! -e src/server.test.ts`.
- [x] Progress log mentions the completed split, verified by reading `docs/progress-log.md`.
- [x] Full quality gate passes, verified by `npm run check`.
- [x] Dev compose still starts app + Postgres, verified by curling `/api/me`.
