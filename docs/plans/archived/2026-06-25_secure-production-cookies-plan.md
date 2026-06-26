## Goal

讓 production session cookie 預設帶 `Secure`，避免部署時忘記設定 `COOKIE_SECURE=true` 而讓登入 cookie 可透過 HTTP 傳送。

## Context

目前 `setSessionCookie` 只有在 `COOKIE_SECURE=true` 時加入 `Secure`。`compose.yml` 會設定 `NODE_ENV=production`，但沒有設定 `COOKIE_SECURE`，因此 production-like 啟動預設不會使用 Secure cookie。

## Non-Goals

- 不導入新安全套件。
- 不改變 session 儲存、登入流程或 SameSite 策略。

## Plan

- [x] Update cookie helper code so `NODE_ENV=production` uses `Secure` by default, while `COOKIE_SECURE=false` can disable it for trusted HTTP testing; verified with unit tests.
- [x] Add tests for default development cookies, production default Secure cookies, and explicit `COOKIE_SECURE` overrides; verified with `npm test`.
- [x] Update README and `docs/progress-log.md`; verified by reading both files.
- [x] Run full QA and compose smoke; verified with DB-backed `TEST_DATABASE_URL=postgres://otter:otter_dev_password@127.0.0.1:55432/otter_dev npm test`, `npm run check`, `docker compose -f compose.dev.yml up --build -d`, and `curl http://127.0.0.1:3000/api/me`.

## Risks

- Production deployments that intentionally serve over plain HTTP must set `COOKIE_SECURE=false`; accepted because production cookies should default secure.

## Completion Checklist

- [x] Production session cookies default to `Secure`, verified by unit test.
- [x] Development cookies remain non-`Secure` by default, verified by unit test.
- [x] `COOKIE_SECURE=true/false` overrides are honored, verified by unit test.
- [x] README and progress log mention the completed change, verified by reading both files.
- [x] Full quality gate passes, verified by `npm run check`.
- [x] Dev compose still starts app + Postgres, verified by curling `/api/me`.
