import { expect, test } from "vitest";
import {
  api,
  postgresTestOptions,
  type TripPayload,
  withTestApp,
} from "./server-test-utils.js";

const mib = 1024 * 1024;

async function expectError(response: Response, status: number, error: string) {
  expect(response.status).toBe(status);
  expect(response.headers.get("content-type")).toBe("application/json");
  expect(await response.json()).toEqual({ error });
}

async function signedInApp() {
  const app = await withTestApp();
  const registration = await api(app.baseUrl, "/api/auth/register", {
    body: JSON.stringify({ username: "boundary", password: "password123" }),
    method: "POST",
  });
  expect(registration.response.status).toBe(201);
  const setCookie = registration.response.headers.get("set-cookie");
  expect(setCookie).toMatch(
    /^otter_session=[0-9a-f]{64}; HttpOnly; Path=\/; SameSite=Lax; Max-Age=604800/,
  );
  return { ...app, cookie: setCookie?.split(";")[0] ?? "" };
}

test(
  "HTTP JSON parsing retains empty/type handling and the exact 1 MiB boundary",
  postgresTestOptions,
  async () => {
    const { baseUrl } = await withTestApp();
    for (const [body, contentType] of [
      ["", "application/json"],
      ["null", "application/json"],
      ["[]", "application/json"],
      ["{}".padEnd(mib, " "), "APPLICATION/JSON; charset=utf-8"],
      ["{", "application/problem+json"],
      ["{".repeat(mib + 1), "text/plain"],
    ]) {
      await expectError(
        await fetch(`${baseUrl}/api/auth/login`, {
          body,
          headers: { "Content-Type": contentType },
          method: "POST",
        }),
        400,
        "請輸入 Username 和密碼",
      );
    }
    await expectError(
      await fetch(`${baseUrl}/api/auth/login`, {
        body: new Uint8Array([123]),
        method: "POST",
      }),
      400,
      "請輸入 Username 和密碼",
    );
    await expectError(
      await fetch(`${baseUrl}/api/auth/login`, {
        body: "{",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }),
      400,
      "JSON 格式錯誤",
    );
    await expectError(
      await fetch(`${baseUrl}/api/auth/login`, {
        body: "{}".padEnd(mib + 1, " "),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }),
      413,
      "請求內容太大",
    );
    await expectError(
      await fetch(`${baseUrl}/api/not-found`, {
        body: "{",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }),
      404,
      "找不到 API",
    );
  },
);

test(
  "HTTP authentication precedes parsing and restore retains its 10 MiB limit",
  postgresTestOptions,
  async () => {
    const { baseUrl, cookie } = await signedInApp();
    for (const body of ["{", "{}".padEnd(10 * mib + 1, " ")]) {
      await expectError(
        await fetch(`${baseUrl}/api/trips/restore`, {
          body,
          headers: { "Content-Type": "application/json" },
          method: "POST",
        }),
        401,
        "請先登入",
      );
    }
    const headers = { cookie, "Content-Type": "application/json" };
    await expectError(
      await fetch(`${baseUrl}/api/trips/restore`, {
        body: "{",
        headers,
        method: "POST",
      }),
      400,
      "JSON 格式錯誤",
    );
    await expectError(
      await fetch(`${baseUrl}/api/trips/restore`, {
        body: '{"version":0}'.padEnd(10 * mib, " "),
        headers,
        method: "POST",
      }),
      400,
      "不支援的備份版本",
    );
    await expectError(
      await fetch(`${baseUrl}/api/trips/restore`, {
        body: '{"version":0}'.padEnd(10 * mib + 1, " "),
        headers,
        method: "POST",
      }),
      413,
      "請求內容太大",
    );
    await expectError(
      await fetch(`${baseUrl}/api/trips/missing/expenses`, {
        body: "{",
        headers,
        method: "POST",
      }),
      400,
      "JSON 格式錯誤",
    );
    const logout = await api(baseUrl, "/api/auth/logout", {
      headers: { cookie },
      method: "POST",
    });
    expect(logout.data).toEqual({ ok: true });
    expect(logout.response.headers.get("set-cookie")).toMatch(
      /^otter_session=; HttpOnly; Path=\/; SameSite=Lax; Max-Age=0/,
    );
    await expectError(
      await fetch(`${baseUrl}/api/trips`, { headers: { cookie } }),
      401,
      "請先登入",
    );
  },
);

test(
  "HTTP receipts preserve bytes, MIME types, and the exact 5 MiB limit",
  postgresTestOptions,
  async () => {
    const { baseUrl, cookie } = await signedInApp();
    const created = await api<TripPayload>(baseUrl, "/api/trips", {
      body: JSON.stringify({ name: "Receipt" }),
      headers: { cookie },
      method: "POST",
    });
    const trip = created.data.trip;
    const expense = await api<TripPayload>(
      baseUrl,
      `/api/trips/${trip.id}/expenses`,
      {
        body: JSON.stringify({
          description: "Receipt",
          amount: "1",
          currency: "TWD",
          paidById: trip.participants[0].id,
          participantIds: [trip.participants[0].id],
        }),
        headers: { cookie },
        method: "POST",
      },
    );
    const url = `${baseUrl}/api/trips/${trip.id}/expenses/${expense.data.trip.expenses[0].id}/receipt`;
    let version = 1;
    for (const mime of ["image/jpeg", "image/png", "image/webp"]) {
      const bytes = new Uint8Array(5 * mib).fill(255);
      bytes.set([0, 1, 127, 128, 254]);
      const upload = await fetch(url, {
        body: bytes,
        headers: {
          cookie,
          "Content-Type": `${mime}; test=1`,
          "If-Match": `"${version}"`,
        },
        method: "PUT",
      });
      expect(upload.status).toBe(201);
      version += 1;
      const payload = (await upload.json()) as TripPayload;
      expect(payload.trip.expenses[0].receiptUrl).toBe(new URL(url).pathname);
      const downloaded = await fetch(url, { headers: { cookie } });
      expect(downloaded.status).toBe(200);
      expect(downloaded.headers.get("content-type")).toBe(mime);
      expect(
        Buffer.from(await downloaded.arrayBuffer()).equals(Buffer.from(bytes)),
      ).toBe(true);
      await expectError(
        await fetch(url, {
          body: new Uint8Array(5 * mib + 1),
          headers: { cookie, "Content-Type": mime },
          method: "PUT",
        }),
        413,
        "請求內容太大",
      );
    }
    await expectError(
      await fetch(url, {
        body: new Uint8Array(),
        headers: {
          cookie,
          "Content-Type": "image/png",
          "If-Match": `"${version}"`,
        },
        method: "PUT",
      }),
      400,
      "請選擇收據圖片",
    );
    await expectError(
      await fetch(url, {
        body: new Uint8Array(5 * mib + 1),
        headers: {
          cookie,
          "Content-Type": "image/gif",
          "If-Match": `"${version}"`,
        },
        method: "PUT",
      }),
      415,
      "收據只支援 JPEG、PNG 或 WebP 圖片",
    );
    await expectError(
      await fetch(url, {
        body: new Uint8Array(5 * mib + 1),
        headers: { "Content-Type": "image/png" },
        method: "PUT",
      }),
      401,
      "請先登入",
    );
  },
);

test(
  "malformed JSON does not consume or bypass the existing parsed-request rate limit",
  postgresTestOptions,
  async () => {
    const { baseUrl } = await withTestApp();
    const login = (body: string) =>
      fetch(`${baseUrl}/api/auth/login`, {
        body,
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
    for (let index = 0; index < 12; index += 1)
      await expectError(await login("{"), 400, "JSON 格式錯誤");
    for (let index = 0; index < 10; index += 1)
      await expectError(await login("{}"), 400, "請輸入 Username 和密碼");
    const limited = await login("{}");
    expect(Number(limited.headers.get("retry-after"))).toBeGreaterThan(0);
    await expectError(limited, 429, "驗證要求過於頻繁，請稍後再試");
    await expectError(await login("{"), 400, "JSON 格式錯誤");
    await expectError(await login("{}"), 429, "驗證要求過於頻繁，請稍後再試");
  },
);
