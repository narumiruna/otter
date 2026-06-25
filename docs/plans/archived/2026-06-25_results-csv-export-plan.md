## Goal

讓使用者能把目前旅行的分帳餘額與結清建議匯出成 CSV，方便把最後誰欠誰多少錢分享給朋友。

## Context

支出 CSV 匯出已完成，但使用者還不能匯出最終分帳結果。前端已持有 balances 與 settlements，因此可沿用既有前端 Blob 下載與 CSV formatter，不需要新增後端 API。

## Non-Goals

- 不新增伺服器端下載 endpoint。
- 不改分帳演算法或顯示格式。

## Plan

- [x] Add a CSV formatter for balances and settlements that escapes commas/quotes/newlines and includes record type, participant/from/to, amount, and currency; verified with focused `npm test` case.
- [x] Add an export button in `src/client/main.ts` that downloads the selected trip results CSV with a safe filename; verified with `npm run typecheck` and build.
- [x] Update README feature list and `docs/progress-log.md`; verified by reading both files.
- [x] Run full QA and compose smoke; verified with `npm run check`, `docker compose -f compose.dev.yml up --build -d`, and `curl http://127.0.0.1:3000/api/me`.

## Risks

- CSV rows for balances and settlements have different shapes; mitigated by using one simple header with blank fields where not applicable.

## Completion Checklist

- [x] Exported results CSV includes balance and settlement rows, verified by focused test.
- [x] CSV escaping handles commas and quotes, verified by focused test.
- [x] Browser UI exposes a results CSV export action for the selected trip, verified by source review plus build/typecheck.
- [x] README and progress log mention the completed change, verified by reading both files.
- [x] Full quality gate passes, verified by `npm run check`.
- [x] Dev compose still starts app + Postgres, verified by curling `/api/me`.
