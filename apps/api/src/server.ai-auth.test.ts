import type {
  AiConnectionsResponse,
  AiLoginResponse,
  AiLoginState,
  AiSettingsResponse,
} from "@narumitw/otter-contracts";
import { expect, onTestFinished, test, vi } from "vitest";
import { createApp } from "./server.js";
import {
  decryptAiCredential,
  encryptAiCredential,
} from "./server-ai-credentials.js";
import type { AiProviderLogin } from "./server-ai-providers.js";
import {
  api,
  postgresTestOptions,
  type UserResponse,
  withTestApp,
} from "./server-test-utils.js";

const key = Buffer.alloc(32, 37);
const settings = {
  provider: "openai",
  model: "gpt-4o-mini",
  thinkingLevel: "off",
} as const;

test.each(["oauth", "api_key"] as const)(
  "existing OpenAI %s credentials and selections remain readable and disconnectable without migration",
  postgresTestOptions,
  async (method) => {
    vi.stubEnv("ENCRYPTION_KEY", key.toString("hex"));
    onTestFinished(() => vi.unstubAllEnvs());
    const login = vi.fn<AiProviderLogin>(async () => {
      throw new Error("SDK must not start");
    });
    const { baseUrl, pool } = await withTestApp({
      appOptions: { aiAuth: { login } },
    });
    const registered = await api<UserResponse>(baseUrl, "/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        username: "existing-openai-account",
        password: "password123",
      }),
    });
    const cookie = registered.response.headers.get("set-cookie")?.split(";")[0];
    const user = registered.data.user;
    if (!cookie || !user) throw new Error("Expected dummy account session");
    const credential =
      method === "oauth"
        ? ({
            type: "oauth",
            access: "dummy-old-access",
            refresh: "dummy-old-refresh",
            expires: 9999999999999,
          } as const)
        : ({ type: "api_key", key: "dummy-old-key" } as const);
    const encrypted = encryptAiCredential(key, user.id, "openai", credential);
    await pool.query(
      "INSERT INTO user_ai_credentials (user_id, provider, method, encrypted_credential) VALUES ($1, $2, $3, $4)",
      [user.id, "openai", method, encrypted],
    );
    expect(
      (
        await api<AiSettingsResponse>(baseUrl, "/api/auth/ai/settings", {
          method: "PUT",
          headers: { cookie },
          body: JSON.stringify(settings),
        })
      ).data,
    ).toEqual({ settings });
    for (let attempt = 0; attempt < 2; attempt++) {
      const rejected = await api(baseUrl, "/api/auth/ai/logins", {
        method: "POST",
        headers: { cookie },
        body: JSON.stringify({ provider: "openai", method: "oauth" }),
      });
      expect(rejected.response.status).toBe(400);
      expect(rejected.response.headers.get("cache-control")).toBe("no-store");
    }
    expect(login).not.toHaveBeenCalled();
    const rows = await pool.query<{
      user_id: string;
      provider: string;
      method: string;
      encrypted_credential: Buffer;
    }>(
      "SELECT user_id, provider, method, encrypted_credential FROM user_ai_credentials",
    );
    expect(rows.rows).toEqual([
      {
        user_id: user.id,
        provider: "openai",
        method,
        encrypted_credential: encrypted,
      },
    ]);
    expect(decryptAiCredential(key, user.id, "openai", encrypted)).toEqual(
      credential,
    );
    // Recreate the app to read the existing record, not a broker result.
    const app = createApp(pool);
    expect(
      await (
        await app.request("/api/auth/ai/connections", { headers: { cookie } })
      ).json(),
    ).toEqual({ connections: [{ provider: "openai", method }] });
    expect(
      await (
        await app.request("/api/auth/ai/settings", { headers: { cookie } })
      ).json(),
    ).toEqual({ settings });
    const disconnected = await app.request("/api/auth/ai/connections/openai", {
      method: "DELETE",
      headers: { cookie, "Content-Type": "application/json" },
    });
    expect(disconnected.status).toBe(200);
    expect(
      (await pool.query("SELECT user_id FROM user_ai_credentials")).rowCount,
    ).toBe(0);
    expect(
      await (
        await app.request("/api/auth/ai/settings", { headers: { cookie } })
      ).json(),
    ).toEqual({ settings: null });
  },
);

async function poll(
  baseUrl: string,
  cookie: string,
  id: string,
  ready: (state: AiLoginState) => boolean,
): Promise<AiLoginState> {
  for (let attempt = 0; attempt < 100; attempt++) {
    const { data, response } = await api<AiLoginResponse>(
      baseUrl,
      `/api/auth/ai/logins/${id}`,
      { headers: { cookie } },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    if (ready(data.login)) return data.login;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Login did not reach expected state");
}

test(
  "browser login stores only encrypted own credentials; failed replacements preserve prior data; disconnect clears selected settings",
  postgresTestOptions,
  async () => {
    vi.stubEnv("ENCRYPTION_KEY", key.toString("hex"));
    onTestFinished(() => vi.unstubAllEnvs());
    let fail = false;
    const { baseUrl, pool } = await withTestApp({
      appOptions: {
        aiAuth: {
          login: async (provider, method, interaction) => {
            if (method === "oauth") {
              expect(provider.id).toBe("anthropic");
              expect(
                await interaction.prompt({
                  type: "select",
                  message: "Method",
                  options: [
                    { id: "browser", label: "Browser" },
                    { id: "copy_code", label: "Copy" },
                  ],
                }),
              ).toBe("copy_code");
              interaction.notify({
                type: "auth_url",
                url: "https://claude.ai/oauth/authorize?state=example",
                instructions: "Paste code",
              });
              const code = await interaction.prompt({
                type: "manual_code",
                message: "Paste code",
              });
              expect(code).toBe("private-oauth-code");
              return {
                type: "oauth",
                access: "private-oauth-access",
                refresh: "private-oauth-refresh",
                expires: 9999999999999,
              };
            }
            const secret = await interaction.prompt({
              type: "secret",
              message: "Enter API key",
            });
            if (fail) throw new Error(`Private SDK exception with ${secret}`);
            return { type: "api_key", key: secret };
          },
        },
      },
    });
    async function register(username: string) {
      const result = await api<UserResponse>(baseUrl, "/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ username, password: "password123" }),
      });
      const cookie = result.response.headers.get("set-cookie")?.split(";")[0];
      if (!cookie || !result.data.user) throw new Error("Expected session");
      return { cookie, user: result.data.user };
    }
    const a = await register("ai-auth-account-a");
    const b = await register("ai-auth-account-b");
    const secondBrowser = await api<UserResponse>(baseUrl, "/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        username: a.user.username,
        password: "password123",
      }),
    });
    const secondCookie = secondBrowser.response.headers
      .get("set-cookie")
      ?.split(";")[0];
    if (!secondCookie) throw new Error("Expected second session");
    const save = () =>
      api<AiSettingsResponse>(baseUrl, "/api/auth/ai/settings", {
        method: "PUT",
        headers: { cookie: a.cookie },
        body: JSON.stringify(settings),
      });
    expect((await save()).response.status).toBe(400);

    async function start(provider = "openai", method = "api_key") {
      const result = await api<AiLoginResponse>(
        baseUrl,
        "/api/auth/ai/logins",
        {
          method: "POST",
          headers: { cookie: a.cookie },
          body: JSON.stringify({ provider, method }),
        },
      );
      expect(result.response.status).toBe(201);
      expect(result.data.login).toMatchObject({
        provider,
        method,
        status: "pending",
        events: [],
      });
      expect(result.data.login.prompt).toBeUndefined();
      return result.data.login;
    }
    async function respond(id: string, promptId: string, value: string) {
      return api<AiLoginResponse>(
        baseUrl,
        `/api/auth/ai/logins/${id}/respond`,
        {
          method: "POST",
          headers: { cookie: a.cookie },
          body: JSON.stringify({ promptId, value }),
        },
      );
    }
    const initial = await start();
    const pending = await poll(
      baseUrl,
      a.cookie,
      initial.id,
      (state) => !!state.prompt,
    );
    if (!pending.prompt) throw new Error("Expected prompt");
    expect(
      await pool.query("SELECT provider FROM user_ai_credentials"),
    ).toMatchObject({ rowCount: 0 });
    for (const cookie of [b.cookie, secondCookie]) {
      for (const [path, method, body] of [
        [`/api/auth/ai/logins/${initial.id}`, "GET", undefined],
        [
          `/api/auth/ai/logins/${initial.id}/respond`,
          "POST",
          JSON.stringify({ promptId: pending.prompt.id, value: "stolen" }),
        ],
        [`/api/auth/ai/logins/${initial.id}`, "DELETE", undefined],
      ]) {
        expect(
          (
            await api(baseUrl, path ?? "", {
              method,
              headers: { cookie },
              body,
            })
          ).response.status,
        ).toBe(404);
      }
    }
    expect(
      (await respond(initial.id, "stale", "private-api-key")).response.status,
    ).toBe(400);
    const response = await respond(
      initial.id,
      pending.prompt.id,
      "private-api-key",
    );
    expect(JSON.stringify(response.data)).not.toContain("private-api-key");
    const complete = await poll(
      baseUrl,
      a.cookie,
      initial.id,
      (state) => state.status !== "pending",
    );
    expect(complete.status).toBe("complete");
    expect(complete.events).toEqual([]);
    expect(complete.prompt).toBeUndefined();
    expect(JSON.stringify(complete)).not.toContain("private-api-key");
    expect(
      (await respond(initial.id, pending.prompt.id, "replay")).response.status,
    ).toBe(400);
    const stored = await pool.query<{
      encrypted_credential: Buffer;
      method: string;
    }>(
      "SELECT encrypted_credential, method FROM user_ai_credentials WHERE user_id = $1 AND provider = 'openai'",
      [a.user.id],
    );
    const encrypted = stored.rows[0]?.encrypted_credential;
    if (!encrypted) throw new Error("Expected encrypted credential");
    expect(encrypted.includes(Buffer.from("private-api-key"))).toBe(false);
    expect(decryptAiCredential(key, a.user.id, "openai", encrypted)).toEqual({
      type: "api_key",
      key: "private-api-key",
    });
    expect((await save()).data).toEqual({ settings });

    // A new app reads the durable metadata without decrypting or using server auth.
    const reloaded = await createApp(pool).request("/api/auth/ai/connections", {
      headers: { cookie: a.cookie },
    });
    expect(await reloaded.json()).toEqual({
      connections: [{ provider: "openai", method: "api_key" }],
    });
    expect(
      (
        await api<AiConnectionsResponse>(baseUrl, "/api/auth/ai/connections", {
          headers: { cookie: b.cookie },
        })
      ).data,
    ).toEqual({ connections: [] });
    fail = true;
    const failed = await start();
    const failedPrompt = (
      await poll(baseUrl, a.cookie, failed.id, (state) => !!state.prompt)
    ).prompt;
    if (!failedPrompt) throw new Error("Expected prompt");
    await respond(failed.id, failedPrompt.id, "private-failed-key");
    const error = await poll(
      baseUrl,
      a.cookie,
      failed.id,
      (state) => state.status !== "pending",
    );
    expect(error).toMatchObject({ status: "error", events: [] });
    expect(JSON.stringify(error)).not.toContain("private");
    const cancelled = await start();
    await poll(baseUrl, a.cookie, cancelled.id, (state) => !!state.prompt);
    expect(
      (
        await api(baseUrl, `/api/auth/ai/logins/${cancelled.id}`, {
          method: "DELETE",
          headers: { cookie: a.cookie },
        })
      ).response.status,
    ).toBe(200);
    expect(
      (
        await api(baseUrl, `/api/auth/ai/logins/${cancelled.id}`, {
          headers: { cookie: a.cookie },
        })
      ).response.status,
    ).toBe(404);
    const unchanged = await pool.query<{ encrypted_credential: Buffer }>(
      "SELECT encrypted_credential FROM user_ai_credentials WHERE user_id = $1 AND provider = 'openai'",
      [a.user.id],
    );
    expect(unchanged.rows[0]?.encrypted_credential).toEqual(encrypted);

    const oauth = await start("anthropic", "oauth");
    const oauthPending = await poll(
      baseUrl,
      a.cookie,
      oauth.id,
      (state) => !!state.prompt,
    );
    expect(oauthPending.events[0]?.type).toBe("auth_url");
    if (!oauthPending.prompt) throw new Error("Expected OAuth prompt");
    await respond(oauth.id, oauthPending.prompt.id, "private-oauth-code");
    expect(
      (
        await poll(
          baseUrl,
          a.cookie,
          oauth.id,
          (state) => state.status !== "pending",
        )
      ).status,
    ).toBe("complete");
    const connections = await api<AiConnectionsResponse>(
      baseUrl,
      "/api/auth/ai/connections",
      { headers: { cookie: a.cookie } },
    );
    expect(connections.data).toEqual({
      connections: [
        { provider: "anthropic", method: "oauth" },
        { provider: "openai", method: "api_key" },
      ],
    });
    expect(JSON.stringify(connections.data)).not.toContain("private");
    // Disconnect in another account cannot affect this account's selection.
    await api(baseUrl, "/api/auth/ai/connections/openai", {
      method: "DELETE",
      headers: { cookie: b.cookie },
    });
    expect(
      (
        await api<AiSettingsResponse>(baseUrl, "/api/auth/ai/settings", {
          headers: { cookie: a.cookie },
        })
      ).data,
    ).toEqual({ settings });
    const disconnected = await api(baseUrl, "/api/auth/ai/connections/openai", {
      method: "DELETE",
      headers: { cookie: a.cookie },
    });
    expect(disconnected.response.status).toBe(200);
    expect(
      (
        await api<AiSettingsResponse>(baseUrl, "/api/auth/ai/settings", {
          headers: { cookie: a.cookie },
        })
      ).data,
    ).toEqual({ settings: null });
    expect((await save()).response.status).toBe(400);
    expect(
      (
        await api<AiConnectionsResponse>(baseUrl, "/api/auth/ai/connections", {
          headers: { cookie: a.cookie },
        })
      ).data.connections,
    ).toEqual([{ provider: "anthropic", method: "oauth" }]);
    await pool.query("DELETE FROM users WHERE id = $1", [a.user.id]);
    expect(
      (await pool.query("SELECT user_id FROM user_ai_credentials")).rowCount,
    ).toBe(0);
  },
);
