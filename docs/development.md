# 本機開發與架構

## 離線新增支出測試

已載入並登入的頁面可在離線時把新支出存到 IndexedDB；不提供 service worker 或離線冷啟動。`apps/web/src/client/expense-queue.ts` 管理本機佇列，`expense-sync.ts` 在連線、回到頁面及定時觸發；先持久化 attempted 狀態，再送原操作 ID 與原 JSON。可用 `npm run test:components` 驗證儲存失敗、跨帳號隔離、編輯及重試；需 migrated PostgreSQL 的 API 測試及 Chromium 的 `npm run test:e2e` 驗證斷線／回應遺失／恢復後只記一次。離線資料不計餘額；匯率在同步時由 API 決定。測試私密模式、容量不足、封存、撤銷成員以及多分頁時，切勿清除真實使用者站點資料。

## 開發環境

建議使用 Node.js 26（與 CI 相同），另需 npm 與 Docker Compose。從 repository root 執行：

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

`npm test` 先建置共用 packages，再執行所有 workspace 測試；只在這次 workspace 測試中跳過重複的 npm lifecycle 建置。單獨執行 workspace 測試時仍會自行建置依賴。Web 測試最多同時執行四個檔案；API 測試維持循序執行。`npm run check` 依序執行 Biome、TypeScript typecheck、Vitest 與 production build，且不需要資料庫。執行 DB-backed API tests 時提供已遷移的測試資料庫：

```bash
DATABASE_URL=postgres://otter:otter_dev_password@127.0.0.1:55432/otter_dev npm test
```

E2E tests 驗證主要流程、responsive reflow、dialog focus 與 axe accessibility。Playwright 使用 `apps/api/scripts/serve-e2e.ts` 啟動真實 API／PostgreSQL，只注入外部 Visa transport fixtures，不連線市場匯率；此入口不得用於部署。它需要 Chromium 與已遷移的隔離 `DATABASE_URL`：

```bash
npx playwright install chromium
DATABASE_URL=postgres://user:pass@localhost:5432/otter npm run test:e2e
```

Use a new, isolated database for each full E2E run. Existing workflow tests add rows to development fixtures; a second run against the same database can fail on counts and duplicate descriptions. Do not reset a shared or production database for tests. CI runs the complete browser suite with one worker to reduce CPU contention during accessibility checks. If a local multi-worker run hits browser timing limits, rerun the complete suite with `npm run test:e2e -- --workers=1` and record both outcomes. Do not relax assertions or timeouts.

查看 migration runner 選項：

```bash
npm run migrate -- --help
```

`npm install` 或 `npm ci` 會透過 `prepare` 安裝 Husky。Pre-commit hook 執行 `npm run check`。

## Browser localization

`apps/web/src/client/i18n/locales.ts` is the single language registry. Each entry needs a complete typed catalog in `messages.ts`; derive tests from `languageOptions`. Use `CatalogShape<typeof zhTW>` and translate every composed source key, including feature modules. Do not spread another language into a catalog to hide missing keys. Preserve each interpolation parameter and message type. Use `pluralForm` with the catalog locale for grammatical count forms; keep all parameters in each branch.

Run `npm test --workspace @narumitw/otter-web -- src/client/i18n/messages.test.ts`, `npm run test:components`, and `npm run test:e2e -- localization.spec.ts` after a catalog change. The catalog test also checks populated plural branches and rejects deliberately invalid catalogs. The browser suite checks native language labels, preference persistence, localized errors, keyboard access, reflow, and accessibility. Use a migrated test database and Chromium for the full browser command. The mocked localization suite can also run with `--config playwright.interface.config.ts` in the web workspace without PostgreSQL.

Keep data and input formats unchanged when a user changes the language. Do not translate user-entered names, descriptions, CSV headers, or backup keys. Review financial directions and destructive actions with a fluent user before release. See [Browser localization](localization.md) for editorial choices and review status.

## WebMCP 唯讀試點

公開測試頁：<http://localhost:17463/webmcp-test>（部署後為 `/webmcp-test`）。不需登入，頁面本身不呼叫 API 或資料庫；直接開啟後可查看 WebMCP 註冊狀態、兩個示範工具 `otter_demo_balances` 和 `otter_demo_settlements` 及預期 JSON。工具只回傳固定假資料，不會讀取帳號或真實群組。

本機手動測試前，請在支援 WebMCP 的 Chrome 開啟 `chrome://flags/#enable-webmcp-testing`，將 **WebMCP Testing** 設為 **Enabled**，重新啟動 Chrome，然後重新載入測試頁；未啟用測試旗標、也沒有有效 origin trial 時，頁面可能沒有 `document.modelContext`，無法使用 WebMCP。測試頁可用於確認瀏覽器助理能否發現並執行工具；瀏覽器旗標不會取代正式部署的 HTTPS、origin trial 和 Permissions Policy 要求。

otter 在登入並載入群組後，若瀏覽器支援 `document.modelContext`，會註冊查詢**目前群組**餘額與建議結算的兩個工具；分享頁、登入頁、裝置授權頁和帳號設定頁都不提供工具。切換群組或登出會移除舊工具；工具名稱含當頁唯一序號，agent 應在狀態改變後重新發現工具。工具不接受群組 ID 或 URL，不寫入資料，也不會提供整份群組 payload。回傳 JSON 以 `amountMinor`（minor currency units）和 `currency` 表示金額，最多八筆，並附 `total`／`truncated`；姓名等使用者資料標為不可信內容。權限仍由既有 `GET /api/trips/:tripId` 的登入及成員資格檢查控制；工具註解不是安全邊界，未設定跨來源 `exposedTo`。

WebMCP 尚屬試驗功能，Chrome 官方文件列為 [origin trial](https://developer.chrome.com/docs/ai/webmcp)；部署時需要 HTTPS、有效 trial 設定和未停用 `tools` Permissions Policy／origin isolation。未支援的瀏覽器不受影響。Playwright 1.64 使用 Chrome for Testing 156.0.8078.4。以 `--enable-features=WebMCP,WebMCPTesting --enable-webmcp-testing` 啟用原生 WebMCP 測試 API；`executeTool` 的輸入必須是物件 `{}`，JSON 字串 `"{}"` 會被拒絕。E2E 測試使用物件輸入，應隨 Chrome 更新複查。

在遷移後的 PostgreSQL 上，以 Playwright 原生 WebMCP API 驗證登入、兩個查詢、群組切換、分享頁、裝置頁與登出（不支援時測試會失敗而非假通過）：

```bash
DATABASE_URL=postgres://user:pass@localhost:5432/otter npm run test:e2e -- --grep WebMCP
```

若有安全或相容性問題，移除 `AuthenticatedWorkspace` 中的 `WebMcpTools` 註冊元件並重新部署，即可停用；無資料庫變更或資料回復需求。正式上線前應確認目標 Chrome 版本與 origin trial 狀態。

## 專案結構

```text
apps/web        React/Vite browser app
apps/api        Hono API, PostgreSQL access and migrations
packages/core   Environment-neutral expense and settlement logic
packages/contracts  HTTP DTOs and payload guards
packages/visa-exchange-rates  Automatic Visa rate client
packages/exchange-rates  Retained bank clients; not called by the app
packages/cli    Published non-interactive CLI
```

依賴方向固定為 `apps/* → packages/*`。Web 與 CLI 不匯入 API implementation；`core` 不依賴 transport 或 app code。Production 由 API process 提供 `apps/web/dist`，因此部署仍只有一個 app service。

Raw SQL migrations 位於 `apps/api/db/migrations/`，runner 位於 `apps/api/scripts/migrate.ts`。Migration 022 為 `participants` 新增可空的 `settled_by_id`（同群組外鍵）；舊資料保持自行結算。API 修改成員的 `PATCH /api/trips/:tripId/participants/:participantId` 接受 `settledById` 為另一位直接結算的成員 ID，或 `null` 解除歸屬；既有 `name` 更新不受影響。每筆原始分帳與付款紀錄不改寫，僅餘額計算後將淨額歸至代表人；JSON 備份還原會重新映射歸屬 ID。

### Share link recovery

Migration 029 adds nullable `trip_share_links.token` to retain new share URLs after a reload.

- The original random token is a secret capability. This column stores it without encryption or a new runtime key.
  - Protect database access, database copies, and backups as secrets.
  - Token hashes still control link lookup and verification.
  - Revocation clears the stored token in the same database update.
- Legacy hash-only links remain valid, but their URLs cannot be recovered. Create replacement links when necessary.
- Only an owner's browser session can read `GET /api/trips/:tripId/share-links`.
  - Requests with Bearer or share-token headers are rejected, even if an owner session is also present.
  - Revoked, expired, and legacy rows retain metadata without a URL.
  - Generic trip, Bearer/API/CLI, public, guest, and export reads do not include recoverable URLs.
- GET and POST secret responses use `Cache-Control: private, no-store` and absolute `/share/:token` URLs.
  - POST keeps the existing trip payload and includes only the newly created link URL.
- Deploy the migration before the API. Application rollback can retain the nullable column and its data.

### 共用規則與 HTTP boundary

- `packages/core/src/participant-deletion.ts` 決定刪除參與者的阻擋原因，優先順序為最後一位參與者、支出、付款紀錄。API 決定 status/error，Web 決定在地化文字；權限與封存檢查仍由各 app 處理。
- `apps/api/src/server-expense-store.ts` 共用支出與有序分帳資料的 INSERT。呼叫端負責驗證、預設值、ID 映射、時間戳及 transaction；開發 fixtures 保留自己的 conflict handling。
- API routes 直接使用 Hono context 與 response。`server-http.ts` 的 `parseRequestBody` 在受保護 routes 的 authentication 之後、route validation 與 rate limiter 之前執行；未知 API paths 不經過此 parser。
- Parser 保留既有政策：GET/HEAD 或未提供 Content-Type 時為空物件；JSON 上限為 1 MiB，`/api/trips/restore` 為 10 MiB；JPEG/PNG/WebP 為 5 MiB。其他 Content-Type 保留為原始 bytes，由 route 決定是否接受。這些限制在讀取完整 body 後檢查，並非 streaming limits。
- 空 JSON body 視為空物件；無效 JSON 回傳 400，超過上述大小限制回傳 413，兩者都不計入 route-level rate limit。成功解析但欄位無效的驗證請求仍計入限制。Cookie 屬性、proxy 信任設定與 Bearer/session 權限不變。

## 支出版本與 HTTP 契約

`014_expense_revisions.sql` 新增目前支出的 `version` 與 append-only-by-application 的 `expense_revisions`。DB 管理者仍可修改歷史。`expense_revision_snapshot(expenses)` 在單一 SQL snapshot 中取得支出、有序分帳、當時名稱與收據 metadata，供 baseline、版本寫入與目前支出讀取共用；不保存舊圖片 bytes 或 URL。

`server-trip-mutation.ts` 在 authentication／body parsing 之後取得 trip row lock，持有同一 client 到 commit／rollback；route 必須在鎖內重驗 membership、封存與參與者。只有支出／收據／CSV／合併／單筆版本還原 route 使用 `expenseMutation` 明確啟用 before snapshot；設定、參與者、協作者與付款 route 只使用共同的 trip lock，不額外建立 before snapshot。Expense route 完成變更後，必須在回傳 payload 前呼叫 `recordExpenseChanges`，將目前狀態與歷史原子提交。HTTP 錯誤也 rollback；`tripMutation`／`expenseMutation` 的 handler 直接使用傳入的 PoolClient，`withTransaction` 僅用於沒有外層 transaction 的 Pool。群組設定／刪除、參與者、協作者及付款寫入遵守同一 parent-lock 順序，不使用全域鎖。備份還原與開發 fixtures 各在自己的 transaction 記錄建立來源。

支出匯率政策：一般新快照依序使用同幣別 1、群組手動匯率、支出日期的 Visa 報價，不再自動使用銀行或固定估算。指定貨幣結清獨立使用支出日期的 Visa 報價，手續費為 0%，不受一般手動匯率覆蓋。修改金額、描述、分帳或收據保留快照；日期或原幣改變時取得匹配的新快照。一般統計仍用群組基準貨幣，結清使用所選貨幣。取價在 trip lock 外完成，鎖內重新驗證日期、目標與最新設定；失敗不部分寫入。詳見 [匯率與結清規則](visa-settlements.md)。

| 寫入／讀取入口 | 快照政策 | 驗證案例 |
| --- | --- | --- |
| API／CLI 新增、複製與 CSV 匯入 | 共用日期化 Visa 候選；一般手動匯率只影響新快照；與 revision 原子保存 | `server.expense-exchange-rate.test.ts`、`server.expense-copy.test.ts` |
| 金額／描述／分帳修改及離線重播 | 使用有效既有快照，不重新定價；同步保留 draft 日期 | `server.visa-settlement.test.ts`、`server.expense-operations.test.ts` |
| 歷史版本還原 | 保留所選版本原報價；只為目前目標補足必要匯率或 bridge；缺原快照維持 409 | `server.expense-exchange-rate.test.ts`、`server.expense-restore.test.ts` |
| JSON 備份 | v3 保存支出、付款及 bridge；完整還原不連線取價；v1／v2 缺漏明確標 `legacy` | `backup.test.ts`、`server.expense-exchange-rate.test.ts` |
| 改基準幣及異幣付款 | 保留原快照，保存支出日期的 bridge；付款依 `paidAt` 保存，不再浮動 | `dated-rates.test.ts`、`server.visa-settlement.test.ts` |
| 舊版 payload | 缺必要匯率顯示 unavailable，不默默使用固定表；排序將未知金額置後 | `client-support.test.ts`、`overview-summary.component.test.tsx` |
| Migration 與開發 fixtures | 027／028 需明確切換基準，保留原報價及 revisions；開發 fixtures 使用明確手動值 | `server.visa-rate-cutover.test.ts`、`server-dev.test.ts` |

Migration 028 遇到舊異幣付款或跨基準幣快照缺少可重現匯率時會停止。不得直接用今日 Visa 或固定值補出歷史。先在隔離 production 副本確認切換基準，再依 [切換與回復程序](visa-rate-cutover.md) 匯入核准資料；不能回退到無法讀取新快照的舊版。

新增支出 `POST /api/trips/:tripId/expenses` 的成功回應除 `TripPayload` 外，還有 `createdExpenseId`，指向本次 transaction 真正建立的支出；重播既有操作 ID 也回傳原始 ID（即使該支出後來被刪除）。瀏覽器用此 ID 與該筆支出版本再 `PUT /expenses/:expenseId/receipt`，不能從清單差異猜 ID。兩個請求不是原子交易；第一個成功、第二個失敗時保留支出，只重試收據 PUT。線上建檔回應不明時不自動重送 POST，提示使用者先檢查清單；離線操作 ID 流程維持原有 guest 限制。照片檔案只存在表單記憶體，不進 IndexedDB。

成功的 `tripMutation` handler 回傳 deferred response function：先在 transaction 內載入完整 `LoadedTrip`，由 wrapper commit 並 release client 後，才呼叫 `buildTripPayload` 以已保存快照產生回應，不查外部匯率。Deferred function 不可使用已釋放的 client，也不可重新載入目前支出而混入後續修改。慢速 Visa 取價在 mutation 取鎖前完成，不占用 trip lock；鎖內候選不匹配即整筆失敗，不補發網路請求。`loadTrip` 收到 Pool 時平行讀取六個 detail queries，收到 transaction client 時循序完成；支出 version、分帳與收據仍由同一 SQL snapshot 讀取。

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

`GET /api/trips/:tripId/expense-history?expenseId=expense-id&limit=20&cursor=revision-id` 回傳 `{ revisions, nextCursor }`。expenseId、cursor 可省略；limit 預設 20，上限 100。Cursor 須來自同群組／篩選結果，不存在或格式無效回傳 400。每筆含 snapshot、previousSnapshot 與 changedFields，跨頁也可顯示差異；依 recordedAt、id 倒序排列。帶 `expenseId` 的回應另有 `latestRevision: { version, action } | null`，依版號取得，供已刪支出還原時核對最新刪除版（即使 recordedAt 相同也不猜版號）；不帶篩選的舊回應仍維持原形。只有目前 owner／editor 可讀，公開分享不包含此 endpoint 或歷史內容。

`018_expense_version_restore.sql` 擴充 revision 的 action（`restored`，用於已刪支出）與 source（`version_restore`）。編輯中的版本還原使用 `updated` action。要把同群組支出還原為一筆既有 revision 的帳目／分帳內容（含已刪支出），提交：

```http
POST /api/trips/trip-id/expenses/expense-id/restore
Content-Type: application/json
If-Match: "3"

{"revisionId":"revision-id"}
```

`If-Match` 為操作前讀取的目前支出版本；已刪支出則為同支出最新刪除 revision 的版本，不是要還原的舊版版本。與 PATCH 相同，缺少版本為 428、格式錯誤為 400、版本已變為 412；非成員／錯誤群組或版本為 404、封存或舊版參與者已移除為 409。所有比對、重建與新增 revision 均在同一 trip lock transaction；失敗無副作用。有效還原新增版本，已刪支出沿用原 ID 與建立時間，版本接續刪除版，不回到 1。內容相同的現有支出還原不新增版本。餘額／結清建議從新狀態重算，既有付款不改寫。

舊收據圖片不在歷史內：現有支出保留目前收據，已刪支出還原時不帶收據。舊快照的收據 metadata 僅供顯示，不能當作圖片還原；UI 在確認前說明此規則。還原只取舊版支出欄位、分帳順序與份額；不還原舊名稱或已離群的參與者，也不自動改派付款人。

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
