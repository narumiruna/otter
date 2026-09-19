# otter

otter 是一個為旅行和朋友聚會設計的網頁記帳拆帳 app，協助使用者記錄共同支出、整理每個人的付款狀況，並計算最後誰要付給誰多少錢。

## 功能

- 使用 Username 與密碼註冊、登入、登出；登入後可新增 Passkey，之後用裝置解鎖快速登入。
- 建立、選擇、重新命名、調整基準貨幣、封存/還原與刪除支出群組，並避免同帳號重複命名。
- 可用 Username 加入既有帳號為協作者；協作者可記帳與維護成員，但不能刪除旅行或管理協作者。
- 新增、重新命名與刪除未使用的參與者，並避免同一旅行內重複命名。
- 記錄支出：日期、描述、付款人、金額、貨幣、分帳參與者，並可修改日期、描述、金額、貨幣、付款人與分帳參與者。
- 每筆支出可上傳一張 JPEG、PNG 或 WebP 收據照片，大小上限 5MB，圖片目前存在 PostgreSQL。
- 刪除誤建的支出。
- 支援 TWD、JPY、USD、EUR，並以旅行的基準貨幣計算餘額；每趟旅行可自訂匯率。
- 顯示每位參與者的分帳餘額與 settle up 結清建議。
- 群組工作區以「總覽、支出、成員、更多」四個目標導向區域組織；「記一筆」是持續可見的主要動作。總覽先顯示待結清與餘額，花費分析則按需展開。
- 匯出支出群組支出、餘額與結清建議 CSV，批次匯入同格式支出 CSV，下載/還原 JSON 備份，並可用列印按鈕輸出適合列印的結算畫面。
- 擁有者可建立可撤銷的唯讀分享連結，朋友不登入也能查看支出、餘額與結清建議。
- 可安裝成手機瀏覽器捷徑；API 和記帳資料需連線，不支援離線新增或同步記帳。

## 帳號

註冊只需填寫 Username 和密碼，新帳號會以正規化後的 Username 作為預設顯示名稱。Username 為 3–32 個英文字母、數字、底線或連字號；會去除前後空白並轉成小寫，不分大小寫且不可重複。密碼至少 8 個字。為相容既有 client，註冊 API 仍接受選填的 `name`。開發環境預填帳號為 `admin`。

登入後可從右上角帳號設定新增或移除多組 Passkey。Passkey 使用 discoverable credential，可在登入頁直接選擇帳號，不必先輸入 Username；密碼登入會保留作為備援。Passkey 只能在 HTTPS secure context 或瀏覽器允許的 `localhost` 開發環境使用。

Migration `011_username_auth.sql` 將 `users.email` 改名為 `users.username`，保留既有帳號值、密碼、session 與群組關聯。Migration `012_passkeys.sql` 只新增 Passkey credential 與短效 challenge 資料表，不修改既有帳號、密碼或 session。既有使用者仍可用 Username／原 Email 與密碼登入後新增 Passkey。

## 技術

- 前端：React + Vite + TypeScript。
- UI：Radix Themes、Colors、Primitives、Icons，以及 Tailwind CSS layout utilities。
- Server state：TanStack Query；表單：React Hook Form。
- 後端：Hono + `@hono/node-server` + TypeScript。
- 資料庫：PostgreSQL + raw SQL migrations。
- 共用拆帳邏輯：`src/shared/`。
- 單元與元件測試：Vitest + Testing Library；瀏覽器測試：Playwright + axe。
- 格式與 lint：Biome CI。
- Git hook：Husky；`npm install` 會透過 `prepare` 安裝 hook。

前端工作區已完整使用 React feature components；TanStack Query 只在 API 成功後更新遠端狀態，React Hook Form 管理草稿、驗證、預覽與取消。URL 的 `trip`、`view`、`mode` query parameters 支援返回、上一頁與直接連結，且不會移除未知參數。

## 本機開發

```bash
npm install
npm run dev
```

開啟 <http://localhost:17463>。`npm run dev` 會在前景啟動 compose，建置 `otter` image、啟動 PostgreSQL、套用 migrations，再啟動 app。第一次使用時請在註冊頁建立帳號。

`just dev` 會改以背景 container 啟動同一套環境。

如果不用 compose，先準備 Postgres 並設定 `DATABASE_URL`：

```bash
DATABASE_URL=postgres://user:pass@localhost:5432/otter npm run migrate
DATABASE_URL=postgres://user:pass@localhost:5432/otter npm run dev:server
```

常用檢查：

```bash
npm run migrate -- --help
npm run typecheck
npm test
npm run test:components
npm run test:e2e
npm run biome:ci
npm run check
```

執行 DB-backed API 測試（需先啟動 dev Postgres）：

```bash
DATABASE_URL=postgres://otter:otter_dev_password@127.0.0.1:55432/otter_dev npm test
```

重建 dev 資料庫 volume：

```bash
npm run db:reset:dev
```

`npm run check` 會執行 Biome CI、TypeScript typecheck、Vitest 與 production build，且維持不依賴資料庫。
`npm run test:e2e` 會用 Playwright Chromium 驗證主要流程、responsive reflow、dialog focus 與 axe accessibility；先執行 `npx playwright install chromium`，並提供已遷移的 `DATABASE_URL`。

## Agent CLI

非互動式 CLI 透過現有 HTTP API 管理支出群組、成員、支出、餘額與結清紀錄，資料結果固定輸出 JSON，適合 script 或 AI agent 使用。CLI 不需要接收帳號密碼；第一次使用時啟動 device authorization：

未設定 `OTTER_URL` 時，CLI 預設連線至 `https://otter.narumi.dev/`：

```bash
npm run --silent otter -- auth login
```

若要連線至其他 Otter server（例如本機開發環境），再以 `OTTER_URL` 覆寫。CLI 會開啟 Otter `/device` 頁面並顯示一次性 code。使用者在瀏覽器登入、確認要求來源並核准後，CLI 會取得 90 天有效的 Bearer token。伺服器只保存 token hash；CLI 將 token 依 server URL 寫入 `~/.config/otter/credentials.json`，檔案權限為 `0600`。Device code 10 分鐘後失效且只能兌換一次。帳號、Passkey、協作者、分享連結與 device approval 管理仍要求瀏覽器 session，Bearer token 不可執行。

若瀏覽器無法自動開啟，可加上 `--no-open` 並手動前往 CLI 顯示的 URL。無狀態 agent 或 CI 可改由 secret manager 提供 `OTTER_TOKEN`，而不寫入 credential file。

```bash
npm run --silent otter -- auth status
npm run --silent otter -- trips list
```

常見流程：

```bash
npm run --silent otter -- participants list --trip trip-id
npm run --silent otter -- expenses add \
  --trip trip-id \
  --description Dinner \
  --amount 1200 \
  --currency TWD \
  --paid-by participant-id \
  --split-with participant-id,other-participant-id
npm run --silent otter -- balances get --trip trip-id
```

金額輸入使用主要貨幣單位，例如 USD `12.50`；JSON 回應中的 `amountMinor` 使用最小貨幣單位。刪除命令必須明確加上 `--yes`。遠端 URL 預設必須使用 HTTPS；只有明確設定 `OTTER_ALLOW_INSECURE_HTTP=1` 才會把認證資料送到非本機 HTTP URL。使用 `npm run --silent otter -- auth logout` 可撤銷目前 token 並移除本機保存內容。

使用 `npm run --silent otter -- --help` 查看完整命令。`--silent` 會避免 npm 將 lifecycle 訊息混入 stdout JSON。Production build 後也可執行 `npm run --silent otter:built -- --help`。給 AI agent 的工作流程位於 `skills/otter-manage-expenses/SKILL.md`。

## Pre-commit / Husky

`npm install` 或 `npm ci` 會透過 `prepare` 安裝 `.husky/pre-commit`。
目前 pre-commit hook 會執行完整檢查：

```bash
npm run check
```

## Docker

App 與 PostgreSQL：

```bash
docker compose up --build
```

`compose.yaml` 只有一個 `otter` app service，預設連線到同一份 compose 啟動的 PostgreSQL。正式部署時請提供安全的資料庫密碼：

```bash
POSTGRES_PASSWORD=change-me docker compose up --detach --build
```

App 會暴露在 <http://localhost:17463>，且 container 啟動時會先套用 migrations。PostgreSQL 的 host port 只綁定至 `127.0.0.1:55432`。若資料庫已初始化，修改 `POSTGRES_PASSWORD` 不會自動修改既有 PostgreSQL 使用者的密碼。

GitHub `Deploy` workflow 需要 self-hosted runner、`POSTGRES_PASSWORD` repository secret 與 `PASSKEY_ORIGIN` repository variable。每次 push 到 `main` 都會直接部署，也可以手動觸發；部署使用 compose 內的 PostgreSQL。

Production session cookie 在 `NODE_ENV=production` 時預設使用 `Secure`；只有在可信任的 HTTP 測試環境才設定 `COOKIE_SECURE=false`。

Passkey 會驗證 WebAuthn relying party 與瀏覽器 origin。本機 compose 預設使用 `PASSKEY_ORIGIN=http://localhost:17463`；正式環境必須明確設定公開 HTTPS origin，例如：

```bash
PASSKEY_ORIGIN=https://otter.example.com
```

`PASSKEY_ORIGIN` 只能包含 scheme、hostname 與選填 port，不可包含 path；除 `localhost` 開發環境外必須使用 HTTPS。Relying party ID 會自動使用 origin 的 hostname。變更網域後，既有 Passkey 不會在新 relying party 下生效，使用者需以密碼登入並重新新增。

Passkey options 與 device authorization 建立要求會依 client 限流，預設使用 socket peer address。只有在 app 前方的可信任 reverse proxy 會覆寫 `X-Forwarded-For` 或 `X-Real-IP` 時，才將 `PASSKEY_TRUST_PROXY=true` 與 `DEVICE_AUTH_TRUST_PROXY=true` 設為 repository variables；app port 若可由外部直接連線則不可啟用，避免 client 偽造 header 繞過限流。

## 工作流程與安全狀態

新增支出預設使用今天、群組基準貨幣、第一位付款人、所有分帳成員與平均分帳；指定金額、比例、份數、分類與標籤透過有名稱的進階區塊展開。輸入金額後會先顯示每人的具體分帳預覽，只有「記錄支出」會寫入資料。

修改基準貨幣、匯率、CSV 匯入、JSON 還原、分享、封存、合併及刪除都先顯示結果或影響範圍。`取消`、Escape 或捨棄草稿不會呼叫 mutation API；失敗會保留舊資料與草稿。封存及唯讀分享不顯示修改 controls；協作者可維護日常支出，但只有擁有者能管理權限、偏好與生命週期。離線時可閱讀已載入資料，寫入 actions 會停用並說明需恢復連線。

## 匯入、備份、分享與附件限制

CSV 匯入欄位範例：

```csv
date,description,amount,currency,paid_by,category,tags,split_participants
2026-06-25,Dinner,1200,TWD,Alice,餐飲,"food|night","Alice; Bob"
```

匯入前需先建立對應參與者；任一列錯誤會取消整批匯入。JSON 備份會還原成新的支出群組，不覆蓋既有資料；備份不包含帳號、session、密碼或收據圖片。收據圖片目前存在 PostgreSQL，每筆支出一張、上限 5MB。

分享連結知道網址即可讀取整趟旅行的結算資訊；外洩時請在「更多 → 分享與權限」撤銷。手機瀏覽器可加到主畫面捷徑，但 API 和記帳資料仍需連線，不支援離線新增支出。

## 貨幣與匯率限制

支援貨幣：TWD、JPY、USD、EUR。每趟旅行可在「更多 → 換算方式」先預覽再套用自訂匯率；未設定的幣別會使用固定原型匯率。若要正式用於長期或高金額記帳，下一步應接即時匯率。

## CI

GitHub Actions 設定在 `.github/workflows/ci.yml`，流程為：

```bash
npm ci
npx playwright install --with-deps chromium
npm run check
npm run migrate
npm run test:e2e
```
