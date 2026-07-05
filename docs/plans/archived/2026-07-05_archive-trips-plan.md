## Goal

讓已結束的旅行/聚會可封存而不是刪除，預設清單保持乾淨，封存資料仍可查看與還原。

## Context

目前 trip 只有刪除；刪除會移除整個群組資料，不適合已完成但仍要保存的旅行。

## Architecture

在 `trips` 加 `archived_at`，列表 API 預設回傳未封存，也提供包含封存或封存清單的查詢。

## Non-Goals

- 不做自動封存規則。
- 不改 CSV/列印資料格式。

## Plan

- [x] 新增遷移 `archived_at timestamptz NULL` 與 owner/archived 查詢索引；以 `DATABASE_URL=postgres://otter:otter_dev_password@127.0.0.1:55432/otter_dev npm run migrate` 驗證。
- [x] 更新 `/api/trips` 支援 active 與 archived 清單，並讓封存 trip 仍可用 `/api/trips/:tripId` 查看；以 server tests 驗證清單過濾與 ownership。
- [x] 更新 `PATCH /api/trips/:tripId` 支援封存/取消封存；以 API 測試驗證 `archivedAt` 變化。
- [x] 更新 `src/client/client-support.ts` 的 `TripSummary` 型別並調整 `src/client/main.ts` 載入 active/archived；以 typecheck 驗證。
- [x] 更新 `src/client/views.ts` 群組列表與設定區，提供「封存」「還原」按鈕，刪除仍保留為危險操作；以 view tests 驗證按鈕與分區。
- [x] 更新 README 功能列表，說明封存與刪除差異；以 `git diff -- README.md` 檢查。
- [x] 跑完整品質檢查；以 `npm run check` 通過作為驗收。

## Risks

- 封存 trip 若仍可修改，使用者可能困惑；第一版允許查看與還原後修改，封存狀態下以設定文案提示。

## Rollback / Recovery

- 若 UI 有問題，可暫時不顯示封存清單；資料仍在 `trips.archived_at`。

## Completion Checklist

- [x] Trip 可封存與還原，並由 API 測試驗證。
- [x] 預設群組清單不顯示已封存項目，並由 server/client tests 驗證。
- [x] 使用者文件說明封存和刪除差異，證據為 README diff。
- [x] 品質門檻通過，證據為 `npm run check`。
