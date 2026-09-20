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
