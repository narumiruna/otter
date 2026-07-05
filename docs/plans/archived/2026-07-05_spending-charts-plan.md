## Goal

在總覽提供簡單圖表，讓使用者快速看懂總支出、每日花費、每人實付與分類占比。

## Context

目前前端已有 balances 和 expenses；第一版可用 HTML/CSS/SVG 繪圖，不需要新增 chart dependency。

## Non-Goals

- 不加入 Chart.js 或大型圖表套件。
- 不做互動式 drill-down。

## Plan

- [x] 在 `src/client/client-support.ts` 新增 summary helpers：每日總額、付款人總額、分類總額；以 `src/client/client-support.test.ts` 驗證多幣別轉換與空資料。
- [x] 更新 `src/client/views.ts` 的總覽分頁，使用 semantic HTML + CSS bars/SVG 顯示圖表；以 `src/client/views.test.ts` 驗證圖表區塊、labels 與空狀態。
- [x] 更新 `src/client/styles.css`，確保圖表在手機寬度可讀且列印時不破版；以 responsive/print CSS 與 `npm run check` 驗證。
- [x] 若分類功能尚未完成，分類圖先以「未分類/其他」或跳過分類圖；分類功能已完成，缺值以「其他」處理並由 view tests 覆蓋。
- [x] 增加總支出摘要卡，顯示基準貨幣下的總花費；以 client-support tests 驗證計算。
- [x] 跑完整品質檢查；以 `npm run check` 通過作為驗收。

## Completion Checklist

- [x] 總覽顯示總支出、每日花費與每人實付摘要，並由 client/view tests 驗證。
- [x] 分類圖在分類資料存在時顯示、沒有資料時有 fallback，並由 view tests 驗證。
- [x] 圖表不新增第三方依賴，並由 `git diff -- package.json package-lock.json` 無輸出驗證。
- [x] 品質門檻通過，證據為 `npm run check`。
