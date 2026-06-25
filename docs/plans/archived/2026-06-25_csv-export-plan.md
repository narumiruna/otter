## Goal

讓使用者能把目前旅行的支出紀錄匯出成 CSV，方便在試算表中分享、保存或再分析。

## Context

核心支出欄位（日期、描述、金額、付款人、分帳參與者）已完整可建立/修正。前端已持有完整 trip payload，因此可以在瀏覽器端產生 CSV，不需要新增後端 API 或資料庫變更。

## Non-Goals

- 不匯出餘額或結清建議；本次只匯出原始支出紀錄。
- 不新增伺服器端下載 endpoint；前端 Blob 下載即可。

## Plan

- [x] Add a small CSV formatter for trip expenses that escapes commas/quotes/newlines and includes date, description, amount, currency, payer, and split participants; verified with focused `npm test` case.
- [x] Add an export button in `src/client/main.ts` that downloads the selected trip expense CSV with a safe filename; verified with `npm run typecheck` and build.
- [x] Update README feature list and `docs/progress-log.md`; verified by reading both files.
- [x] Run full QA and compose smoke; verified with `npm run check`, `docker compose -f compose.dev.yml up --build -d`, and `curl http://127.0.0.1:3000/api/me`.

## Risks

- Spreadsheet imports can break if CSV escaping is wrong; mitigated with a unit test covering commas and quotes.

## Completion Checklist

- [x] Exported CSV includes one row per expense with date, description, amount, currency, payer, and split participants, verified by focused test.
- [x] CSV escaping handles commas and quotes, verified by focused test.
- [x] Browser UI exposes a CSV export action for the selected trip, verified by source review plus build/typecheck.
- [x] README and progress log mention the completed change, verified by reading both files.
- [x] Full quality gate passes, verified by `npm run check`.
- [x] Dev compose still starts app + Postgres, verified by curling `/api/me`.
