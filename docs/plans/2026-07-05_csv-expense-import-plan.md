## Goal

讓使用者可從 CSV 批次匯入支出，降低從試算表或舊記帳資料搬移的成本。

## Context

目前已有 CSV 匯出在 `src/shared/csv.ts`，但沒有 CSV 解析或批次新增支出 API。

## Architecture

第一版沿用匯出欄位：`date,description,amount,currency,paid_by,split_participants`。匯入要求參與者名稱已存在，避免自動建錯人。

## Non-Goals

- 不匯入不平均分帳明細，除非不平均分帳功能已先完成。
- 不支援 Excel `.xlsx`。

## Plan

- [ ] 在 `src/shared/csv.ts` 新增小型 CSV parser 與 `parseExpenseImportCsv()`，支援 quoted cell 與換行；以 `src/shared/csv.test.ts` 驗證合法檔、缺欄、未知幣別、未知參與者。
- [ ] 新增 server validation helper，將匯入列轉成既有新增支出資料並回報 row-level errors；以 server tests 驗證錯誤列不寫入。
- [ ] 新增 API `POST /api/trips/:tripId/expenses/import`，在 transaction 內批次新增全部合法列，任一列錯誤則整批失敗；以 DB-backed API 測試驗證 atomic 行為。
- [ ] 更新設定/匯出分頁，加入 CSV 檔案 input、格式說明、預覽錯誤清單與匯入按鈕；以 `src/client/views.test.ts` 驗證 UI。
- [ ] 更新 `src/client/main.ts` 讀取文字檔並送出 API，成功後重載 trip payload；以瀏覽器手動匯入範例 CSV 驗證。
- [ ] 在 README 加入匯入 CSV 格式範例；以 `git diff -- README.md` 檢查。
- [ ] 跑完整品質檢查；以 `npm run check` 通過作為驗收。

## Risks

- CSV 解析容易出錯；限制第一版格式並用 parser tests 覆蓋 quoted cells。

## Rollback / Recovery

- 匯入 API 使用 transaction，失敗時不會留下半批資料；若 UI 出問題可先隱藏匯入入口。

## Completion Checklist

- [ ] CSV parser 支援匯出同格式再匯入，並由 `src/shared/csv.test.ts` 驗證。
- [ ] 匯入 API 具備 row-level error 與 atomic 寫入，並由 DB-backed tests 驗證。
- [ ] UI 可選檔、顯示錯誤並完成匯入，並由 view test 或瀏覽器檢查驗證。
- [ ] README 有 CSV 格式範例，並由 diff 檢查驗證。
- [ ] 品質門檻通過，證據為 `npm run check`。
