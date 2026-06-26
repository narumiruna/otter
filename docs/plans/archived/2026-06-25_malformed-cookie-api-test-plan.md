## Goal

新增 DB-backed API regression test，確認 malformed session cookie 進到 `/api/me` 時不會回 500，而是被視為未登入。

## Context

上一輪已在 `getCookie()` 補上 malformed percent-encoding 防護並加 unit test。這輪補一個 API 邊界測試，避免未來 auth middleware 或 cookie parsing 改動讓壞 cookie 再次造成 500。

## Non-Goals

- 不改變 cookie parsing 或 auth 行為。
- 不新增更多 cookie parser cases。

## Plan

- [x] Add `/api/me` malformed cookie assertion to `src/server.auth.test.ts`; verified it expects HTTP 200 and `user: null`.
- [x] Run DB-backed auth tests with `TEST_DATABASE_URL=postgres://otter:otter_dev_password@127.0.0.1:55432/otter_dev npm test -- src/server.auth.test.ts`; verified the test passes.
- [x] Update `docs/progress-log.md`; verified by reading the file.
- [x] Run full QA and compose smoke; verified with `npm run check`, `docker compose -f compose.dev.yml up --build -d`, and `curl http://127.0.0.1:3000/api/me`.

## Risks

- Requires local dev Postgres for the DB-backed targeted check; compose provided it.

## Completion Checklist

- [x] `/api/me` with `otter_session=%E0%A4%A` returns 200 and `user: null`, verified by `src/server.auth.test.ts`.
- [x] DB-backed auth test passes, verified with `TEST_DATABASE_URL=... npm test -- src/server.auth.test.ts`.
- [x] Full quality gate passes, verified by `npm run check`.
- [x] Dev compose still starts app + Postgres, verified by curling `/api/me`.
