import { expect, test, vi } from "vitest";
import type { PasskeyVerifiers } from "./server-passkeys.js";
import { createSession } from "./server-support.js";
import { api, postgresTestOptions, withTestApp } from "./server-test-utils.js";

const credentialId = "duplicate_credential";
const registrationResponse = {
  clientExtensionResults: {},
  id: credentialId,
  rawId: credentialId,
  response: {},
  type: "public-key",
};

async function withDuplicateCredential() {
  const verifyRegistration = vi.fn<PasskeyVerifiers["verifyRegistration"]>(
    async () => ({
      registrationInfo: {
        aaguid: "00000000-0000-0000-0000-000000000000",
        attestationObject: new Uint8Array(),
        credential: {
          counter: 0,
          id: credentialId,
          publicKey: new Uint8Array([4, 5, 6]),
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
  const app = await withTestApp({
    appOptions: {
      passkeys: {
        relyingParty: {
          origin: "http://localhost",
          rpID: "localhost",
          rpName: "otter test",
        },
        verifiers: {
          verifyAuthentication:
            vi.fn<PasskeyVerifiers["verifyAuthentication"]>(),
          verifyRegistration,
        },
      },
    },
    prepare: async (db) => {
      await db.query(
        `INSERT INTO users (id, name, username, password_hash)
         VALUES ('key_owner', 'Owner', 'key_owner', NULL),
                ('enrolling_user', 'Enrolling', 'enrolling_user', NULL)`,
      );
      await db.query(
        `INSERT INTO passkeys (credential_id, user_id, public_key, counter, transports, device_type, backed_up)
         VALUES ($1, 'key_owner', $2, 7, ARRAY['usb'], 'singleDevice', false)`,
        [credentialId, Buffer.from([1, 2, 3])],
      );
    },
  });
  const storedKey = (await app.pool.query("SELECT * FROM passkeys")).rows;
  return { ...app, storedKey, verifyRegistration };
}

test(
  "duplicate signup credential returns its conflict message and rolls back the account and challenge",
  postgresTestOptions,
  async () => {
    const { baseUrl, pool, storedKey, verifyRegistration } =
      await withDuplicateCredential();
    const options = await api<{ challengeId: string }>(
      baseUrl,
      "/api/auth/passkey/register/options",
      {
        body: JSON.stringify({ username: "duplicate_signup" }),
        method: "POST",
      },
    );
    expect(options.response.status).toBe(200);
    const pending = await pool.query<{ user_id: string }>(
      "SELECT * FROM passkey_signup_challenges WHERE id = $1",
      [options.data.challengeId],
    );
    expect(pending.rowCount).toBe(1);

    const result = await api<{ error: string }>(
      baseUrl,
      "/api/auth/passkey/register/verify",
      {
        body: JSON.stringify({
          challengeId: options.data.challengeId,
          response: registrationResponse,
        }),
        method: "POST",
      },
    );
    expect(result.response.status).toBe(409);
    expect(result.data.error).toBe("Username 或 Passkey 已經註冊");
    expect(result.response.headers.get("set-cookie")).toBeNull();
    expect(verifyRegistration).toHaveBeenCalledTimes(1);
    expect(
      (
        await pool.query(
          "SELECT id FROM users WHERE id = $1 OR username = 'duplicate_signup'",
          [pending.rows[0].user_id],
        )
      ).rowCount,
    ).toBe(0);
    expect(
      (
        await pool.query("SELECT id FROM sessions WHERE user_id = $1", [
          pending.rows[0].user_id,
        ])
      ).rowCount,
    ).toBe(0);
    expect(
      (
        await pool.query(
          "SELECT * FROM passkey_signup_challenges WHERE id = $1",
          [options.data.challengeId],
        )
      ).rows,
    ).toEqual(pending.rows);
    expect((await pool.query("SELECT * FROM passkeys")).rows).toEqual(
      storedKey,
    );
  },
);

test(
  "duplicate enrollment credential returns its own conflict message and consumes the challenge",
  postgresTestOptions,
  async () => {
    const { baseUrl, pool, storedKey, verifyRegistration } =
      await withDuplicateCredential();
    const cookie = `otter_session=${(await createSession(pool, "enrolling_user")).id}`;
    const options = await api<{ challengeId: string }>(
      baseUrl,
      "/api/passkeys/registration/options",
      { headers: { cookie }, method: "POST" },
    );
    expect(options.response.status).toBe(200);
    const verify = () =>
      api<{ error: string }>(baseUrl, "/api/passkeys/registration/verify", {
        body: JSON.stringify({
          challengeId: options.data.challengeId,
          response: registrationResponse,
        }),
        headers: { cookie },
        method: "POST",
      });
    const result = await verify();
    expect(result.response.status).toBe(409);
    expect(result.data.error).toBe("這組 Passkey 已經註冊");
    expect(result.response.headers.get("set-cookie")).toBeNull();
    expect((await pool.query("SELECT * FROM passkeys")).rows).toEqual(
      storedKey,
    );
    expect(
      (
        await pool.query("SELECT id FROM passkey_challenges WHERE id = $1", [
          options.data.challengeId,
        ])
      ).rowCount,
    ).toBe(0);
    expect((await verify()).response.status).toBe(400);
    expect(verifyRegistration).toHaveBeenCalledTimes(1);
  },
);
