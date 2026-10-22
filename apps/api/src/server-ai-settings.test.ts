import { getSupportedThinkingLevels } from "@earendil-works/pi-ai/models";
import {
  builtinProviders,
  getBuiltinModels,
  getBuiltinProviders,
} from "@earendil-works/pi-ai/providers/all";
import {
  type AiCatalogResponse,
  type AiSettings,
  isAiSettings,
} from "@narumitw/otter-contracts";
import pg from "pg";
import { expect, onTestFinished, test, vi } from "vitest";
import { createApp } from "./server.js";

const settings: AiSettings = {
  provider: "openai",
  model: "gpt-4o-mini",
  thinkingLevel: "off",
};

function setup(connected = true) {
  vi.stubEnv("ENCRYPTION_KEY", "");
  onTestFinished(() => vi.unstubAllEnvs());
  const pool = new pg.Pool();
  const query = vi.spyOn(pool, "query");
  let stored: AiSettings | null = null;
  query.mockImplementation(async (sql, values: unknown) => {
    if (typeof sql !== "string") throw new Error("Expected SQL text");
    const result = { command: "", oid: 0, fields: [], rowCount: 0 };
    if (["BEGIN", "COMMIT", "ROLLBACK"].includes(sql))
      return { ...result, rows: [] };
    if (sql.includes("SELECT id FROM users"))
      return { ...result, rows: [{ id: "user_ai" }], rowCount: 1 };
    if (sql.includes("FROM user_ai_credentials"))
      return {
        ...result,
        rows: connected ? [{ provider: "openai" }] : [],
        rowCount: connected ? 1 : 0,
      };
    if (sql.startsWith("DELETE FROM sessions")) {
      return { ...result, rows: [] };
    }
    if (sql.includes("FROM sessions")) {
      return {
        ...result,
        rows: [
          {
            id: "user_ai",
            name: "AI account",
            username: "ai-account",
            password_hash: null,
            created_at: new Date(),
          },
        ],
      };
    }
    if (sql.includes("INSERT INTO user_ai_settings")) {
      if (!Array.isArray(values)) throw new Error("Expected SQL parameters");
      const candidate = {
        provider: values[1],
        model: values[2],
        thinkingLevel: values[3],
      };
      if (!isAiSettings(candidate)) throw new Error("Expected AI settings");
      stored = candidate;
      return { ...result, rows: [stored], rowCount: 1 };
    }
    if (sql.includes("FROM user_ai_settings")) {
      return { ...result, rows: stored ? [stored] : [] };
    }
    throw new Error(`Unexpected query: ${sql}`);
  });
  const connect = vi
    .spyOn(pool, "connect")
    .mockResolvedValue(
      Object.assign(new pg.Client(), { query, release: vi.fn() }),
    );
  onTestFinished(async () => {
    connect.mockRestore();
    query.mockRestore();
    await pool.end();
  });
  return { app: createApp(pool), query };
}

const cookie = "otter_session=test-browser-session";

function save(
  app: ReturnType<typeof createApp>,
  body: unknown,
  headers: Record<string, string> = { cookie },
) {
  return app.request("/api/auth/ai/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

test("AI endpoints require a browser session and reject bearer and share access", async () => {
  const { app, query } = setup();
  for (const headers of [
    {},
    { authorization: "Bearer otter_api_test" },
    { "X-Otter-Share-Token": "test-share" },
    { cookie, authorization: "Bearer otter_api_test" },
    { cookie, "X-Otter-Share-Token": "test-share" },
  ]) {
    for (const path of [
      "/api/auth/ai/catalog",
      "/api/auth/ai/settings",
      "/api/auth/ai/connections",
      "/api/auth/ai/logins/not-owned",
    ]) {
      const response = await app.request(path, { headers });
      expect(response.status).toBe(401);
      expect(response.headers.get("cache-control")).toBe("no-store");
    }
    expect((await save(app, settings, headers)).status).toBe(401);
    for (const [path, method] of [
      ["/api/auth/ai/logins", "POST"],
      ["/api/auth/ai/logins/id/respond", "POST"],
      ["/api/auth/ai/logins/id", "DELETE"],
      ["/api/auth/ai/connections/openai", "DELETE"],
    ]) {
      expect((await app.request(path ?? "", { method, headers })).status).toBe(
        401,
      );
    }
    // Authentication must run before JSON parsing.
    expect(
      (
        await app.request("/api/auth/ai/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...headers },
          body: "{",
        })
      ).status,
    ).toBe(401);
  }
  expect(query).not.toHaveBeenCalled();
});

test("AI catalog exposes only static chat options and exact supported thinking levels", async () => {
  const { app, query } = setup();
  const fetch = vi
    .spyOn(globalThis, "fetch")
    .mockRejectedValue(new Error("Catalog must not use the network"));
  onTestFinished(() => fetch.mockRestore());
  const response = await app.request("/api/auth/ai/catalog", {
    headers: { cookie },
  });
  expect(response.status).toBe(200);
  const data: AiCatalogResponse = await response.json();
  expect(data).toEqual({
    authenticationEnabled: false,
    providers: getBuiltinProviders()
      .map((provider) => ({
        id: provider,
        name:
          builtinProviders().find(({ id }) => id === provider)?.name ??
          provider,
        authMethods: [
          ...(builtinProviders().find(({ id }) => id === provider)?.auth
            .oauth && provider !== "radius"
            ? ["oauth"]
            : []),
          ...(builtinProviders().find(({ id }) => id === provider)?.auth.apiKey
            ?.login
            ? ["api_key"]
            : []),
        ],
        models: getBuiltinModels(provider).map((model) => ({
          id: model.id,
          name: model.name,
          thinkingLevels: getSupportedThinkingLevels(model),
        })),
      }))
      .filter((provider) => provider.models.length > 0),
  });
  expect(data.providers.length).toBeGreaterThan(0);
  const models = data.providers.flatMap((provider) => provider.models);
  expect(models.some((model) => model.thinkingLevels.includes("max"))).toBe(
    true,
  );
  expect(models.some((model) => !model.thinkingLevels.includes("off"))).toBe(
    true,
  );
  expect(fetch).not.toHaveBeenCalled();
  expect(query).toHaveBeenCalledTimes(2); // Session lookup only.
});

test("AI settings stay null until saved and use only the session account", async () => {
  const { app, query } = setup();
  const initial = await app.request("/api/auth/ai/settings", {
    headers: { cookie },
  });
  expect(initial.status).toBe(200);
  expect(await initial.json()).toEqual({ settings: null });
  const saved = await save(app, settings);
  expect(saved.status).toBe(200);
  expect(await saved.json()).toEqual({ settings });
  expect(query).toHaveBeenCalledWith(
    expect.stringContaining("ON CONFLICT (user_id) DO UPDATE"),
    ["user_ai", "openai", "gpt-4o-mini", "off"],
  );
  const reloaded = await app.request("/api/auth/ai/settings", {
    headers: { cookie },
  });
  expect(await reloaded.json()).toEqual({ settings });
  expect(query).toHaveBeenLastCalledWith(
    expect.stringContaining("FROM user_ai_settings WHERE user_id = $1"),
    ["user_ai"],
  );
});

test.each(["off", "minimal", "low", "medium", "high", "xhigh", "max"] as const)(
  "AI settings accept a model that supports %s",
  async (thinkingLevel) => {
    const { app } = setup();
    const choice = getBuiltinProviders()
      .flatMap((provider) =>
        getBuiltinModels(provider).map((model) => ({ provider, model })),
      )
      .find(({ model }) =>
        getSupportedThinkingLevels(model).includes(thinkingLevel),
      );
    if (!choice) throw new Error(`Expected model supporting ${thinkingLevel}`);
    const selected: AiSettings = {
      provider: choice.provider,
      model: choice.model.id,
      thinkingLevel,
    };
    const response = await save(app, selected);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ settings: selected });
  },
);

test("AI settings reject expired or invalid browser sessions", async () => {
  const { app, query } = setup();
  query.mockResolvedValue({
    command: "",
    oid: 0,
    fields: [],
    rowCount: 0,
    rows: [],
  });
  for (const path of ["/api/auth/ai/catalog", "/api/auth/ai/settings"]) {
    expect((await app.request(path, { headers: { cookie } })).status).toBe(401);
  }
  expect((await save(app, settings)).status).toBe(401);
  expect(
    query.mock.calls.some(
      ([sql]) => typeof sql === "string" && sql.includes("user_ai_settings"),
    ),
  ).toBe(false);
});

test("AI settings require an own saved connection, not server environment auth", async () => {
  const { app } = setup(false);
  vi.stubEnv("OPENAI_API_KEY", "server-secret");
  onTestFinished(() => vi.unstubAllEnvs());
  const response = await save(app, settings);
  expect(response.status).toBe(400);
  expect(await response.text()).not.toContain("server-secret");
});

test("AI mutations reject cross-site requests and ignore forwarded hosts", async () => {
  const { app } = setup();
  for (const [path, method, body] of [
    ["/api/auth/ai/settings", "PUT", settings],
    ["/api/auth/ai/logins", "POST", { provider: "openai", method: "api_key" }],
    [
      "/api/auth/ai/logins/id/respond",
      "POST",
      { promptId: "id", value: "secret" },
    ],
    ["/api/auth/ai/logins/id", "DELETE", {}],
    ["/api/auth/ai/connections/openai", "DELETE", {}],
  ] as const) {
    for (const headers of [
      { "Sec-Fetch-Site": "cross-site" },
      { Origin: "https://attacker.example" },
      { Origin: "null" },
      {
        Origin: "https://attacker.example",
        "X-Forwarded-Host": "attacker.example",
      },
    ]) {
      const response = await app.request(path, {
        method,
        headers: { cookie, "Content-Type": "application/json", ...headers },
        body: JSON.stringify(body),
      });
      expect(response.status).toBe(403);
      expect(response.headers.get("cache-control")).toBe("no-store");
    }
    expect(
      (
        await app.request(path, {
          method,
          headers: { cookie },
          body: JSON.stringify(body),
        })
      ).status,
    ).toBe(400);
  }
  expect(
    (await save(app, settings, { cookie, Origin: "http://localhost" })).status,
  ).toBe(200);
});

test("AI connect is disabled without a valid persistent encryption key and accepts only exact method-first bodies", async () => {
  const { app } = setup();
  for (const body of [
    null,
    [],
    {},
    { provider: "openai" },
    { provider: "openai", method: "api_key", apiKey: "secret" },
    { provider: "unknown", method: "api_key" },
    { provider: "radius", method: "oauth" },
    { provider: "openai", method: "unknown" },
  ]) {
    expect(
      (
        await app.request("/api/auth/ai/logins", {
          method: "POST",
          headers: { cookie, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      ).status,
    ).toBe(400);
  }
  const disabled = await app.request("/api/auth/ai/logins", {
    method: "POST",
    headers: { cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ provider: "openai", method: "api_key" }),
  });
  expect(disabled.status).toBe(503);
  expect(disabled.headers.get("cache-control")).toBe("no-store");
});

test("AI settings reject malformed bodies and invalid catalog choices without saving", async () => {
  const { app, query } = setup();
  const invalidBodies: unknown[] = [
    null,
    [],
    true,
    "settings",
    {},
    { ...settings, provider: "" },
    { ...settings, model: 1 },
    { ...settings, thinkingLevel: "auto" },
    { ...settings, apiKey: "not-accepted" },
    { ...settings, baseUrl: "https://example.com" },
    { ...settings, userId: "another-account" },
    { ...settings, provider: "unknown" },
    { ...settings, model: "unknown" },
    { ...settings, provider: "anthropic" },
    { ...settings, provider: "openrouter", model: "~typesafe/jev-latest" }, // Classifier, not chat.
    { ...settings, thinkingLevel: "high" }, // Non-reasoning model.
    { ...settings, model: "gpt-5-mini", thinkingLevel: "max" },
  ];
  // Some reasoning models cannot disable thinking; do not add "off" yourself.
  for (const provider of getBuiltinProviders()) {
    const model = getBuiltinModels(provider).find(
      (model) => !getSupportedThinkingLevels(model).includes("off"),
    );
    if (model) {
      invalidBodies.push({ provider, model: model.id, thinkingLevel: "off" });
      break;
    }
  }
  for (const body of invalidBodies) {
    const response = await save(app, body);
    expect(response.status, JSON.stringify(body)).toBe(400);
  }
  for (const body of ["{", ""]) {
    expect(
      (
        await app.request("/api/auth/ai/settings", {
          method: "PUT",
          headers: { cookie, "Content-Type": "application/json" },
          body,
        })
      ).status,
    ).toBe(400);
  }
  expect(
    (
      await app.request("/api/auth/ai/settings", {
        method: "PUT",
        headers: { cookie, "Content-Type": "text/plain" },
        body: JSON.stringify(settings),
      })
    ).status,
  ).toBe(400);
  expect(
    query.mock.calls.some(
      ([sql]) => typeof sql === "string" && sql.includes("user_ai_settings"),
    ),
  ).toBe(false);
});
