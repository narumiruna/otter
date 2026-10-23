import type {
  AiLoginResponse,
  AiLoginState,
  AiSettingsResponse,
} from "@narumitw/otter-contracts";
import { expect, onTestFinished, test, vi } from "vitest";
import { decryptAiCredential } from "./server-ai-credentials.js";
import { aiProviders } from "./server-ai-providers.js";
import {
  api,
  postgresTestOptions,
  type UserResponse,
  withTestApp,
} from "./server-test-utils.js";

test(
  "real built-in SDK API-key login prompts through browser routes and saves encrypted credentials without provider requests",
  postgresTestOptions,
  async () => {
    const key = Buffer.alloc(32, 19);
    vi.stubEnv("ENCRYPTION_KEY", key.toString("hex"));
    vi.stubEnv("OPENAI_API_KEY", "ambient-server-key-must-not-be-used");
    const { baseUrl, pool } = await withTestApp(); // No injected login implementation.
    const provider = aiProviders.find(({ id }) => id === "openai");
    if (!provider?.auth.apiKey?.login)
      throw new Error("Expected SDK API-key login");
    const sdkLogin = vi.spyOn(provider.auth.apiKey, "login"); // Calls the real SDK method.
    const fetch = globalThis.fetch;
    const externalRequests: string[] = [];
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (input, init) => {
        const url = input instanceof Request ? input.url : String(input);
        if (new URL(url).origin !== baseUrl) {
          externalRequests.push(url);
          throw new Error(
            "Provider network request is not allowed in API-key login",
          );
        }
        return fetch(input, init);
      });
    onTestFinished(() => {
      sdkLogin.mockRestore();
      fetchSpy.mockRestore();
      vi.unstubAllEnvs();
    });
    const registration = await api<UserResponse>(
      baseUrl,
      "/api/auth/register",
      {
        method: "POST",
        body: JSON.stringify({
          username: "real-sdk-key",
          password: "password123",
        }),
      },
    );
    const cookie = registration.response.headers
      .get("set-cookie")
      ?.split(";")[0];
    const user = registration.data.user;
    if (!cookie || !user) throw new Error("Expected browser session");
    const started = await api<AiLoginResponse>(baseUrl, "/api/auth/ai/logins", {
      method: "POST",
      headers: { cookie },
      body: JSON.stringify({ provider: "openai", method: "api_key" }),
    });
    expect(started.response.status).toBe(201);
    expect(started.data.login.prompt).toBeUndefined();
    const id = started.data.login.id;
    async function poll(ready: (login: AiLoginState) => boolean) {
      for (let attempt = 0; attempt < 100; attempt++) {
        const response = await api<AiLoginResponse>(
          baseUrl,
          `/api/auth/ai/logins/${id}`,
          { headers: { cookie: cookie ?? "" } },
        );
        expect(response.response.status).toBe(200);
        if (ready(response.data.login)) return response.data.login;
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      throw new Error("Expected login state");
    }
    const pending = await poll((login) => !!login.prompt);
    expect(pending.prompt).toMatchObject({
      type: "secret",
      message: "Enter OpenAI API key",
    });
    if (!pending.prompt) throw new Error("Expected API-key prompt");
    const secret = "dummy-sdk-local-key-not-a-real-credential";
    const response = await api<AiLoginResponse>(
      baseUrl,
      `/api/auth/ai/logins/${id}/respond`,
      {
        method: "POST",
        headers: { cookie },
        body: JSON.stringify({ promptId: pending.prompt.id, value: secret }),
      },
    );
    expect(JSON.stringify(response.data)).not.toContain(secret);
    expect((await poll((login) => login.status !== "pending")).status).toBe(
      "complete",
    );
    expect(sdkLogin).toHaveBeenCalledOnce();
    const rows = await pool.query<{ encrypted_credential: Buffer }>(
      "SELECT encrypted_credential FROM user_ai_credentials WHERE user_id = $1 AND provider = 'openai'",
      [user.id],
    );
    const encrypted = rows.rows[0]?.encrypted_credential;
    if (!encrypted) throw new Error("Expected stored ciphertext");
    expect(encrypted.includes(Buffer.from(secret))).toBe(false);
    expect(decryptAiCredential(key, user.id, "openai", encrypted)).toEqual({
      type: "api_key",
      key: secret,
    });
    const settings = {
      provider: "openai",
      model: "gpt-4o-mini",
      thinkingLevel: "off",
    };
    const saved = await api<AiSettingsResponse>(
      baseUrl,
      "/api/auth/ai/settings",
      { method: "PUT", headers: { cookie }, body: JSON.stringify(settings) },
    );
    expect(saved.data).toEqual({ settings });
    expect(externalRequests).toEqual([]);
  },
);
