import { createServer, Server } from "node:net";
import { expect, onTestFinished, vi } from "vitest";

export type DeviceOutcome =
  | "pending"
  | "complete"
  | "start-error"
  | "poll-error"
  | "exchange-error"
  | "invalid-jwt"
  | "invalid-device"
  | "invalid-poll";

type DummyDevice = {
  id: string;
  userCode: string;
  outcome: DeviceOutcome;
  signal: AbortSignal;
  polls: number;
};

export function clearOAuthOverrides() {
  for (const name of [
    "PI_OAUTH_CALLBACK_HOST",
    "KIMI_CODE_OAUTH_HOST",
    "KIMI_OAUTH_HOST",
  ])
    vi.stubEnv(name, "");
  onTestFinished(() => {
    vi.unstubAllEnvs();
  });
}

// Run these fixtures only in the approved sandbox's isolated loopback namespace.
// A port conflict fails the test; it must not silently skip the regression.
export async function callbackPortSentinel(occupied: boolean) {
  let sentinel: Server | undefined;
  if (occupied) {
    sentinel = createServer();
    const server = sentinel;
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(1455, "127.0.0.1", resolve);
    });
    onTestFinished(
      () =>
        new Promise<void>((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve())),
        ),
    );
  }
  const listen = vi.spyOn(Server.prototype, "listen");
  onTestFinished(() => listen.mockRestore());
  return () => {
    expect(sentinel?.listening ?? true).toBe(true);
    for (const args of listen.mock.calls) {
      const address: unknown = args[0];
      expect(address).not.toBe(1455);
      if (address && typeof address === "object" && "port" in address)
        expect(address.port).not.toBe(1455);
    }
  };
}

// These are protocol fixtures, not an OAuth implementation. The real installed
// SDK must select, poll, exchange, parse the JWT, and handle aborts itself.
export function mockCodexHttp(baseUrl?: string) {
  const realFetch = globalThis.fetch;
  const fixture: {
    outcome: DeviceOutcome;
    devices: DummyDevice[];
    unexpected: string[];
    exchanges: string[];
  } = { outcome: "pending", devices: [], unexpected: [], exchanges: [] };
  const fetch = vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(async (input, init) => {
      const url = String(input);
      if (baseUrl && url.startsWith(`${baseUrl}/api/`))
        return realFetch(input, init);
      if (init?.method !== "POST" || !init.signal || init.signal.aborted)
        throw new Error("Expected a live SDK POST request");
      if (url === "https://auth.openai.com/api/accounts/deviceauth/usercode") {
        expect(JSON.parse(String(init.body))).toEqual({
          client_id: "app_EMoamEEZ73f0CkXaXp7hrann",
        });
        const index = fixture.devices.length + 1;
        const device: DummyDevice = {
          id: `dummy-device-${index}`,
          userCode: `DUMMY-${index}`,
          outcome: fixture.outcome,
          signal: init.signal,
          polls: 0,
        };
        fixture.devices.push(device);
        if (device.outcome === "start-error")
          return Response.json({}, { status: 404 });
        if (device.outcome === "invalid-device")
          return Response.json({ user_code: device.userCode });
        return Response.json({
          device_auth_id: device.id,
          user_code: device.userCode,
          interval: "0",
        });
      }
      if (url === "https://auth.openai.com/api/accounts/deviceauth/token") {
        const body: unknown = JSON.parse(String(init.body));
        const device = fixture.devices.find(
          (candidate) =>
            typeof body === "object" &&
            body !== null &&
            "device_auth_id" in body &&
            body.device_auth_id === candidate.id,
        );
        if (!device) throw new Error("Unknown dummy device");
        expect(body).toEqual({
          device_auth_id: device.id,
          user_code: device.userCode,
        });
        expect(init.signal).toBe(device.signal);
        device.polls++;
        if (device.outcome === "pending")
          return Response.json({}, { status: 403 });
        if (device.outcome === "poll-error")
          return Response.json(
            { error: "dummy-access-denied" },
            { status: 400 },
          );
        if (device.outcome === "invalid-poll") return Response.json({});
        return Response.json({
          authorization_code: `authorization-${device.id}`,
          code_verifier: `verifier-${device.id}`,
        });
      }
      if (url === "https://auth.openai.com/oauth/token") {
        const body = new URLSearchParams(String(init.body));
        const device = fixture.devices.find(
          (candidate) => body.get("code") === `authorization-${candidate.id}`,
        );
        if (!device) throw new Error("Unknown dummy authorization code");
        expect(Object.fromEntries(body)).toEqual({
          grant_type: "authorization_code",
          client_id: "app_EMoamEEZ73f0CkXaXp7hrann",
          code: `authorization-${device.id}`,
          code_verifier: `verifier-${device.id}`,
          redirect_uri: "https://auth.openai.com/deviceauth/callback",
        });
        fixture.exchanges.push(device.id);
        if (device.outcome === "exchange-error")
          return Response.json({}, { status: 400 });
        // pi-ai 1.4.0 uses atob on the JWT payload, then reads this exact claim.
        const payload = Buffer.from(
          JSON.stringify({
            "https://api.openai.com/auth": {
              chatgpt_account_id: `account-${device.id}`,
            },
          }),
        ).toString("base64");
        return Response.json({
          access_token:
            device.outcome === "invalid-jwt"
              ? "invalid"
              : `dummy.${payload}.dummy`,
          refresh_token: `refresh-${device.id}`,
          expires_in: 3600,
        });
      }
      fixture.unexpected.push(url);
      throw new Error(`Unexpected provider request: ${url}`);
    });
  onTestFinished(() => {
    fetch.mockRestore();
    expect(fixture.unexpected).toEqual([]);
  });
  return fixture;
}
