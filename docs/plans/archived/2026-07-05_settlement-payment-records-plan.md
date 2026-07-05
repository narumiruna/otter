## Goal

讓使用者能把結清建議標記為已付款，保留付款紀錄，並讓剩餘結清建議反映已完成的轉帳。

## Context

目前 settlements 是由 `calculateSettlements()` 即時計算，沒有保存「A 已付 B」的事實。

## Architecture

新增 settlement payments 作為 trip 的一部分；餘額計算先套用支出，再套用付款紀錄，避免已付款的建議重複出現。

## Non-Goals

- 不串接金流或銀行轉帳。
- 不做部分付款提醒排程。

## Plan

- [x] 新增 `settlement_payments` 遷移，欄位含 `id`, `trip_id`, `from_id`, `to_id`, `amount_minor`, `currency`, `paid_at`, `note`, `created_at`；以 `DATABASE_URL=postgres://otter:otter_dev_password@127.0.0.1:55432/otter_dev npm run migrate` 驗證。
- [x] 擴充 `Trip` 型別與 `calculateBalances()`，將付款紀錄視為 from 減少欠款、to 減少債權；以 `src/shared/settlement.test.ts` 驗證全部付款、部分付款與幣別換算情境。
- [x] 更新 `loadTripForUser()` 與 `tripPayload()` 回傳付款紀錄和剩餘 settlements；以 DB-backed API 測試驗證 payload。
- [x] 新增 API：建立付款紀錄與刪除誤建紀錄；以 `TEST_DATABASE_URL=postgres://otter:otter_dev_password@127.0.0.1:55432/otter_dev npm test -- src/server.expenses.test.ts` 驗證 auth、trip ownership、參與者與金額驗證。
- [x] 更新 `src/client/views.ts` 結清區塊，為每個建議提供「標記已付款」按鈕並顯示付款歷史；以 `src/client/views.test.ts` 驗證 rendered HTML。
- [x] 更新 CSV/列印結果，包含付款紀錄與剩餘結清建議；以 `src/shared/csv.test.ts` 驗證。
- [x] 跑完整品質檢查；以 `npm run check` 通過作為驗收。

## Risks

- 付款紀錄會改變 settlements，刪除付款紀錄必須可恢復建議；用 shared tests 覆蓋。

## Rollback / Recovery

- 可保留資料表但暫時隱藏付款 UI；既有支出與平均分帳不受影響。

## Completion Checklist

- [x] 使用者能新增與刪除結清付款紀錄，並由 API 測試驗證。
- [x] 剩餘結清建議會扣除已付款金額，並由 settlement tests 驗證。
- [x] UI 顯示付款歷史與剩餘建議，並由 view tests 驗證。
- [x] 品質門檻通過，證據為 `npm run check`。
