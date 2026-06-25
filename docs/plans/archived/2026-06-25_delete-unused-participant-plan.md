## Goal

讓使用者能刪除誤加、且尚未用在任何支出上的參與者，避免旅行名單被錯誤人名污染。

## Context

目前參與者可以新增與改名，但不能刪除。Postgres foreign keys 會保護已被支出使用的參與者；產品上先支援刪除未使用參與者，保留已有支出的參與者避免資料不一致。

## Non-Goals

- 不刪除已出現在付款人或分帳名單中的參與者；需要先刪除/修改相關支出。
- 不做參與者合併；那會改動既有支出歸屬。

## Plan

- [x] Add `DELETE /api/trips/:tripId/participants/:participantId` in `src/server.ts` to delete only unused participants in trips owned by the current user, keep at least one participant, and return the existing trip payload; verified with DB-backed API test.
- [x] Add delete buttons in `src/client/main.ts` participant rows using native `confirm()` and refresh the selected trip; verified with `npm run typecheck` and build.
- [x] Extend `src/server.test.ts` to reject deletion while a participant is used, delete after the expense is removed, and reject deleting the last participant; verified with `TEST_DATABASE_URL=postgres://otter:otter_dev_password@127.0.0.1:55432/otter_dev npm test`.
- [x] Update README feature list; verified by reading `README.md`.
- [x] Run full QA and compose smoke; verified with `npm run check`, `docker compose -f compose.dev.yml up --build -d`, and `curl http://127.0.0.1:3000/api/me`.

## Risks

- Deleting a participant referenced by expenses would corrupt history; mitigated with explicit usage checks and existing database foreign keys.

## Completion Checklist

- [x] A signed-in user can delete only unused participants in their own trip, verified by DB-backed API test.
- [x] Used participants and the last remaining participant cannot be deleted, verified by DB-backed API test.
- [x] Browser UI exposes participant deletion and refreshes visible names, verified by source review plus build/typecheck.
- [x] README lists participant deletion, verified by reading `README.md`.
- [x] Full quality gate passes, verified by `npm run check`.
- [x] Dev compose still starts app + Postgres, verified by curling `/api/me`.
