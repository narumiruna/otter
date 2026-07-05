## Goal

讓支出可標記分類與標籤，方便旅行後查看住宿、交通、餐飲等花費。

## Context

目前支出只有日期、描述、付款人、金額、幣別與分帳成員，沒有分類維度。

## Architecture

第一版在 `expenses` 直接加 `category` 與 `tags text[]`，避免建立多餘管理介面；分類用固定清單加「其他」，標籤為自由文字但限制數量與長度。

## Non-Goals

- 不做自訂分類管理表。
- 不做跨旅行標籤推薦。

## Plan

- [x] 新增遷移，為 `expenses` 加 `category text NOT NULL DEFAULT '其他'` 與 `tags text[] NOT NULL DEFAULT '{}'`，加長度/數量檢查；以 `DATABASE_URL=postgres://otter:otter_dev_password@127.0.0.1:55432/otter_dev npm run migrate` 驗證。
- [x] 更新 `Expense` 型別、row mapping、create/patch API validation；以 server tests 驗證預設分類、合法標籤與過長標籤錯誤。
- [x] 更新 `src/client/views.ts` 記帳與編輯表單，加入分類 select 與 tags input；以 view tests 驗證欄位與既有支出顯示。
- [x] 更新 `src/client/main.ts` 送出與修改 category/tags；以 DB-backed API tests 驗證 payload。
- [x] 更新 CSV 匯出欄位加入 `category,tags`；以 `src/shared/csv.test.ts` 驗證。
- [x] 若支出篩選功能已完成，加入分類/標籤篩選；以 client-support tests 驗證。
- [x] 跑完整品質檢查；以 `npm run check` 通過作為驗收。

## Risks

- 固定分類可能不符合所有旅行；先保留自由標籤作為逃生門。

## Completion Checklist

- [x] 新增與編輯支出可保存分類與標籤，並由 API/client tests 驗證。
- [x] 支出列表與 CSV 匯出會顯示分類與標籤，並由 view/CSV tests 驗證。
- [x] 舊支出有預設分類且不破壞讀取，並由 migration/API 測試驗證。
- [x] 品質門檻通過，證據為 `npm run check`。
