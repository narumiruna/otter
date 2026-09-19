import assert from "node:assert/strict";
import { expect, test, vi } from "vitest";
import type { PasskeyVerifiers } from "./server-passkeys.js";
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
    async () => ({
      authenticationInfo: {
        credentialBackedUp: true,
        credentialDeviceType: "multiDevice",
        credentialID: credentialId,
        newCounter: 1,
        origin: "http://localhost",
        rpID: "localhost",
        userVerified: true,
      },
      verified: true,
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

test(
  "users can enroll, use, list, and remove a passkey with one-time challenges",
  postgresTestOptions,
  async () => {
    const verifiers = mockedVerifiers();
    const { baseUrl } = await withTestApp({
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

    const unauthorized = await api(baseUrl, "/api/passkeys");
    expect(unauthorized.response.status).toBe(401);

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

    const freshOptions = await api<typeof options.data>(
      baseUrl,
      "/api/passkeys/registration/options",
      { headers: { cookie: accountCookie }, method: "POST" },
    );
    const verificationBody = JSON.stringify({
      challengeId: freshOptions.data.challengeId,
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
        expectedChallenge: freshOptions.data.options.challenge,
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

    const authenticationBody = JSON.stringify({
      challengeId: authenticationOptions.data.challengeId,
      response: fakeAuthenticationResponse,
    });
    const authenticated = await api(baseUrl, "/api/auth/passkey/verify", {
      body: authenticationBody,
      method: "POST",
    });
    expect(authenticated.response.status).toBe(200);
    const passkeyCookie = authenticated.response.headers
      .get("set-cookie")
      ?.split(";", 1)[0];
    assert.ok(passkeyCookie);
    expect(verifiers.verifyAuthentication).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedChallenge: authenticationOptions.data.options.challenge,
        expectedOrigin: "http://localhost",
        expectedRPID: "localhost",
        requireUserVerification: true,
      }),
    );
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
    expect(verifiers.verifyAuthentication).toHaveBeenCalledTimes(1);

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
