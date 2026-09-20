import pg from "pg";
import { expect, test, vi } from "vitest";
import { createApp } from "./server.js";

const { Pool } = pg;

async function postAuth(
  app: ReturnType<typeof createApp>,
  path: "/api/auth/login" | "/api/auth/register",
  body: Record<string, unknown>,
) {
  return app.request(path, {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-For": "198.51.100.10",
    },
    method: "POST",
  });
}

test("password registration and login have independent request limits", async () => {
  const originalTrustProxy = process.env.PASSWORD_AUTH_TRUST_PROXY;
  process.env.PASSWORD_AUTH_TRUST_PROXY = "true";
  const pool = new Pool();
  const query = vi.spyOn(pool, "query").mockImplementation(() => {
    throw new Error("rate-limited requests must not query Postgres");
  });
  const passwordVerifier = vi.fn(async () => false);
  const app = createApp(pool, { passwordVerifier });
  if (originalTrustProxy === undefined) {
    delete process.env.PASSWORD_AUTH_TRUST_PROXY;
  } else {
    process.env.PASSWORD_AUTH_TRUST_PROXY = originalTrustProxy;
  }

  try {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await postAuth(app, "/api/auth/register", {});
      expect(response.status).toBe(400);
    }
    const blockedRegistration = await postAuth(app, "/api/auth/register", {
      password: "password123",
      username: "blocked-registration",
    });
    expect(blockedRegistration.status).toBe(429);
    expect(await blockedRegistration.json()).toEqual({
      error: "驗證要求過於頻繁，請稍後再試",
    });
    expect(
      Number(blockedRegistration.headers.get("Retry-After")),
    ).toBeGreaterThan(0);

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await postAuth(app, "/api/auth/login", {});
      expect(response.status).toBe(400);
    }
    const blockedLogin = await postAuth(app, "/api/auth/login", {
      password: "password123",
      username: "blocked-login",
    });
    expect(blockedLogin.status).toBe(429);
    expect(await blockedLogin.json()).toEqual({
      error: "驗證要求過於頻繁，請稍後再試",
    });
    expect(Number(blockedLogin.headers.get("Retry-After"))).toBeGreaterThan(0);

    expect(query).not.toHaveBeenCalled();
    expect(passwordVerifier).not.toHaveBeenCalled();
  } finally {
    await pool.end();
  }
});
