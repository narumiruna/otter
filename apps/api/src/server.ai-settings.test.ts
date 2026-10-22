import type { AiSettings, AiSettingsResponse } from "@narumitw/otter-contracts";
import { expect, test } from "vitest";
import { createApp } from "./server.js";
import { aiCredentialStore } from "./server-ai-credentials.js";
import {
  api,
  postgresTestOptions,
  type UserResponse,
  withTestApp,
} from "./server-test-utils.js";

test(
  "account AI settings persist, update, reload, remain isolated, and cascade on account deletion",
  postgresTestOptions,
  async () => {
    const { baseUrl, pool } = await withTestApp();
    const accounts = [];
    for (const username of ["ai-account-a", "ai-account-b"]) {
      const registration = await api<UserResponse>(
        baseUrl,
        "/api/auth/register",
        {
          method: "POST",
          body: JSON.stringify({ username, password: "password123" }),
        },
      );
      expect(registration.response.status).toBe(201);
      const cookie = registration.response.headers
        .get("set-cookie")
        ?.split(";")[0];
      const user = registration.data.user;
      if (!cookie || !user) throw new Error("Expected registered session");
      accounts.push({ cookie, user });
      const initial = await api<AiSettingsResponse>(
        baseUrl,
        "/api/auth/ai/settings",
        {
          headers: { cookie },
        },
      );
      expect(initial.data).toEqual({ settings: null });
    }
    const [a, b] = accounts;
    if (!a || !b) throw new Error("Expected two accounts");
    const initial: AiSettings = {
      provider: "openai",
      model: "gpt-4o-mini",
      thinkingLevel: "off",
    };
    const updated: AiSettings = {
      provider: "google",
      model: "gemini-2.5-flash",
      thinkingLevel: "medium",
    };
    const credentials = aiCredentialStore(pool, Buffer.alloc(32, 7));
    for (const account of accounts) {
      for (const provider of ["openai", "google"]) {
        await credentials.save(
          account.user.id,
          provider,
          { type: "api_key", key: "test-only" },
          new AbortController().signal,
        );
      }
    }
    const save = (cookie: string, settings: AiSettings) =>
      api<AiSettingsResponse>(baseUrl, "/api/auth/ai/settings", {
        method: "PUT",
        headers: { cookie },
        body: JSON.stringify(settings),
      });

    expect((await save(a.cookie, initial)).data).toEqual({ settings: initial });
    const untouched = await api<AiSettingsResponse>(
      baseUrl,
      "/api/auth/ai/settings",
      {
        headers: { cookie: b.cookie },
      },
    );
    expect(untouched.data).toEqual({ settings: null });
    expect((await save(b.cookie, initial)).data).toEqual({ settings: initial });
    expect((await save(a.cookie, updated)).data).toEqual({ settings: updated });
    const invalid = await save(a.cookie, { ...initial, thinkingLevel: "high" });
    expect(invalid.response.status).toBe(400);

    // A fresh app instance reads PostgreSQL, not state from an earlier request.
    const reloaded = await createApp(pool).request("/api/auth/ai/settings", {
      headers: { cookie: a.cookie },
    });
    expect(reloaded.status).toBe(200);
    expect(await reloaded.json()).toEqual({ settings: updated });
    const rows = await pool.query<{
      user_id: string;
      provider: string;
      model: string;
      thinking_level: string;
    }>("SELECT * FROM user_ai_settings ORDER BY user_id");
    expect(rows.rowCount).toBe(2);
    expect(rows.rows.find((row) => row.user_id === a.user.id)).toEqual({
      user_id: a.user.id,
      provider: updated.provider,
      model: updated.model,
      thinking_level: updated.thinkingLevel,
    });

    await pool.query("DELETE FROM users WHERE id = $1", [a.user.id]);
    const remaining = await pool.query<{ user_id: string }>(
      "SELECT user_id FROM user_ai_settings",
    );
    expect(remaining.rows).toEqual([{ user_id: b.user.id }]);
    const isolated = await api<AiSettingsResponse>(
      baseUrl,
      "/api/auth/ai/settings",
      {
        headers: { cookie: b.cookie },
      },
    );
    expect(isolated.data).toEqual({ settings: initial });
  },
);
