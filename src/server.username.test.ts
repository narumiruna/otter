import assert from "node:assert/strict";
import pg from "pg";
import { expect, test } from "vitest";
import { runMigrations } from "../scripts/migrate.js";
import { createApp } from "./server.js";
import { createSession, hashPassword } from "./server-support.js";
import {
  api,
  postgresTestOptions,
  type UserResponse,
  withTestApp,
} from "./server-test-utils.js";
import { usernameValidationMessage } from "./shared/username.js";

test("registration rejects missing, email-only, and invalid usernames before querying Postgres", async () => {
  const pool = new pg.Pool();
  const app = createApp(pool);
  try {
    for (const username of [
      undefined,
      null,
      123,
      "",
      "  ",
      "ab",
      "a".repeat(33),
      "alice bob",
      "alice@example.com",
      "alice!",
    ]) {
      const response = await app.request("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Alice",
          username,
          email: "alice@example.com",
          password: "password123",
        }),
      });
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: usernameValidationMessage,
      });
    }
  } finally {
    await pool.end();
  }
});

test(
  "username registration, uniqueness, login, and sessions",
  postgresTestOptions,
  async () => {
    const { baseUrl } = await withTestApp();
    const credentials = {
      username: "  Alice_123-Test  ",
      name: "Alice",
      password: "password123",
    };
    const register = await api<UserResponse>(baseUrl, "/api/auth/register", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    expect(register.response.status).toBe(201);
    expect(register.data.user).toEqual({
      id: expect.any(String),
      name: "Alice",
      username: "alice_123-test",
    });
    const duplicate = await api(baseUrl, "/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ ...credentials, username: "ALICE_123-TEST" }),
    });
    expect(duplicate.response.status).toBe(409);
    const login = await api<UserResponse>(baseUrl, "/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        username: " ALICE_123-TEST ",
        password: credentials.password,
      }),
    });
    expect(login.response.status).toBe(200);
    expect(login.data.user).toEqual(register.data.user);
    const cookie = login.response.headers.get("set-cookie")?.split(";")[0];
    assert.ok(cookie);
    const me = await api<UserResponse>(baseUrl, "/api/me", {
      headers: { cookie },
    });
    expect(me.data.user).toEqual(register.data.user);
    for (const attempt of [
      { username: "alice_123-test", password: "wrong-password" },
      { username: "unknown", password: credentials.password },
    ]) {
      const invalid = await api(baseUrl, "/api/auth/login", {
        method: "POST",
        body: JSON.stringify(attempt),
      });
      expect(invalid.response.status).toBe(401);
    }
    const missing = await api(baseUrl, "/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "alice@example.com",
        password: credentials.password,
      }),
    });
    expect(missing.response.status).toBe(400);
    await api(baseUrl, "/api/auth/logout", {
      method: "POST",
      headers: { cookie },
    });
    expect(
      (await api<UserResponse>(baseUrl, "/api/me", { headers: { cookie } }))
        .data.user,
    ).toBeNull();
  },
);

test(
  "username migration preserves legacy accounts, sessions, and memberships",
  postgresTestOptions,
  async () => {
    let cookie = "";
    const { baseUrl } = await withTestApp({
      prepare: async (pool) => {
        // Recreate the pre-011 column and constraint in this isolated test schema.
        await pool.query(`
        ALTER TABLE users RENAME COLUMN username TO email;
        ALTER TABLE users RENAME CONSTRAINT users_username_key TO users_email_key;
        DELETE FROM schema_migrations WHERE version = '011_username_auth';
      `);
        await pool.query(
          "INSERT INTO users (id, name, email, password_hash, created_at) VALUES ($1, $2, $3, $4, now())",
          [
            "legacy-user",
            "Legacy",
            "legacy@example.com",
            hashPassword("password123"),
          ],
        );
        const session = await createSession(pool, "legacy-user");
        cookie = `otter_session=${session.id}`;
        await pool.query(`
        INSERT INTO trips (id, owner_id, name, base_currency, created_at)
        VALUES ('legacy-trip', 'legacy-user', 'Legacy trip', 'TWD', now());
        INSERT INTO trip_members (id, trip_id, user_id, role, created_at)
        VALUES ('legacy-member', 'legacy-trip', 'legacy-user', 'owner', now());
      `);
        expect(
          await runMigrations(pool, { logger: { log: () => undefined } }),
        ).toBe(1);
        expect(
          await runMigrations(pool, { logger: { log: () => undefined } }),
        ).toBe(0);
        expect(
          (
            await pool.query(
              "SELECT user_id FROM trip_members WHERE id = 'legacy-member'",
            )
          ).rows,
        ).toEqual([{ user_id: "legacy-user" }]);
        await expect(
          pool.query(
            "INSERT INTO users (id, name, username, password_hash, created_at) VALUES ('duplicate', 'Duplicate', 'legacy@example.com', 'unused', now())",
          ),
        ).rejects.toMatchObject({ code: "23505" });
      },
    });
    const me = await api<UserResponse>(baseUrl, "/api/me", {
      headers: { cookie },
    });
    expect(me.data.user).toEqual({
      id: "legacy-user",
      name: "Legacy",
      username: "legacy@example.com",
    });
    const login = await api<UserResponse>(baseUrl, "/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        username: " LEGACY@EXAMPLE.COM ",
        password: "password123",
      }),
    });
    expect(login.response.status).toBe(200);
    expect(login.data.user).toEqual(me.data.user);
  },
);
