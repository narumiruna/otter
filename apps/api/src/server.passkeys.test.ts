import assert from "node:assert/strict";
import { expect, test, vi } from "vitest";
import { hashApiSecret } from "./server-api-tokens.js";
import {
  type PasskeyVerifiers,
  resolvePasskeyRelyingParty,
} from "./server-passkeys.js";
import {
  api,
  postgresTestOptions,
  type UserResponse,
  withTestApp,
} from "./server-test-utils.js";

const credentialId = "credential_test_1";

function mockedVerifiers() {
  const verifyRegistration = vi.fn<PasskeyVerifiers["verifyRegistration"]>(
    async () => ({
      registrationInfo: {
        aaguid: "00000000-0000-0000-0000-000000000000",
        attestationObject: new Uint8Array(),
        credential: {
          counter: 0,
          id: credentialId,
          publicKey: new Uint8Array([1, 2, 3]),
          transports: ["internal"],
        },
        credentialBackedUp: true,
        credentialDeviceType: "multiDevice",
        credentialType: "public-key",
        fmt: "none",
        origin: "http://localhost",
        rpID: "localhost",
        userVerified: true,
      },
      verified: true,
    }),
  );
  const verifyAuthentication = vi.fn<PasskeyVerifiers["verifyAuthentication"]>(
    async ({ credential }) => ({
      authenticationInfo: {
        credentialBackedUp: true,
        credentialDeviceType: "multiDevice",
        credentialID: credentialId,
        newCounter: credential.counter + 1,
        origin: "http://localhost",
        rpID: "localhost",
        userVerified: true,
      },
      verified: credential.counter === 0,
    }),
  );
  return { verifyAuthentication, verifyRegistration };
}

const fakeRegistrationResponse = {
  clientExtensionResults: {},
  id: credentialId,
  rawId: credentialId,
  response: {},
  type: "public-key",
};

const fakeAuthenticationResponse = {
  clientExtensionResults: {},
  id: credentialId,
  rawId: credentialId,
  response: {},
  type: "public-key",
};

const request = new Request("https://example.com");

test("passkey origins are normalized and require HTTPS except on localhost", () => {
  expect(
    resolvePasskeyRelyingParty(request, {
      origin: "https://EXAMPLE.com:443/",
      rpID: "example.com",
      rpName: "otter",
    }),
  ).toEqual({
    origin: "https://example.com",
    rpID: "example.com",
    rpName: "otter",
  });
  expect(() =>
    resolvePasskeyRelyingParty(request, {
      origin: "https://example.com/passkeys",
      rpID: "example.com",
      rpName: "otter",
    }),
  ).toThrow("PASSKEY_ORIGIN must be an origin");
  expect(() =>
    resolvePasskeyRelyingParty(request, {
      origin: "http://otter.example.com",
      rpID: "otter.example.com",
      rpName: "otter",
    }),
  ).toThrow("PASSKEY_ORIGIN must use HTTPS except on localhost");
  expect(
    resolvePasskeyRelyingParty(request, {
      origin: "http://localhost:17463",
      rpID: "localhost",
      rpName: "otter",
    }),
  ).toEqual({
    origin: "http://localhost:17463",
    rpID: "localhost",
    rpName: "otter",
  });
});

test("passkey origin resolution retains forwarded headers and configured-origin precedence", () => {
  vi.stubEnv("PASSKEY_ORIGIN", undefined);
  try {
    expect(() => resolvePasskeyRelyingParty(request)).toThrow(
      "PASSKEY_ORIGIN is required when the request has no Host header",
    );
    const local = new Request("http://localhost:17464", {
      headers: { host: "localhost:17464" },
    });
    expect(resolvePasskeyRelyingParty(local).origin).toBe(
      "http://localhost:17464",
    );
    const forwarded = new Request(local, {
      headers: {
        host: "localhost:17464",
        "x-forwarded-proto": " https , http ",
        "x-forwarded-host": " EXAMPLE.com:443 , internal ",
      },
    });
    expect(resolvePasskeyRelyingParty(forwarded)).toEqual({
      origin: "https://example.com",
      rpID: "example.com",
      rpName: "otter",
    });
    vi.stubEnv("PASSKEY_ORIGIN", " https://configured.example ");
    expect(resolvePasskeyRelyingParty(forwarded).origin).toBe(
      "https://configured.example",
    );
    expect(
      resolvePasskeyRelyingParty(forwarded, {
        origin: "https://explicit.example",
        rpID: "explicit.example",
        rpName: "explicit",
      }).origin,
    ).toBe("https://explicit.example");
  } finally {
    vi.unstubAllEnvs();
  }
});

test(
  "users can enroll, use, list, and remove a passkey with one-time challenges",
  postgresTestOptions,
  async () => {
    const verifiers = mockedVerifiers();
    const { baseUrl, pool } = await withTestApp({
      appOptions: {
        passkeys: {
          relyingParty: {
            origin: "http://localhost",
            rpID: "localhost",
            rpName: "otter test",
          },
          verifiers,
        },
      },
    });
    const registration = await api<UserResponse>(
      baseUrl,
      "/api/auth/register",
      {
        body: JSON.stringify({
          password: "password123",
          username: `passkey-${Date.now()}`,
        }),
        method: "POST",
      },
    );
    const accountCookie = registration.response.headers
      .get("set-cookie")
      ?.split(";", 1)[0];
    assert.ok(accountCookie);
    assert.ok(registration.data.user);

    const unauthorized = await api(baseUrl, "/api/passkeys");
    expect(unauthorized.response.status).toBe(401);

    const bearerToken = "otter_api_passkey_admin_test";
    await pool.query(
      `INSERT INTO api_tokens
         (id, user_id, token_hash, name, created_at, expires_at)
       VALUES ($1, $2, $3, $4, now(), now() + interval '1 day')`,
      [
        "token_passkey_admin_test",
        registration.data.user.id,
        hashApiSecret(bearerToken),
        "Passkey administration test",
      ],
    );
    const bearerHeaders = { authorization: `Bearer ${bearerToken}` };
    const bearerAdministrationAttempts = await Promise.all([
      api(baseUrl, "/api/passkeys", { headers: bearerHeaders }),
      api(baseUrl, "/api/passkeys/registration/options", {
        headers: bearerHeaders,
        method: "POST",
      }),
      api(baseUrl, "/api/passkeys/registration/verify", {
        body: JSON.stringify({}),
        headers: bearerHeaders,
        method: "POST",
      }),
      api(baseUrl, "/api/passkeys/not-a-credential", {
        headers: bearerHeaders,
        method: "DELETE",
      }),
    ]);
    expect(
      bearerAdministrationAttempts.map(({ response }) => response.status),
    ).toEqual([401, 401, 401, 401]);

    const initial = await api<{ passkeys: unknown[] }>(
      baseUrl,
      "/api/passkeys",
      { headers: { cookie: accountCookie } },
    );
    expect(initial.data.passkeys).toEqual([]);

    const options = await api<{
      challengeId: string;
      options: {
        authenticatorSelection?: {
          residentKey?: string;
          userVerification?: string;
        };
        challenge: string;
        rp: { id?: string; name: string };
      };
    }>(baseUrl, "/api/passkeys/registration/options", {
      headers: { cookie: accountCookie },
      method: "POST",
    });
    expect(options.response.status).toBe(200);
    expect(options.data.options.rp).toEqual({
      id: "localhost",
      name: "otter test",
    });
    expect(options.data.options.authenticatorSelection).toMatchObject({
      residentKey: "required",
      userVerification: "required",
    });

    const otherRegistration = await api<UserResponse>(
      baseUrl,
      "/api/auth/register",
      {
        body: JSON.stringify({
          password: "password123",
          username: `other-passkey-${Date.now()}`,
        }),
        method: "POST",
      },
    );
    const otherCookie = otherRegistration.response.headers
      .get("set-cookie")
      ?.split(";", 1)[0];
    assert.ok(otherCookie);
    const wrongUser = await api(baseUrl, "/api/passkeys/registration/verify", {
      body: JSON.stringify({
        challengeId: options.data.challengeId,
        response: fakeRegistrationResponse,
      }),
      headers: { cookie: otherCookie },
      method: "POST",
    });
    expect(wrongUser.response.status).toBe(400);
    expect(verifiers.verifyRegistration).not.toHaveBeenCalled();

    const replacementOptions = await api<typeof options.data>(
      baseUrl,
      "/api/passkeys/registration/options",
      { headers: { cookie: accountCookie }, method: "POST" },
    );
    const stale = await api(baseUrl, "/api/passkeys/registration/verify", {
      body: JSON.stringify({
        challengeId: options.data.challengeId,
        response: fakeRegistrationResponse,
      }),
      headers: { cookie: accountCookie },
      method: "POST",
    });
    expect(stale.response.status).toBe(400);
    expect(verifiers.verifyRegistration).not.toHaveBeenCalled();

    const verificationBody = JSON.stringify({
      challengeId: replacementOptions.data.challengeId,
      response: fakeRegistrationResponse,
    });
    const verified = await api(baseUrl, "/api/passkeys/registration/verify", {
      body: verificationBody,
      headers: { cookie: accountCookie },
      method: "POST",
    });
    expect(verified.response.status).toBe(201);
    expect(verifiers.verifyRegistration).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedChallenge: replacementOptions.data.options.challenge,
        expectedOrigin: "http://localhost",
        expectedRPID: "localhost",
        requireUserVerification: true,
      }),
    );

    const replay = await api(baseUrl, "/api/passkeys/registration/verify", {
      body: verificationBody,
      headers: { cookie: accountCookie },
      method: "POST",
    });
    expect(replay.response.status).toBe(400);
    expect(verifiers.verifyRegistration).toHaveBeenCalledTimes(1);

    const listed = await api<{
      passkeys: Array<{
        backedUp: boolean;
        deviceType: string;
        id: string;
        lastUsedAt: string | null;
      }>;
    }>(baseUrl, "/api/passkeys", {
      headers: { cookie: accountCookie },
    });
    expect(listed.data.passkeys).toEqual([
      expect.objectContaining({
        backedUp: true,
        deviceType: "multiDevice",
        id: credentialId,
        lastUsedAt: null,
      }),
    ]);

    const authenticationOptions = await api<{
      challengeId: string;
      options: {
        allowCredentials?: unknown[];
        challenge: string;
        rpId?: string;
      };
    }>(baseUrl, "/api/auth/passkey/options", { method: "POST" });
    expect(authenticationOptions.data.options).toMatchObject({
      rpId: "localhost",
    });
    expect(authenticationOptions.data.options.allowCredentials).toBeUndefined();

    const secondAuthenticationOptions = await api<
      typeof authenticationOptions.data
    >(baseUrl, "/api/auth/passkey/options", { method: "POST" });
    for (let index = 0; index < 8; index += 1) {
      const allowed = await api(baseUrl, "/api/auth/passkey/options", {
        method: "POST",
      });
      expect(allowed.response.status).toBe(200);
    }
    const rateLimited = await api<{ error: string }>(
      baseUrl,
      "/api/auth/passkey/options",
      { method: "POST" },
    );
    expect(rateLimited.response.status).toBe(429);
    expect(rateLimited.response.headers.get("retry-after")).toBeTruthy();

    const authenticationBody = JSON.stringify({
      challengeId: authenticationOptions.data.challengeId,
      response: fakeAuthenticationResponse,
    });
    const secondAuthenticationBody = JSON.stringify({
      challengeId: secondAuthenticationOptions.data.challengeId,
      response: fakeAuthenticationResponse,
    });
    const authenticationAttempts = await Promise.all([
      api(baseUrl, "/api/auth/passkey/verify", {
        body: authenticationBody,
        method: "POST",
      }),
      api(baseUrl, "/api/auth/passkey/verify", {
        body: secondAuthenticationBody,
        method: "POST",
      }),
    ]);
    expect(
      authenticationAttempts.map(({ response }) => response.status).sort(),
    ).toEqual([200, 401]);
    const authenticated = authenticationAttempts.find(
      ({ response }) => response.status === 200,
    );
    assert.ok(authenticated);
    const passkeyCookie = authenticated.response.headers
      .get("set-cookie")
      ?.split(";", 1)[0];
    assert.ok(passkeyCookie);
    expect(
      verifiers.verifyAuthentication.mock.calls.map(
        ([options]) => options.expectedChallenge,
      ),
    ).toEqual(
      expect.arrayContaining([
        authenticationOptions.data.options.challenge,
        secondAuthenticationOptions.data.options.challenge,
      ]),
    );
    expect(
      verifiers.verifyAuthentication.mock.calls.map(
        ([{ credential, ...options }]) => ({
          counter: credential.counter,
          expectedOrigin: options.expectedOrigin,
          expectedRPID: options.expectedRPID,
          requireUserVerification: options.requireUserVerification,
        }),
      ),
    ).toEqual([
      {
        counter: 0,
        expectedOrigin: "http://localhost",
        expectedRPID: "localhost",
        requireUserVerification: true,
      },
      {
        counter: 1,
        expectedOrigin: "http://localhost",
        expectedRPID: "localhost",
        requireUserVerification: true,
      },
    ]);
    const me = await api<UserResponse>(baseUrl, "/api/me", {
      headers: { cookie: passkeyCookie },
    });
    expect(me.data.user).toEqual(registration.data.user);
    const authenticationReplay = await api(
      baseUrl,
      "/api/auth/passkey/verify",
      { body: authenticationBody, method: "POST" },
    );
    expect(authenticationReplay.response.status).toBe(400);
    expect(verifiers.verifyAuthentication).toHaveBeenCalledTimes(2);

    const afterUse = await api<{
      passkeys: Array<{ lastUsedAt: string | null }>;
    }>(baseUrl, "/api/passkeys", {
      headers: { cookie: accountCookie },
    });
    expect(afterUse.data.passkeys[0]?.lastUsedAt).not.toBeNull();

    const wrongOwner = await api(
      baseUrl,
      `/api/passkeys/${encodeURIComponent(credentialId)}`,
      { headers: { cookie: otherCookie }, method: "DELETE" },
    );
    expect(wrongOwner.response.status).toBe(404);
    const removed = await api(
      baseUrl,
      `/api/passkeys/${encodeURIComponent(credentialId)}`,
      { headers: { cookie: accountCookie }, method: "DELETE" },
    );
    expect(removed.response.status).toBe(200);
    const empty = await api<{ passkeys: unknown[] }>(baseUrl, "/api/passkeys", {
      headers: { cookie: accountCookie },
    });
    expect(empty.data.passkeys).toEqual([]);
  },
);
