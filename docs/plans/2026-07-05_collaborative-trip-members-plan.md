## Goal

讓同一趟旅行可由多個登入使用者協作記帳，而不是只有建立者能操作。

## Context

目前 `trips.owner_id` 決定唯一擁有者，`loadTripForUser()` 只允許 owner 讀寫。

## Architecture

新增 `trip_members` 表保存 user/trip/role。第一版只支援 owner 邀請既有帳號成為 editor，editor 可新增與修改支出/成員但不能刪除 trip 或管理協作者。

## Non-Goals

- 不寄送 email 邀請。
- 不支援匿名協作。
- 不做細到每筆支出的權限。

## Plan

- [ ] 新增 `trip_members` 遷移，將既有 `trips.owner_id` backfill 為 `owner` role，並加唯一 `(trip_id,user_id)`；以 `npm run migrate` 驗證。
- [ ] 擴充 auth helper，讓 `loadTripForUser()` 可依 role 讀取 trip，並提供 require owner/editor 檢查；以 server-support tests 驗證。
- [ ] 更新所有 trip mutation route，套用 owner/editor 權限；以 API tests 驗證 editor 可記帳、不能刪 trip 或邀人。
- [ ] 新增協作者 API：owner 用 email 加入既有 user、移除 editor、列出成員；以 API tests 驗證不存在 email 與重複加入錯誤。
- [ ] 更新設定頁 UI 顯示協作者、加入 email、移除按鈕與目前 role；以 `src/client/views.test.ts` 驗證。
- [ ] 更新 README 說明協作限制；以 `git diff -- README.md` 檢查。
- [ ] 跑完整品質檢查；以 `npm run check` 通過作為驗收。

## Risks

- 權限錯誤會造成資料外洩或誤刪；先用 DB-backed API tests 覆蓋每個 mutation route。

## Rollback / Recovery

- 保留 `owner_id`，若協作出問題可暫時讓 `loadTripForUser()` 回到 owner-only 判斷。

## Completion Checklist

- [ ] Trip 可加入既有使用者為 editor，並由 API 測試驗證。
- [ ] Editor 可協作記帳但不能管理危險操作，並由 route 權限測試驗證。
- [ ] Owner-only 既有資料仍可讀寫，並由 migration/API 測試驗證。
- [ ] 品質門檻通過，證據為 `npm run check`。
