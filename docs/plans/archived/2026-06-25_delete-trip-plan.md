## Goal

讓使用者能刪除不再需要或誤建的旅行 / 群組，並從旅行清單移除，避免測試或錯誤資料長留在帳號中。

## Context

目前 app 可以建立旅行、參與者、支出，也可以刪除支出，但無法移除整趟旅行。Postgres schema 對 `trips` 下的 participants、expenses、expense_participants 已設定 cascade，刪除旅行不需要新表或 migration。

## Non-Goals

- 不做軟刪除或復原流程；目前是早期產品，瀏覽器原生確認足夠。
- 不新增批次管理畫面；先在旅行詳細頁放一個刪除按鈕。

## Plan

- [x] Add `DELETE /api/trips/:tripId` in `src/server.ts` to delete only trips owned by the current user; verified with DB-backed API test.
- [x] Add a delete-trip button in `src/client/main.ts` using native `confirm()` and refresh the trip list after deletion; verified with `npm run typecheck` and build.
- [x] Extend `src/server.test.ts` to delete the trip and assert it disappears from `/api/trips`; verified with `TEST_DATABASE_URL=postgres://otter:otter_dev_password@127.0.0.1:55432/otter_dev npm test`.
- [x] Update README feature list; verified by reading `README.md`.
- [x] Run full QA and compose smoke; verified with `npm run check`, `docker compose -f compose.dev.yml up --build -d`, and `curl http://127.0.0.1:3000/api/me`.

## Risks

- Accidental destructive action; mitigated with native browser confirmation and owner-scoped SQL delete.

## Completion Checklist

- [x] A signed-in user can delete only their own trip, verified by DB-backed API test.
- [x] Deleted trips disappear from the browser state and trip list, verified by source review plus build/typecheck.
- [x] README lists trip deletion, verified by reading `README.md`.
- [x] Full quality gate passes, verified by `npm run check`.
- [x] Dev compose still starts app + Postgres, verified by curling `/api/me`.
