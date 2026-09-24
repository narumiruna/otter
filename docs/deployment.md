# 部署與安全設定

## Docker Compose

啟動 app 與 PostgreSQL：

```bash
docker compose up --build
```

App 位於 <http://localhost:17463>。Container 啟動時會先套用 migrations；PostgreSQL host port 只綁定至 `127.0.0.1:55432`。

正式環境至少要提供安全的資料庫密碼與公開的 HTTPS origin：

```bash
POSTGRES_PASSWORD=change-me \
PASSKEY_ORIGIN=https://otter.example.com \
docker compose up --detach --build
```

資料庫初始化後，修改 `POSTGRES_PASSWORD` 不會自動修改既有 PostgreSQL 使用者密碼。

使用外部 PostgreSQL 時，只啟動 `otter` service 並略過 bundled PostgreSQL dependency：

```bash
DATABASE_URL=postgres://user:password@db.example.com:5432/otter \
PASSKEY_ORIGIN=https://otter.example.com \
docker compose up --detach --build --no-deps otter
```

`--no-deps` 可避免 Compose 啟動及等待未使用的 bundled PostgreSQL；若省略此選項，Compose 仍會啟動 `postgres` service。

## 環境變數

| 變數 | 用途 |
| --- | --- |
| `DATABASE_URL` | 使用外部 PostgreSQL；搭配 Compose 時使用上述 `--no-deps otter` command。未設定時，container 會由 `POSTGRES_PASSWORD` 組成 Compose database URL。 |
| `POSTGRES_PASSWORD` | Compose PostgreSQL 密碼；正式環境必須明確設定。 |
| `PASSKEY_ORIGIN` | WebAuthn origin，只能包含 scheme、hostname 與選填 port。除 `localhost` 外必須使用 HTTPS。 |
| `PASSKEY_TRUST_PROXY` | 信任 reverse proxy 提供的 client IP，供 Passkey request rate limiting 使用。預設 `false`。 |
| `DEVICE_AUTH_TRUST_PROXY` | 信任 reverse proxy 提供的 client IP，供 device authorization rate limiting 使用。預設 `false`。 |
| `PASSWORD_AUTH_TRUST_PROXY` | 信任 reverse proxy 提供的 client IP，供密碼註冊及登入 rate limiting 使用。預設 `false`。 |
| `COOKIE_SECURE` | Production 預設為 secure。只在可信任的 HTTP 測試環境設為 `false`。 |
| `PORT` | App port，預設 `17463`。 |

不要提交 `.env*`、資料庫 dumps 或 credentials。`.env.example` 只包含本機開發預設值。

## Password auth rate limiting

密碼註冊與登入使用 60 秒的 in-memory fixed window。每個 client 的註冊上限為 5 次、登入上限為 10 次；單一 process 的全域上限分別為 30 次與 120 次。超限時 API 回傳 `429` 與 `Retry-After`。格式錯誤的要求也會計數，避免繞過限制後消耗驗證資源。

Limiter state 會在 process restart 後重置，且不會在多個 app instances 之間共享。目前單一 Compose app service 適用此設計；若改成多 instance 部署，需先改用共享 rate-limit store。

## Passkey 與 proxy

Passkey 會驗證 WebAuthn relying party 與瀏覽器 origin。Relying party ID 使用 `PASSKEY_ORIGIN` 的 hostname。變更網域後，舊 Passkey 不會在新的 relying party 生效；使用者須以密碼（若有）登入並重新新增。只有 Passkey 的帳號沒有密碼可回復登入；變更網域前須先協助這些使用者移轉或提供帳號回復方案。

只有在可信任的 reverse proxy 會覆寫 `X-Forwarded-For` 或 `X-Real-IP`，且 app port 無法由外部直接存取時，才可啟用 `PASSKEY_TRUST_PROXY`、`DEVICE_AUTH_TRUST_PROXY` 或 `PASSWORD_AUTH_TRUST_PROXY`。否則 client 可偽造 headers 繞過限流。

## Migration 相容性

- `011_username_auth.sql` 將 `users.email` 改名為 `users.username`，保留既有帳號值、密碼、sessions 與群組關聯。既有使用者可用原 Email 作為 Username 登入。
- `012_passkeys.sql` 新增 Passkey credentials 與短效 challenges，不修改既有帳號、密碼或 sessions。
- `015_passkey_signup.sql` 允許 `users.password_hash` 為 NULL（僅 Passkey 帳號），新增五分鐘有效的 pending signup challenge table；在驗證完成或過期前保留該 Username，阻止密碼註冊或修改 Username 搶先使用。持有 challenge ID 的瀏覽器可在取消 Passkey 提示後重試，或將同一 challenge ID 隨密碼註冊要求送出，在同一 transaction 內解除自己的保留並建立密碼帳號；其他人不能用不同 ID 解除保留。驗證成功才以同一 transaction 建立 user、Passkey 與 session；原有帳號及密碼不變。無密碼帳號不可刪除最後一組 Passkey。

## 支出歷史切換與回復

`014_expense_revisions.sql` 是 additive migration，但新 API 的 If-Match 前置條件是 breaking change。每筆現存支出建立 version 1 baseline，操作者標為未知的系統起始快照；既有金額、分帳、收據與付款不改寫。歷史隨群組刪除，不隨單筆支出刪除，保存期與群組一致。

### 合併／部署前置條件

本功能以 PR 交付，尚未部署 production、發佈 npm package 或觸發 release workflow。交接由 repository maintainer `narumiruna` 負責；production 資料量、磁碟餘裕、維護窗口與外部 API client 清單仍須於切換前確認。

1. 在 production 副本測量 migration、snapshot 查詢時間與所需空間，確認可接受的停止寫入窗口。單群組寫入會序列化；目前 snapshot 比對會讀取該群組所有支出，大群組須特別驗證延遲。
2. 協調 `main` push 的自動 Deploy 與 Changesets Release workflows，確保舊 writer 已停止、DB 備份可還原，才允許 main 合併部署；不要讓一般自動部署跳過本次維護步驟。CLI 可用版本、Web reload 與 API 切換須排定順序。
3. 先停止所有連到同 DB 的舊 API／其他 writer，保留 PostgreSQL 運行，取得完整 DB backup。不可只用產品 JSON 備份代替，也不可讓新舊 server 混合寫入。
4. 在停止寫入期間執行 `npm run migrate`，驗證 baseline 筆數與目前支出筆數相同、version 均為 1、分帳與收據未變。再啟動新版 API／Web，升級 CLI／外部 clients 並重新載入瀏覽器。
5. 抽查 owner／editor 可讀、非成員與公開分享不可讀歷史；以同一 version 送兩次不同修改，第二次須為 412 且無副作用。確認成功後恢復一般寫入。

無 If-Match 的舊 client 收到 428，不能啟用無條件寫入作為相容性 fallback。CLI 改用 `--version`，詳見[CLI 文件](cli.md)。此功能不新增環境變數，不變更 cookie、安全連線或 session／Bearer 政策。

### 備份與回復

使用 PostgreSQL client 的 `pg_dump --format=custom` 備份完整 DB，檔案置於 repository 外、限制存取並加密保存。回復演練只可使用新建的隔離 DB；先由操作者核對 host 與 database name，絕不可把下列 recovery URL 指向 production 或現有使用者資料。

```bash
umask 077
pg_dump --format=custom --file="$BACKUP_PATH" "$DATABASE_URL"
# RECOVERY_DATABASE_URL 必須指向已建立、可清空的隔離 DB。
pg_restore --dbname="$RECOVERY_DATABASE_URL" --clean --if-exists --exit-on-error "$BACKUP_PATH"
```

`--clean --if-exists` 會刪除目標 DB 中對應物件，僅供上述隔離回復用途；它也處理 dump 與空 DB 都有 public schema 的情況。驗證 expenses、expense_participants、receipt_attachments、settlement_payments、expense_revisions 與 trips 的排序後資料指紋一致，並確認 migration 重跑為零、API 能讀取目前資料與刪除歷史。演練後依備份政策清除臨時檔案；不得提交 dumps。

Migration 中途失敗由 runner transaction rollback。新版若已接受寫入，先停止寫入並向前修復，保留目前帳目與歷史；不要退回不記錄 revision 的舊 writer。只有確定沒有切換後新資料，或已核准資料損失／完成資料銜接，才可回復切換前的完整 DB backup。不要以 DROP 歷史表作為一般 rollback。

### 本機驗證紀錄（2026-09-21）

- Disposable PostgreSQL 17，013 → 014：10,000 筆支出、20,000 筆分帳；migration 2,295 ms，history table 與索引合計 9,322,496 bytes（約 8.9 MiB）。支出、分帳、收據與付款的資料指紋不變；migration 重跑零筆。
- 實際 `pg_dump`／`pg_restore` 到另一個隔離 DB：26 筆目前支出、34 筆 revisions（含 2 筆刪除）、3 筆付款；六個上述資料集合的指紋一致，回復後 `npm run migrate` 顯示 `No pending migrations`，實際 API 的 versioned trip 與刪除歷史讀取均為 200 且通過 contracts guards。
- 以上是本機合成／E2E 資料，不是 production 容量或回復時間保證；production 切換前仍須執行副本演練。

## GitHub Deploy workflow

`.github/workflows/deploy.yml` 在每次 push 到 `main` 時部署，也支援手動觸發。Runner 與 repository 必須設定：

- self-hosted runner；
- `POSTGRES_PASSWORD` repository secret；
- `PASSKEY_ORIGIN` repository variable；
- 視 proxy 拓撲設定 `PASSKEY_TRUST_PROXY`、`DEVICE_AUTH_TRUST_PROXY` 與 `PASSWORD_AUTH_TRUST_PROXY` variables。

部署使用 Compose 內的 PostgreSQL，並等待 services 通過 health checks。
