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

## 環境變數

| 變數 | 用途 |
| --- | --- |
| `DATABASE_URL` | 使用外部 PostgreSQL。未設定時，container 會由 `POSTGRES_PASSWORD` 組成 Compose database URL。 |
| `POSTGRES_PASSWORD` | Compose PostgreSQL 密碼；正式環境必須明確設定。 |
| `PASSKEY_ORIGIN` | WebAuthn origin，只能包含 scheme、hostname 與選填 port。除 `localhost` 外必須使用 HTTPS。 |
| `PASSKEY_TRUST_PROXY` | 信任 reverse proxy 提供的 client IP，供 Passkey request rate limiting 使用。預設 `false`。 |
| `DEVICE_AUTH_TRUST_PROXY` | 信任 reverse proxy 提供的 client IP，供 device authorization rate limiting 使用。預設 `false`。 |
| `COOKIE_SECURE` | Production 預設為 secure。只在可信任的 HTTP 測試環境設為 `false`。 |
| `PORT` | App port，預設 `17463`。 |

不要提交 `.env*`、資料庫 dumps 或 credentials。`.env.example` 只包含本機開發預設值。

## Passkey 與 proxy

Passkey 會驗證 WebAuthn relying party 與瀏覽器 origin。Relying party ID 使用 `PASSKEY_ORIGIN` 的 hostname。變更網域後，舊 Passkey 不會在新的 relying party 生效；使用者須以密碼登入並重新新增。

只有在可信任的 reverse proxy 會覆寫 `X-Forwarded-For` 或 `X-Real-IP`，且 app port 無法由外部直接存取時，才可啟用 `PASSKEY_TRUST_PROXY` 或 `DEVICE_AUTH_TRUST_PROXY`。否則 client 可偽造 headers 繞過限流。

## Migration 相容性

- `011_username_auth.sql` 將 `users.email` 改名為 `users.username`，保留既有帳號值、密碼、sessions 與群組關聯。既有使用者可用原 Email 作為 Username 登入。
- `012_passkeys.sql` 新增 Passkey credentials 與短效 challenges，不修改既有帳號、密碼或 sessions。

## GitHub Deploy workflow

`.github/workflows/deploy.yml` 在每次 push 到 `main` 時部署，也支援手動觸發。Runner 與 repository 必須設定：

- self-hosted runner；
- `POSTGRES_PASSWORD` repository secret；
- `PASSKEY_ORIGIN` repository variable；
- 視 proxy 拓撲設定 `PASSKEY_TRUST_PROXY` 與 `DEVICE_AUTH_TRUST_PROXY` variables。

部署使用 Compose 內的 PostgreSQL，並等待 services 通過 health checks。
