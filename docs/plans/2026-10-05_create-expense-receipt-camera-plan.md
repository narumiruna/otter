# 新增支出時附上收據／拍照實作計畫

## Goal

使用者在「新增支出」畫面即可選擇既有照片或用手機相機拍照，按一次「記錄支出」後完成支出與收據上傳；過程中的失敗不能造成重複支出，也不能把「支出已建立、照片未上傳」誤報為全部完成。

## Context

- `apps/web/src/client/workspace/expense-composer.tsx` 只有在編輯既有支出時顯示 `ReceiptControls`；新增支出目前只送 JSON `POST /api/trips/:tripId/expenses`。
- `apps/web/src/client/workspace/expense-actions.tsx` 已有收據選檔與 `PUT /api/trips/:tripId/expenses/:expenseId/receipt`，需既有支出 ID 與 `If-Match` 版本；`apps/api/src/server-receipts.ts` 和 `server-http.ts` 已限制 JPEG、PNG、WebP、5 MiB。照片不需另建資料表。
- 新增支出的 API 回傳整個 `TripPayload`，沒有明確指出哪一筆是本次新增；不能靠描述或新舊清單差異猜測，否則多人同時新增時可能上傳到別人的支出。
- 離線支出草稿在 `apps/web/src/client/expense-queue.ts` 以 IndexedDB 存 JSON 資料並於同步時重送；目前不儲存圖片。

## Architecture / Decisions

- 延用現有兩個 API 呼叫：先建立支出取得其 ID 和版本，再以該版本上傳收據。不為此功能引入 multipart 建立端點、資料庫遷移或圖片轉檔。
- 讓建立支出的回應額外包含明確的 `createdExpenseId`（保留既有 `TripPayload` 欄位；同步更新 `packages/contracts` 的回應型別和 API 測試）。以回傳清單中該 ID 的版本執行 `PUT`，避免用清單差異推測。
- 新增表單提供「上傳照片」與「拍照」兩個清楚命名的操作：前者使用既有檔案選擇器，後者使用 `accept="image/jpeg,image/png,image/webp"` 和 `capture="environment"` 的檔案輸入。依賴行動瀏覽器提供原生相機，不使用 `getUserMedia`；桌面瀏覽器可能只顯示檔案選擇器，不能保證直接開相機。
- 選好照片先在表單內暫存 `File`，顯示檔名／可移除；提交前檢查 MIME、非空及 5 MiB 上限，伺服器仍做最終驗證。若相機產生 HEIC 等不支援格式，顯示清楚的限制訊息而非無聲失敗。編輯畫面的既有收據操作保持可用。
- 只有建立成功後才更新已建立支出的 UI 狀態；即使上傳失敗，也保留新支出的 ID 和已選檔案，提供「重試上傳」與「稍後再傳」。重試只呼叫 `PUT`，**絕不重新呼叫 `POST`**；顯示「支出已建立，收據上傳失敗」，不上傳成功提示。若離開頁面，支出仍可從清單進入編輯後補傳；選取檔案不持久化。
- 與現有離線佇列保持界線：離線或編輯待同步草稿時，停用照片選擇與拍照並提示需上線且支出建立後才可上傳。若選檔後才離線，阻止把含照片的表單直接存成不含照片的佇列草稿；使用者須重新連線或先移除照片，避免照片被默默遺漏。

## Non-Goals

- 桌面瀏覽器內建相機預覽／拍照流程、HEIC 轉檔、多張收據、離線圖片持久化或背景上傳。
- 把支出與收據改成單一原子交易：建立成功、上傳失敗時支出保留，並由 UI 明確說明。

## Plan

- [x] 確認建立端點目前的回應與 `TripPayload` 消費者、版本取得方式及新增表單導頁流程；證據：`server-expenses.ts`、`expense-sync.ts`、`expense-composer.tsx` 與路由導頁使用 `TripPayload`，回應新增欄位不移除舊欄位。
- [x] 擴充 `packages/contracts` 建立支出回應型別與 `apps/api/src/server-expenses.ts` 回應；證據：`server.expense-operations.test.ts` 驗證多個並行 replay、第二筆支出及刪除後仍回原 ID；PostgreSQL suite 110 tests passed。
- [x] 為 `ExpenseComposer` 新增上傳／拍照選擇、移除與檔案檢查、雙語文案；證據：`new-expense-receipt.component.test.tsx` 檢查 MIME、0 byte、5 MiB、相機屬性與離線禁用。
- [x] 讓線上新增流程先建立、再用回傳 ID／版本上傳；證據：元件測試驗證無照片單次 POST、有照片 POST + PUT 與 If-Match，Playwright 新增的行動尺寸工作流程成功讀取照片。
- [x] 加入建立成功但上傳失敗的留頁、重試及稍後補傳流程；證據：元件測試涵蓋只重試 PUT、版本衝突 review、已有收據不可覆蓋及建立回應遺失時禁重試。
- [x] 覆蓋離線切換與待同步草稿情境；證據：元件測試切換離線後須先移除照片才能佇列；`npm run test:components` 180 tests passed，`npm test` DB suite passed。
- [x] 在 `apps/web/tests/e2e/workspace.spec.ts` 加入行動尺寸模擬相機檔案、確認收據可從清單進入編輯查看；專項 Playwright Chromium 通過。
- [ ] 用實體 iOS／Android 手機確認原生相機入口；目前環境沒有可操作的實體手機，自動化無法驗證瀏覽器的原生拍照行為。
- [x] 為 PR 新增 `.changeset/bright-cameras-capture.md` 並執行 `npm run check`、`npm run test:components`、帶遷移 PostgreSQL 的 `npm test`，以及專項 `npm run test:e2e -- --grep 'mobile new expense attaches a camera photo'`；詳見 PR 驗證結果。
- [ ] 全量 `npm run test:e2e`：單次 4-workers 執行 24/34 通過，其餘有種子資料受先前專項測試污染與執行逾時；新獨立 DB 的單 worker 執行於 300s 工具上限中止（22/34），應在 CI/適當資源重跑。

## Risks / Open Questions

- `capture="environment"` 只是瀏覽器提示，不保證所有手機一定直接打開後鏡頭；需在真實 iOS／Android 瀏覽器確認，若桌面直接拍照是必要需求，另規劃 `getUserMedia` 與權限、降級流程。
- 建立請求若在伺服器已成功寫入後斷線，瀏覽器可能收不到 ID；不得在此情況自動重送 `POST`。實作前確認是否需擴充現有建立支出的操作 ID 冪等機制給線上流程（目前 `server-expenses.ts` 限制訪客使用）；若不擴充，UI 必須明示「建立結果不明，先查看支出清單再重試」，並測試此情境。
- 選好的 `File` 僅存於當前頁面記憶體；重新整理後無法自動恢復，使用者需從既有支出的編輯畫面重新選取。

## Completion Checklist

- [ ] 可選照片、不選照片正常流程均有元件測試；行動瀏覽器相機入口待實體裝置驗證。
- [x] 收據附在本次建立的支出上；上傳失敗時只重試 PUT 或稍後補傳，有元件及專項 E2E 證據。
- [x] 檔案限制、離線狀態與部分成功提示有元件、PostgreSQL API 與專項 E2E 證據。
- [x] 建立回應不明時禁自動重試並提示先檢查清單，元件測試通過；Changeset 已加入，全量 E2E 障礙與實機未驗證將於 PR 標註。
