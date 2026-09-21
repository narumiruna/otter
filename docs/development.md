# 本機開發與架構

## 開發環境

建議使用 Node.js 25（與 CI 相同），另需 npm 與 Docker Compose。從 repository root 執行：

```bash
npm install
npm run dev
```

`npm run dev` 會在前景建置並啟動 app 與 PostgreSQL、套用 migrations，再於 <http://localhost:17463> 提供服務。`just dev` 會以背景 containers 啟動相同環境。

重建開發資料庫 volume：

```bash
npm run db:reset:dev
```

## 不使用 Compose

準備 PostgreSQL 並設定 `DATABASE_URL`。`dev:server` 會建置並監看共用 packages，同時啟動 API（17464）與 Vite（17463）；Vite 將 `/api` proxy 到 API。

```bash
DATABASE_URL=postgres://user:pass@localhost:5432/otter npm run migrate
DATABASE_URL=postgres://user:pass@localhost:5432/otter npm run dev:server
```

## 驗證

```bash
npm run biome:ci
npm run typecheck
npm test
npm run test:components
npm run build
npm run check
```

`npm run check` 依序執行 Biome、TypeScript typecheck、Vitest 與 production build，且不需要資料庫。執行 DB-backed API tests 時提供已遷移的測試資料庫：

```bash
DATABASE_URL=postgres://otter:otter_dev_password@127.0.0.1:55432/otter_dev npm test
```

E2E tests 驗證主要流程、responsive reflow、dialog focus 與 axe accessibility。它需要 Chromium 與已遷移的 `DATABASE_URL`：

```bash
npx playwright install chromium
DATABASE_URL=postgres://user:pass@localhost:5432/otter npm run test:e2e
```

查看 migration runner 選項：

```bash
npm run migrate -- --help
```

`npm install` 或 `npm ci` 會透過 `prepare` 安裝 Husky。Pre-commit hook 執行 `npm run check`。

## 專案結構

```text
apps/web        React/Vite browser app
apps/api        Hono API, PostgreSQL access and migrations
packages/core   Environment-neutral expense and settlement logic
packages/contracts  HTTP DTOs and payload guards
packages/exchange-rates  Bank exchange-rate clients and parsers
packages/cli    Published non-interactive CLI
```

依賴方向固定為 `apps/* → packages/*`。Web 與 CLI 不匯入 API implementation；`core` 不依賴 transport 或 app code。Production 由 API process 提供 `apps/web/dist`，因此部署仍只有一個 app service。

Raw SQL migrations 位於 `apps/api/db/migrations/`，runner 位於 `apps/api/scripts/migrate.ts`。

### 共用規則與 HTTP boundary

- `packages/core/src/participant-deletion.ts` 決定刪除參與者的阻擋原因，優先順序為最後一位參與者、支出、付款紀錄。API 決定 status/error，Web 決定在地化文字；權限與封存檢查仍由各 app 處理。
- `apps/api/src/server-expense-store.ts` 共用支出與有序分帳資料的 INSERT。呼叫端負責驗證、預設值、ID 映射、時間戳及 transaction；開發 fixtures 保留自己的 conflict handling。
- API routes 直接使用 Hono context 與 response。`server-http.ts` 的 `parseRequestBody` 在受保護 routes 的 authentication 之後、route validation 與 rate limiter 之前執行；未知 API paths 不經過此 parser。
- Parser 保留既有政策：GET/HEAD 或未提供 Content-Type 時為空物件；JSON 上限為 1 MiB，`/api/trips/restore` 為 10 MiB；JPEG/PNG/WebP 為 5 MiB。其他 Content-Type 保留為原始 bytes，由 route 決定是否接受。這些限制在讀取完整 body 後檢查，並非 streaming limits。
- 空 JSON body 視為空物件；無效 JSON 回傳 400，超過上述大小限制回傳 413，兩者都不計入 route-level rate limit。成功解析但欄位無效的驗證請求仍計入限制。Cookie 屬性、proxy 信任設定與 Bearer/session 權限不變。

## 支出版本與 HTTP 契約

`014_expense_revisions.sql` 新增目前支出的 `version` 與 append-only-by-application 的 `expense_revisions`。DB 管理者仍可修改歷史。`expense_revision_snapshot(expenses)` 在單一 SQL snapshot 中取得支出、有序分帳、當時名稱與收據 metadata，供 baseline、版本寫入與目前支出讀取共用；不保存舊圖片 bytes 或 URL。

`server-trip-mutation.ts` 在 authentication／body parsing 之後取得 trip row lock，持有同一 client 到 commit／rollback；route 必須在鎖內重驗 membership、封存與參與者。只有支出／收據／CSV／合併 route 使用 `expenseMutation` 明確啟用 before snapshot；設定、參與者、協作者與付款 route 只使用共同的 trip lock，不額外建立 before snapshot。Expense route 完成變更後，必須在回傳 payload 前呼叫 `recordExpenseChanges`，將目前狀態與歷史原子提交。HTTP 錯誤也 rollback；傳入 `withTransaction` 的 PoolClient 必須已由外層 transaction 管理。群組設定／刪除、參與者、協作者及付款寫入遵守同一 parent-lock 順序，不使用全域鎖。Restore 與開發 fixtures 各在自己的 transaction 記錄建立來源。

成功的 `tripMutation` handler 回傳 deferred response function：先在 transaction 內載入完整的 `LoadedTrip`，由 wrapper commit 並 release client 後，才呼叫 `buildTripPayload` 取得銀行匯率與產生回應。Deferred function 不可再使用 transaction client 或重新載入目前支出；否則會誤用已釋放的連線，或把後續修改混入本次回應。銀行失敗仍使用既有固定匯率 fallback；commit 後的回應處理錯誤不會回滾已完成的 mutation。慢速 provider 不應占用 trip lock 或 DB pool。`loadTrip` 收到 Pool 時平行執行六個獨立 detail queries；收到 transaction client 時循序執行，避免在單一連線排入尚未完成的 query。兩種路徑的支出 version、分帳與收據仍由同一 SQL snapshot 讀取。

單筆支出 PATCH／DELETE 與收據 PUT／DELETE 要求觀察到的版本，例如：

```http
PATCH /api/trips/trip-id/expenses/expense-id
Content-Type: application/json
If-Match: "3"

{"amount":"1500"}
```

認證仍使用原有 session 或 Bearer token。版本來自 trip payload 的 `trip.expenses[].version`，不是整個 trip 的 ETag；收據也共用此 expense revision token。Server 不猜測版本、不接受 wildcard、weak tag 或多個 tags。正規化後無實際修改的 PATCH 仍檢查前置條件，但不增版。

| Status | JSON `code` | Client 行為 |
| --- | --- | --- |
| 428 | `EXPENSE_VERSION_REQUIRED` | 升級 client，讀取支出版本後再操作。 |
| 400 | `EXPENSE_VERSION_INVALID` | 修正格式；需單一帶雙引號的正安全整數。 |
| 412 | `EXPENSE_VERSION_CONFLICT` | 保留草稿，重新閱讀並確認意圖；不可只換 token 自動 retry。 |

錯誤仍包含 `error` 字串。未授權／不存在沿用原有 auth／404 邊界，封存維持 409。新增支出不需版本。Contracts 提供 `VersionedExpense`／`parseVersionedTripPayload` 給嚴格線上資料；`parseTripPayload` 保留舊離線 preview 的相容性，任何寫入都不得把缺少版本補成 1。

`GET /api/trips/:tripId/expense-history?expenseId=expense-id&limit=20&cursor=revision-id` 回傳 `{ revisions, nextCursor }`。expenseId、cursor 可省略；limit 預設 20，上限 100。Cursor 須來自同群組／篩選結果，不存在或格式無效回傳 400。每筆含 snapshot、previousSnapshot 與 changedFields，跨頁也可顯示差異；依 recordedAt、id 倒序排列。只有目前 owner／editor 可讀，公開分享不包含此 endpoint 或歷史內容。

API concurrency tests 用 DB lock waiters 控制交錯，避免以 sleep 推測時序。Migration suite 驗證 013 升級、10,000 筆 baseline、資料指紋與 migration 重跑；必須提供隔離的 `DATABASE_URL`，不能以 skipped 當作驗證通過。

## 技術選擇

- Web：React、Vite、TypeScript、Radix、Tailwind CSS layout utilities。
- Client state：TanStack Query；表單：React Hook Form。
- API：Hono 與 `@hono/node-server`。
- Database：PostgreSQL 與 raw SQL migrations。
- Tests：Vitest、Testing Library、Playwright 與 axe。
- Formatting and linting：Biome。

TanStack Query 只在 API 成功後更新 server state。React Hook Form 管理草稿、驗證、預覽與取消。URL 的 `trip`、`view`、`mode` query parameters 支援返回、上一頁及直接連結，且保留未知參數。

## CI

`.github/workflows/ci.yml` 會：

1. 安裝 locked dependencies 與 Playwright Chromium。
2. 執行 `npm run check`。
3. 套用 migrations 並執行 E2E tests。
4. 建置 production image。
5. 以 disposable PostgreSQL 驗證 API、SPA 與 container restart。
