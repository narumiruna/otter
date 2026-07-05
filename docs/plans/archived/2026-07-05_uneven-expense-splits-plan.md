## Goal

支援一筆支出用不平均方式分帳：可輸入指定金額、比例或份數，最後仍產生正確餘額與結清建議。

## Context

目前 `Expense.participantIds` 只表示平均分帳；`calculateBalances()` 在 `src/shared/settlement.ts` 直接平均切分金額。

## Architecture

用最少資料模型支援三種輸入：在每位分帳參與者保存換算後的應付 `share_minor`；平均分帳保留既有 `NULL`/缺省語意。比例與份數只在表單/API 驗證時換算成明確金額。

## Non-Goals

- 不支援跨幣別分帳明細；每筆支出的分帳明細使用該支出貨幣。
- 不做自動 OCR 或收據品項拆分。

## Plan

- [x] 新增遷移，讓 `expense_participants` 可保存 `share_minor bigint NULL CHECK (share_minor > 0)`；以 `DATABASE_URL=postgres://otter:otter_dev_password@127.0.0.1:55432/otter_dev npm run migrate` 成功執行驗證。
- [x] 擴充 `src/shared/settlement.ts` 的 `Expense` 型別與 `calculateBalances()`，有明細金額時使用明細、否則沿用平均分帳；以 `src/shared/settlement.test.ts` 案例驗證指定金額、餘數與舊資料相容。
- [x] 更新 `src/server.ts` 的新增/修改支出 API，接受 `splitMode` 與分帳值，並驗證總和等於支出金額；以 `TEST_DATABASE_URL=postgres://otter:otter_dev_password@127.0.0.1:55432/otter_dev npm test -- src/server.expenses.test.ts` 驗證成功與總和不符的錯誤。
- [x] 更新 `loadTripForUser()` 與 `tripPayload()` 載入分帳明細；以 DB-backed API 測試確認回傳 payload 包含不平均分帳資料。
- [x] 更新 `src/client/views.ts` 與 `src/client/main.ts`，在記帳與編輯表單加入平均/金額/比例/份數模式；以 client tests 驗證欄位渲染與送出 payload。
- [x] 更新 CSV 匯出，讓不平均分帳可讀；以 `src/shared/csv.test.ts` 驗證輸出包含每人分帳值。
- [x] 跑完整品質檢查；以 `npm run check` 通過作為驗收。

## Risks

- 舊資料沒有 `share_minor` 必須維持平均分帳；用 shared tests 覆蓋。
- 金額餘數分配可能影響公平性；先用確定性排序，之後有需求再加設定。

## Rollback / Recovery

- 若部署後發現計算錯誤，可先隱藏前端不平均分帳表單，舊平均分帳仍因 `share_minor` 為 `NULL` 可運作。

## Completion Checklist

- [x] 指定金額、比例、份數三種輸入都能建立支出，並由 DB-backed API/client tests 驗證。
- [x] 舊平均分帳資料計算不變，並由 settlement regression test 驗證。
- [x] 餘額與結清建議會反映不平均分帳，並由 `src/shared/settlement.test.ts` 驗證。
- [x] 品質門檻通過，證據為 `npm run check`。
