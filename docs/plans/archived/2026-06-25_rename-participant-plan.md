## Goal

讓使用者能修正參與者名稱的錯字，讓支出紀錄、餘額與結清建議顯示正確人名。

## Context

目前 app 可以新增參與者，但新增後不能改名；打錯名字只能新建另一位參與者，既有支出仍留在錯字人名下。Postgres `participants.name` 已可更新，不需要 migration。

## Non-Goals

- 不刪除參與者；既有支出關聯需要另外定義安全刪除規則。
- 不合併重複參與者；那會改動既有支出歸屬。

## Plan

- [x] Add `PATCH /api/trips/:tripId/participants/:participantId` in `src/server.ts` to update only participants in trips owned by the current user and return the existing trip payload; verified with DB-backed API test.
- [x] Add rename buttons in `src/client/main.ts` participant rows using native `prompt()` and refresh the selected trip; verified with `npm run typecheck` and build.
- [x] Extend `src/server.test.ts` to rename a participant and assert returned trip data updates; verified with `TEST_DATABASE_URL=postgres://otter:otter_dev_password@127.0.0.1:55432/otter_dev npm test`.
- [x] Update README feature list; verified by reading `README.md`.
- [x] Run full QA and compose smoke; verified with `npm run check`, `docker compose -f compose.dev.yml up --build -d`, and `curl http://127.0.0.1:3000/api/me`.

## Risks

- Cross-trip or cross-account rename would corrupt names; mitigated by loading the owner trip and updating by both trip id and participant id.

## Completion Checklist

- [x] A signed-in user can rename only participants in their own trip, verified by DB-backed API test.
- [x] Browser UI exposes participant rename and refreshes visible names, verified by source review plus build/typecheck.
- [x] README lists participant rename, verified by reading `README.md`.
- [x] Full quality gate passes, verified by `npm run check`.
- [x] Dev compose still starts app + Postgres, verified by curling `/api/me`.
