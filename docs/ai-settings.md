# AI account settings

Otter stores a separate provider connection for each account. Login uses the provider-owned `pi-ai` API-key or OAuth login method. This feature does not send prompts to models, run inference, or check an API key with a model request. An API-key connection means that Otter saved the entered key, not that the provider verified it.

## Encryption key

Set `ENCRYPTION_KEY` to a 32-byte key encoded as exactly 64 hexadecimal characters to enable new connections. Uppercase and lowercase letters are accepted. Base64, `0x` prefixes, and whitespace are not accepted. An absent or invalid key sets catalog `authenticationEnabled` to `false` and makes new login requests return 503. Settings reads, connection metadata, and disconnect remain available. Otter never uses plaintext storage or a generated temporary key as a fallback.

For a new installation, generate the key **once** and save it outside the repository and container. For an existing installation, keep the same key bytes and follow [Upgrade from Base64](#upgrade-from-base64).

```bash
# AI_KEY_FILE must point to a protected, durable file outside the repository.
umask 077
openssl rand -hex 32 > "$AI_KEY_FILE"
export ENCRYPTION_KEY="$(tr -d '\r\n' < "$AI_KEY_FILE")"
docker compose up --detach --build
```

Do not run key generation during container startup or restart. Supply the same saved value after each restart and deployment. A secret manager can supply the value instead of a file. Do not put it in source code, an image, command arguments, browser storage, or logs. Compose forwards the host variable to the API container.

Migration `026_user_ai_credentials.sql` stores one credential per `(user_id, provider)` in PostgreSQL. AES-256-GCM uses a fresh nonce for each write. Authenticated additional data binds the ciphertext to the account, provider, and format version. Account deletion removes credentials through a cascading foreign key. Connection lists contain only provider and method metadata; they do not decrypt credentials. Encryption does not protect against a compromised running API process with access to both the database and key.

### Upgrade from Base64

This version accepts hex only. Before deployment:

1. Back up the existing key in protected storage. Do not generate a replacement key.
2. Check the saved encoding.
   - If the key is already 64 hexadecimal characters, keep it unchanged.
   - If the key is Base64, decode it to 32 bytes and encode those same bytes as 64 hexadecimal characters. Update the durable secret and `ENCRYPTION_KEY` together.
3. Deploy the API and restart it with the hex value. Verify that the catalog returns `authenticationEnabled: true`.

The decoded key bytes, saved ciphertext, and installation device ID stay unchanged. No database migration or credential rewrite is required. For rollback to the previous API, encode the same 32 bytes as Base64 again. Never generate a new key as part of an encoding change.

## Browser login process

1. Read `GET /api/auth/ai/catalog` and `GET /api/auth/ai/connections`.
   - Catalog provider names and authentication methods come from built-in provider metadata. Model options come only from the packaged chat catalog. No dynamic catalog, server environment credential, or local credential file is loaded.
2. Send `POST /api/auth/ai/logins` with exactly `{ "provider": "openai-codex", "method": "oauth" }` for Codex device authorization, or `{ "provider": "openai", "method": "api_key" }` for an OpenAI API key.
   - HTTP 201 returns an initial pending `login`. The SDK login starts asynchronously.
   - `openai` OAuth is not offered. A direct request for this provider/method returns HTTP 400 before the SDK starts.
3. Poll `GET /api/auth/ai/logins/:id` while status is `pending`.
   - Show SDK information, authorization links, device codes, and progress events.
   - A prompt has an opaque `id` and type `text`, `secret`, `manual_code`, or `select`. A select response is the option ID.
4. Send `POST /api/auth/ai/logins/:id/respond` with exactly `{ "promptId": "...", "value": "..." }`.
   - Send API keys and pasted final OAuth redirect URLs only in this JSON request body, never in an Otter URL. Do not keep them in browser storage or diagnostic output. Clear the input after submission.
   - Continue polling. A response to an old, cancelled, or completed prompt returns 400. Another account or browser session receives 404.
5. Wait for `complete` before saving provider/model/thinking settings with `PUT /api/auth/ai/settings`.
   - Settings require this account's saved provider connection. Server environment authentication does not satisfy this rule. Thinking levels must match `getSupportedThinkingLevels` for the selected chat model.
   - `error` contains no raw SDK exception. Cancel and retry the login if necessary.
6. Use `DELETE /api/auth/ai/logins/:id` to cancel. Use `DELETE /api/auth/ai/connections/:provider` to disconnect.
   - Both return HTTP 200 with `{ "ok": true }`.
   - Cancel waits for an in-flight login/save to stop. If a successful save already reached database commit, cancellation does not undo it. Refresh the connection list after cancellation. Do not assume cancellation revoked an existing connection.
   - Disconnect cancels pending logins for this account/provider and removes its credential. It removes selected settings in the same database transaction if they use that provider. Other providers and accounts are not changed.

All routes require an active browser session and reject Authorization and share-token headers, even with a valid cookie. All responses use `Cache-Control: no-store`. All mutations, including DELETE, require `Content-Type: application/json`. Cross-site Fetch Metadata and mismatched Origin hosts are rejected. The API does not trust forwarded host headers. A reverse proxy must preserve the public `Host` header. Use HTTPS. Do not log request bodies, cookies, authorization redirects, or credentials at the API or proxy.

Login state is bounded, process-local memory, not PostgreSQL. Use one API instance. Each process keeps at most 100 states and each account at most three states, including finished states during retention. Limits return 429. Pending logins expire after 10 minutes and cancel the SDK operation. Completed/error states clear events and prompts immediately and expire after one minute. Explicit cancellation removes the state immediately. Restarting the API loses pending logins, not saved encrypted credentials. Per-prompt SDK abort signals remove obsolete prompts. Responses require the current prompt ID. Input is never saved before the SDK returns a successful credential; a failed login or a login cancelled before persistence leaves the earlier credential unchanged.

## Provider restrictions

- Anthropic OAuth automatically selects the SDK `copy_code` flow. It does not start Anthropic's local callback listener.
- OpenAI supports new API-key connections only. Its SDK OAuth flow reserves the shared callback port 1455, so Otter does not advertise or start that flow. One account cannot reserve this port through an OpenAI OAuth request.
- OpenAI Codex account sign-in uses the SDK `device_code` method automatically. It shows the verification link and device code without a browser-method selector or callback listener.
  - An unsupported SDK prompt, a missing device-code choice, or a provider rejection fails the login. Otter never falls back to browser login.
  - `openai` and `openai-codex` remain separate providers with separate model catalogs. Otter does not rename, copy, or remap existing credentials or saved model preferences. Existing OpenAI OAuth connections remain listed, retain their saved preferences, and can be disconnected.
  - The SDK handles device authorization and token exchange. Otter does not implement a separate OAuth protocol.
- OpenRouter supports a manual redirect URL. Other built-in device flows use the SDK device-code interaction.
- GitHub Copilot supports only a blank domain or `github.com`. Arbitrary enterprise domains are rejected before the SDK can use them as network targets. Copilot login can list and enable provider models as part of authentication, but does not run inference.
- Bedrock automatically selects a bearer token. AWS profiles and the server credential chain are not available.
- Vertex AI automatically selects an API key. ADC and service-account file paths are not available.
- Cloudflare account and gateway fields accept only letters, digits, underscores, and hyphens, up to 128 characters. Custom URLs, paths, and query strings are not accepted.
- Radius OAuth is not exposed in this remote browser integration. Its browser callback path requires a local callback; use a Radius API key instead.
- Custom base URLs, server file paths, and server environment authentication are not accepted. New SDK prompt forms are rejected until reviewed. Do not set `PI_OAUTH_CALLBACK_HOST`, `KIMI_CODE_OAUTH_HOST`, or `KIMI_OAUTH_HOST` in the API environment. OAuth login fails closed if these SDK override variables are set, rather than inheriting their endpoints or exposing a callback listener.

## Deployment, backups, and rollback

1. Back up PostgreSQL and the existing key before an upgrade. Keep the key backup separate from database backups, encrypted and access-controlled. Product trip JSON exports do not contain AI credentials.
2. Apply migrations 025 and 026 before deploying this API. Keep existing expense tables and data unchanged. Old saved AI selections do not create credentials; users must connect a provider before saving settings again.
3. Supply the durable key, start one API instance, and verify the catalog flag. Test login, metadata-only listing, disconnect, and an API restart with the same key.
4. Test a PostgreSQL restore in an isolated environment with the matching key. Verify credential decryption for the correct account/provider and failure with a changed key or modified ciphertext. Do not print decrypted values.

Changing the key alone does not rotate existing ciphertext. This version has no automatic key-rotation command. To change keys, stop logins and coordinate a controlled decrypt/re-encrypt migration, or explicitly discard saved connections and require users to reconnect. Loss of the key makes saved credentials unrecoverable. Never replace a missing key with a new generated key and assume old connections still work.

For rollback of the account settings feature, stop new logins and restore the earlier API/Web pair. Keep the additive tables and key backup; do not drop credential rows or restore the whole database merely to remove this feature. An older API does not know the credential connection checks; do not leave old and new instances active together. If a credential is compromised, revoke it with its provider as well as disconnecting it in Otter. Disconnect deletes Otter's copy; it does not perform provider-side token revocation.

### Shared-port OAuth fix rollout

Deploy the corrected API and web build together. Restart every API instance to stop pending logins created by the earlier version and release their callback listeners. Do not leave an older API instance active alongside the fixed version.

This fix does not require a database migration, credential rewrite, or encryption-key change. Do not roll back to a build that re-enables fixed-port OpenAI OAuth. If device authorization is unavailable, keep the restricted methods and use API-key sign-in until a safe flow is available.
