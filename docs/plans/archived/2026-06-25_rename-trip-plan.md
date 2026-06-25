## Goal

讓使用者能修正旅行 / 群組名稱的錯字，不必刪掉重建整趟旅行。

## Context

目前 app 已能建立、刪除旅行和管理支出；旅行名稱建錯時只能刪除重建，會連帶刪掉參與者與支出。Postgres `trips.name` 已可更新，不需要 migration。

## Non-Goals

- 不修改基準貨幣；既有支出與餘額都依旅行基準貨幣計算，改幣別需要另外設計。
- 不新增完整設定頁；先用詳細頁按鈕與原生 prompt 完成改名。

## Plan

- [x] Add `PATCH /api/trips/:tripId` in `src/server.ts` to update only the current user's trip name and return the existing trip payload; verified with DB-backed API test.
- [x] Add a rename button in `src/client/main.ts` that prompts for a new name and refreshes selected trip plus trip list; verified with `npm run typecheck` and build.
- [x] Extend `src/server.test.ts` to rename a trip and assert detail plus summary names update; verified with `TEST_DATABASE_URL=postgres://otter:otter_dev_password@127.0.0.1:55432/otter_dev npm test`.
- [x] Update README feature list; verified by reading `README.md`.
- [x] Run full QA and compose smoke; verified with `npm run check`, `docker compose -f compose.dev.yml up --build -d`, and `curl http://127.0.0.1:3000/api/me`.

## Risks

- Cross-account rename would be data corruption; mitigated with `WHERE id = $1 AND owner_id = $2`.

## Completion Checklist

- [x] A signed-in user can rename only their own trip, verified by DB-backed API test.
- [x] Browser UI exposes rename in the trip detail header and refreshes names, verified by source review plus build/typecheck.
- [x] README lists trip rename, verified by reading `README.md`.
- [x] Full quality gate passes, verified by `npm run check`.
- [x] Dev compose still starts app + Postgres, verified by curling `/api/me`.
