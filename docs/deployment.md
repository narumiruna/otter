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

Passkey 會驗證 WebAuthn relying party 與瀏覽器 origin。Relying party ID 使用 `PASSKEY_ORIGIN` 的 hostname。變更網域後，舊 Passkey 不會在新的 relying party 生效；使用者須以密碼登入並重新新增。

只有在可信任的 reverse proxy 會覆寫 `X-Forwarded-For` 或 `X-Real-IP`，且 app port 無法由外部直接存取時，才可啟用 `PASSKEY_TRUST_PROXY`、`DEVICE_AUTH_TRUST_PROXY` 或 `PASSWORD_AUTH_TRUST_PROXY`。否則 client 可偽造 headers 繞過限流。

## Migration 相容性

- `011_username_auth.sql` 將 `users.email` 改名為 `users.username`，保留既有帳號值、密碼、sessions 與群組關聯。既有使用者可用原 Email 作為 Username 登入。
- `012_passkeys.sql` 新增 Passkey credentials 與短效 challenges，不修改既有帳號、密碼或 sessions。

## GitHub Deploy workflow

`.github/workflows/deploy.yml` 在每次 push 到 `main` 時部署，也支援手動觸發。Runner 與 repository 必須設定：

- self-hosted runner；
- `POSTGRES_PASSWORD` repository secret；
- `PASSKEY_ORIGIN` repository variable；
- 視 proxy 拓撲設定 `PASSKEY_TRUST_PROXY`、`DEVICE_AUTH_TRUST_PROXY` 與 `PASSWORD_AUTH_TRUST_PROXY` variables。

部署使用 Compose 內的 PostgreSQL，並等待 services 通過 health checks。
