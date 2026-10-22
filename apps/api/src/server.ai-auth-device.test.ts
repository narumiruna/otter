import type {
  AiConnectionsResponse,
  AiLoginResponse,
  AiLoginState,
} from "@narumitw/otter-contracts";
import { expect, onTestFinished, test, vi } from "vitest";
import { decryptAiCredential } from "./server-ai-credentials.js";
import {
  callbackPortSentinel,
  clearOAuthOverrides,
  mockCodexHttp,
} from "./server-ai-device.test-utils.js";
import {
  api,
  postgresTestOptions,
  type UserResponse,
  withTestApp,
} from "./server-test-utils.js";

for (const occupied of [false, true]) {
  test(
    `two accounts use independent real SDK device flows through Hono and PostgreSQL (occupied=${occupied})`,
    postgresTestOptions,
    async () => {
      const noCallback = await callbackPortSentinel(occupied);
      clearOAuthOverrides();
      const key = Buffer.alloc(32, 41);
      vi.stubEnv("ENCRYPTION_KEY", key.toString("base64"));
      onTestFinished(() => {
        vi.unstubAllEnvs();
      });
      const { baseUrl, pool } = await withTestApp();
      const http = mockCodexHttp(baseUrl);
      async function register(username: string) {
        const result = await api<UserResponse>(baseUrl, "/api/auth/register", {
          method: "POST",
          body: JSON.stringify({ username, password: "password123" }),
        });
        expect(result.response.status).toBe(201);
        const cookie = result.response.headers.get("set-cookie")?.split(";")[0];
        if (!cookie || !result.data.user)
          throw new Error("Expected dummy account session");
        return { cookie, user: result.data.user };
      }
      const a = await register("device-account-a");
      const b = await register("device-account-b");
      const cleanup: { id: string; cookie: string }[] = [];
      async function start(cookie: string) {
        const result = await api<AiLoginResponse>(
          baseUrl,
          "/api/auth/ai/logins",
          {
            method: "POST",
            headers: { cookie },
            body: JSON.stringify({ provider: "openai-codex", method: "oauth" }),
          },
        );
        expect(result.response.status).toBe(201);
        expect(result.data.login.prompt).toBeUndefined();
        cleanup.push({ id: result.data.login.id, cookie });
        return result.data.login.id;
      }
      async function get(cookie: string, id: string) {
        const result = await api<AiLoginResponse>(
          baseUrl,
          `/api/auth/ai/logins/${id}`,
          { headers: { cookie } },
        );
        expect(result.response.status).toBe(200);
        expect(result.response.headers.get("cache-control")).toBe("no-store");
        expect(result.data.login.prompt).toBeUndefined();
        return result.data.login;
      }
      async function deviceState(
        cookie: string,
        id: string,
      ): Promise<AiLoginState> {
        return vi.waitFor(async () => {
          const state = await get(cookie, id);
          expect(state.events[0]?.type).toBe("device_code");
          expect(state.status).toBe("pending");
          return state;
        });
      }
      try {
        const aId = await start(a.cookie);
        const aState = await deviceState(a.cookie, aId);
        let bId = await start(b.cookie);
        const bState = await deviceState(b.cookie, bId);
        expect(aId).not.toBe(bId);
        const aEvent = aState.events[0];
        const bEvent = bState.events[0];
        if (aEvent?.type !== "device_code" || bEvent?.type !== "device_code")
          throw new Error("Expected device codes");
        expect(aEvent.userCode).not.toBe(bEvent.userCode);
        expect(aEvent.verificationUri).toBe(
          "https://auth.openai.com/codex/device",
        );
        expect(bEvent.verificationUri).toBe(aEvent.verificationUri);
        expect(http.devices).toHaveLength(2);
        const aDevice = http.devices.find(
          ({ userCode }) => userCode === aEvent.userCode,
        );
        let bDevice = http.devices.find(
          ({ userCode }) => userCode === bEvent.userCode,
        );
        if (!aDevice || !bDevice)
          throw new Error("Expected independent device requests");
        expect(aDevice.id).not.toBe(bDevice.id);
        expect(aDevice.signal).not.toBe(bDevice.signal);
        for (const [cookie, id] of [
          [a.cookie, bId],
          [b.cookie, aId],
        ] as const) {
          for (const [path, method, body] of [
            [`/api/auth/ai/logins/${id}`, "GET", undefined],
            [`/api/auth/ai/logins/${id}`, "DELETE", undefined],
            [
              `/api/auth/ai/logins/${id}/respond`,
              "POST",
              JSON.stringify({ promptId: "not-exposed", value: "browser" }),
            ],
          ] as const) {
            expect(
              (await api(baseUrl, path, { method, headers: { cookie }, body }))
                .response.status,
            ).toBe(404);
          }
        }
        expect(
          (await pool.query("SELECT user_id FROM user_ai_credentials"))
            .rowCount,
        ).toBe(0);
        // Cancelling B's pending authorization must not abort A's SDK polling.
        expect(
          (
            await api(baseUrl, `/api/auth/ai/logins/${bId}`, {
              method: "DELETE",
              headers: { cookie: b.cookie },
            })
          ).response.status,
        ).toBe(200);
        expect(bDevice.signal.aborted).toBe(true);
        expect(aDevice.signal.aborted).toBe(false);
        expect(await get(a.cookie, aId)).toEqual(aState);
        const cancelledBId = bId;
        bId = await start(b.cookie);
        expect(bId).not.toBe(cancelledBId);
        const restarted = (await deviceState(b.cookie, bId)).events[0];
        if (restarted?.type !== "device_code")
          throw new Error("Expected fresh B device code");
        expect(restarted.userCode).not.toBe(aEvent.userCode);
        expect(restarted.userCode).not.toBe(bEvent.userCode);
        bDevice = http.devices.find(
          ({ userCode }) => userCode === restarted.userCode,
        );
        if (!bDevice) throw new Error("Expected restarted B device request");
        bDevice.outcome = "complete";
        await vi.waitFor(
          async () =>
            expect((await get(b.cookie, bId)).status).toBe("complete"),
          { timeout: 5000 },
        );
        expect(await get(a.cookie, aId)).toEqual(aState);
        expect(aDevice.signal.aborted).toBe(false);
        expect(bDevice.signal.aborted).toBe(true);
        expect(http.exchanges).toEqual([bDevice.id]);
        const stored = await pool.query<{
          user_id: string;
          provider: string;
          method: string;
          encrypted_credential: Buffer;
        }>(
          "SELECT user_id, provider, method, encrypted_credential FROM user_ai_credentials",
        );
        expect(stored.rowCount).toBe(1);
        const row = stored.rows[0];
        if (!row) throw new Error("Expected B's credential");
        expect(row).toMatchObject({
          user_id: b.user.id,
          provider: "openai-codex",
          method: "oauth",
        });
        expect(
          decryptAiCredential(
            key,
            b.user.id,
            "openai-codex",
            row.encrypted_credential,
          ),
        ).toMatchObject({
          type: "oauth",
          accountId: `account-${bDevice.id}`,
          refresh: `refresh-${bDevice.id}`,
        });
        expect(() =>
          decryptAiCredential(
            key,
            a.user.id,
            "openai-codex",
            row.encrypted_credential,
          ),
        ).toThrow();
        expect(
          (
            await api(baseUrl, `/api/auth/ai/logins/${aId}`, {
              method: "DELETE",
              headers: { cookie: a.cookie },
            })
          ).response.status,
        ).toBe(200);
        expect(aDevice.signal.aborted).toBe(true);
        expect(
          (
            await api(baseUrl, `/api/auth/ai/logins/${aId}`, {
              headers: { cookie: a.cookie },
            })
          ).response.status,
        ).toBe(404);
        expect((await get(b.cookie, bId)).status).toBe("complete");
        for (const [account, connections] of [
          [a, []],
          [b, [{ provider: "openai-codex", method: "oauth" }]],
        ] as const) {
          expect(
            (
              await api<AiConnectionsResponse>(
                baseUrl,
                "/api/auth/ai/connections",
                { headers: { cookie: account.cookie } },
              )
            ).data,
          ).toEqual({ connections });
        }
        const unchanged = await pool.query<{ encrypted_credential: Buffer }>(
          "SELECT encrypted_credential FROM user_ai_credentials",
        );
        expect(unchanged.rows).toEqual([
          { encrypted_credential: row.encrypted_credential },
        ]);
        noCallback();
      } finally {
        for (const { id, cookie } of cleanup)
          await api(baseUrl, `/api/auth/ai/logins/${id}`, {
            method: "DELETE",
            headers: { cookie },
          });
      }
    },
  );
}
