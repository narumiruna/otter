---
"@narumitw/otter-api": minor
"@narumitw/otter-web": minor
"@narumitw/otter-contracts": minor
---

Add pi-ai provider connections and account-level model and thinking settings. Select the authentication method before searching providers. Store provider credentials with server-side encryption and keep AI inference out of scope.

Keep new OpenAI connections on API-key authentication and use device authorization only for OpenAI Codex account sign-in. Reject fixed-port OpenAI OAuth before starting the SDK. Keep existing credentials and model preferences unchanged.
