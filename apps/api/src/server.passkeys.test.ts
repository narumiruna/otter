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
  "username and passkey signup creates an account only after verification",
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
    const optionsPath = "/api/auth/passkey/register/options";
    const verifyPath = "/api/auth/passkey/register/verify";
    const username = `Signup_${Date.now()}`;
    for (const invalid of ["bad name", "a", "legacy@example.com"]) {
      const invalidOptions = await api(baseUrl, optionsPath, {
        body: JSON.stringify({ username: invalid }),
        method: "POST",
      });
      expect(invalidOptions.response.status).toBe(400);
    }
    const options = await api<{
      challengeId: string;
      options: {
        challenge: string;
        user: { name: string; displayName: string };
        authenticatorSelection: {
          residentKey: string;
          userVerification: string;
        };
      };
    }>(baseUrl, optionsPath, {
      body: JSON.stringify({ username }),
      method: "POST",
    });
    expect(options.response.status).toBe(200);
    expect(options.data.options.user).toMatchObject({
      name: username.toLowerCase(),
      displayName: username.toLowerCase(),
    });
    expect(options.data.options.authenticatorSelection).toMatchObject({
      residentKey: "required",
      userVerification: "required",
    });
    const before = await pool.query(
      "SELECT id FROM users WHERE username = $1",
      [username.toLowerCase()],
    );
    expect(before.rowCount).toBe(0);
    expect((await api<UserResponse>(baseUrl, "/api/me")).data.user).toBeNull();

    const bad = await api(baseUrl, verifyPath, {
      body: JSON.stringify({
        challengeId: options.data.challengeId,
        response: {},
      }),
      method: "POST",
    });
    expect(bad.response.status).toBe(400);
    verifiers.verifyRegistration.mockRejectedValueOnce(
      new Error("invalid attestation"),
    );
    const rejected = await api(baseUrl, verifyPath, {
      body: JSON.stringify({
        challengeId: options.data.challengeId,
        response: fakeRegistrationResponse,
      }),
      method: "POST",
    });
    expect(rejected.response.status).toBe(400);
    expect(
      (
        await pool.query("SELECT id FROM users WHERE username = $1", [
          username.toLowerCase(),
        ])
      ).rowCount,
    ).toBe(0);
    const rejectedReplay = await api(baseUrl, verifyPath, {
      body: JSON.stringify({
        challengeId: options.data.challengeId,
        response: fakeRegistrationResponse,
      }),
      method: "POST",
    });
    expect(rejectedReplay.response.status).toBe(400);
    const replacement = await api<typeof options.data>(baseUrl, optionsPath, {
      body: JSON.stringify({ username }),
      method: "POST",
    });
    const verified = await api(baseUrl, verifyPath, {
      body: JSON.stringify({
        challengeId: replacement.data.challengeId,
        response: fakeRegistrationResponse,
      }),
      method: "POST",
    });
    expect(verified.response.status).toBe(201);
    expect(verifiers.verifyRegistration).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedChallenge: replacement.data.options.challenge,
        expectedOrigin: "http://localhost",
        expectedRPID: "localhost",
        requireUserVerification: true,
      }),
    );
    const cookie = verified.response.headers
      .get("set-cookie")
      ?.split(";", 1)[0];
    assert.ok(cookie);
    const me = await api<UserResponse>(baseUrl, "/api/me", {
      headers: { cookie },
    });
    expect(me.data.user).toMatchObject({
      username: username.toLowerCase(),
      name: username.toLowerCase(),
    });
    const stored = await pool.query<{ password_hash: string | null }>(
      "SELECT password_hash FROM users WHERE username = $1",
      [username.toLowerCase()],
    );
    expect(stored.rows[0]?.password_hash).toBeNull();
    const replay = await api(baseUrl, verifyPath, {
      body: JSON.stringify({
        challengeId: options.data.challengeId,
        response: fakeRegistrationResponse,
      }),
      method: "POST",
    });
    expect(replay.response.status).toBe(400);
    const duplicate = await api(baseUrl, optionsPath, {
      body: JSON.stringify({ username: username.toUpperCase() }),
      method: "POST",
    });
    expect(duplicate.response.status).toBe(409);
    const passwordLogin = await api(baseUrl, "/api/auth/login", {
      body: JSON.stringify({ username, password: "any-password" }),
      method: "POST",
    });
    expect(passwordLogin.response.status).toBe(401);
    const lastKey = await api(baseUrl, `/api/passkeys/${credentialId}`, {
      headers: { cookie },
      method: "DELETE",
    });
    expect(lastKey.response.status).toBe(409);
    const listed = await api<{ passkeys: unknown[] }>(
      baseUrl,
      "/api/passkeys",
      { headers: { cookie } },
    );
    expect(listed.data.passkeys).toHaveLength(1);

    const loginOptions = await api<{ challengeId: string }>(
      baseUrl,
      "/api/auth/passkey/options",
      { method: "POST" },
    );
    const login = await api(baseUrl, "/api/auth/passkey/verify", {
      body: JSON.stringify({
        challengeId: loginOptions.data.challengeId,
        response: fakeAuthenticationResponse,
      }),
      method: "POST",
    });
    expect(login.response.status).toBe(200);
    expect(login.response.headers.get("set-cookie")).toContain(
      "otter_session=",
    );

    const expired = await api<typeof options.data>(baseUrl, optionsPath, {
      body: JSON.stringify({ username: `expired_${Date.now()}` }),
      method: "POST",
    });
    await pool.query(
      "UPDATE passkey_signup_challenges SET expires_at = now() - interval '1 second' WHERE id = $1",
      [expired.data.challengeId],
    );
    const expiredAttempt = await api(baseUrl, verifyPath, {
      body: JSON.stringify({
        challengeId: expired.data.challengeId,
        response: fakeRegistrationResponse,
      }),
      method: "POST",
    });
    expect(expiredAttempt.response.status).toBe(400);
  },
);

test(
  "pending passkey signup reserves username against signup and rename until verified or expired",
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
    const optionsPath = "/api/auth/passkey/register/options";
    const username = `reserved_${Date.now()}`;
    const options = await api<{
      challengeId: string;
      options: { challenge: string; user: { id: string } };
    }>(baseUrl, optionsPath, {
      body: JSON.stringify({ username }),
      method: "POST",
    });
    expect(options.response.status).toBe(200);
    const secondSignup = await api(baseUrl, optionsPath, {
      body: JSON.stringify({ username: username.toUpperCase() }),
      method: "POST",
    });
    expect(secondSignup.response.status).toBe(409);

    const owner = await api<UserResponse>(baseUrl, "/api/auth/register", {
      body: JSON.stringify({
        username: `owner_${Date.now()}`,
        password: "password123",
      }),
      method: "POST",
    });
    const ownerCookie = owner.response.headers
      .get("set-cookie")
      ?.split(";", 1)[0];
    assert.ok(ownerCookie);
    const registration = await api(baseUrl, "/api/auth/register", {
      body: JSON.stringify({ username, password: "password123" }),
      method: "POST",
    });
    expect(registration.response.status).toBe(409);
    const rename = await api(baseUrl, "/api/me", {
      body: JSON.stringify({ username }),
      headers: { cookie: ownerCookie },
      method: "PATCH",
    });
    expect(rename.response.status).toBe(409);
    expect(
      (await pool.query("SELECT id FROM users WHERE username = $1", [username]))
        .rowCount,
    ).toBe(0);

    // A browser retry can continue the same ceremony without losing its reservation.
    const retry = await api<typeof options.data>(baseUrl, optionsPath, {
      body: JSON.stringify({ username, challengeId: options.data.challengeId }),
      method: "POST",
    });
    expect(retry.response.status).toBe(200);
    expect(retry.data.challengeId).toBe(options.data.challengeId);
    expect(retry.data.options.challenge).toBe(options.data.options.challenge);
    expect(retry.data.options.user.id).toBe(options.data.options.user.id);
    const verified = await api(baseUrl, "/api/auth/passkey/register/verify", {
      body: JSON.stringify({
        challengeId: retry.data.challengeId,
        response: fakeRegistrationResponse,
      }),
      method: "POST",
    });
    expect(verified.response.status).toBe(201);
    const stored = await pool.query(
      "SELECT id FROM users WHERE username = $1",
      [username],
    );
    expect(stored.rowCount).toBe(1);
    expect(
      (
        await pool.query(
          "SELECT user_id FROM passkeys WHERE credential_id = $1",
          [credentialId],
        )
      ).rows[0]?.user_id,
    ).toBe(stored.rows[0]?.id);

    const expiredUsername = `expired_${Date.now()}`;
    const expired = await api<typeof options.data>(baseUrl, optionsPath, {
      body: JSON.stringify({ username: expiredUsername }),
      method: "POST",
    });
    await pool.query(
      "UPDATE passkey_signup_challenges SET expires_at = now() - interval '1 second' WHERE id = $1",
      [expired.data.challengeId],
    );
    const reused = await api<typeof options.data>(baseUrl, optionsPath, {
      body: JSON.stringify({ username: expiredUsername }),
      method: "POST",
    });
    expect(reused.response.status).toBe(200);
    expect(reused.data.challengeId).not.toBe(expired.data.challengeId);
    expect(reused.data.options.user.id).not.toBe(expired.data.options.user.id);
    await pool.query(
      "UPDATE passkey_signup_challenges SET expires_at = now() - interval '1 second' WHERE id = $1",
      [reused.data.challengeId],
    );
    const afterExpiry = await api(baseUrl, "/api/auth/register", {
      body: JSON.stringify({
        username: expiredUsername,
        password: "password123",
      }),
      method: "POST",
    });
    expect(afterExpiry.response.status).toBe(201);
  },
);

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
