import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/browser";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type { Pool as PgPool, QueryResult, QueryResultRow } from "pg";
import type { OtterApp, OtterMiddleware, RouteRequest } from "./server-http.js";
import {
  asyncHandler,
  createSession,
  currentUser,
  isPgCode,
  makeId,
  sendError,
  setSessionCookie,
  withTransaction,
} from "./server-support.js";

const challengeLifetimeMs = 5 * 60 * 1000;

export type PasskeyRelyingParty = {
  origin: string;
  rpID: string;
  rpName: string;
};

export type PasskeyVerifiers = {
  verifyAuthentication: typeof verifyAuthenticationResponse;
  verifyRegistration: typeof verifyRegistrationResponse;
};

export type PasskeyRouteOptions = {
  relyingParty?: PasskeyRelyingParty;
  verifiers?: PasskeyVerifiers;
};

type Queryable = {
  query<Row extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResult<Row>>;
};

type PasskeyRow = {
  backed_up: boolean;
  counter: string | number;
  created_at: Date | string;
  credential_id: string;
  device_type: "multiDevice" | "singleDevice";
  last_used_at: Date | string | null;
  public_key: Buffer;
  transports: string[];
  user_id: string;
};

type ChallengeRow = {
  ceremony: "authentication" | "registration";
  challenge: string;
  expires_at: Date | string;
  user_id: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function responseFromBody<
  T extends AuthenticationResponseJSON | RegistrationResponseJSON,
>(body: unknown): { challengeId: string; response: T } | undefined {
  if (!isRecord(body) || typeof body.challengeId !== "string") return undefined;
  const response = body.response;
  if (
    !isRecord(response) ||
    typeof response.id !== "string" ||
    typeof response.rawId !== "string" ||
    response.type !== "public-key" ||
    !isRecord(response.response) ||
    !isRecord(response.clientExtensionResults)
  ) {
    return undefined;
  }
  return { challengeId: body.challengeId, response: response as T };
}

function firstForwardedValue(value: string | undefined): string | undefined {
  return value?.split(",", 1)[0]?.trim() || undefined;
}

export function resolvePasskeyRelyingParty(
  req: RouteRequest,
  configured?: PasskeyRelyingParty,
): PasskeyRelyingParty {
  if (configured) return configured;

  const forwardedProtocol = firstForwardedValue(req.get("x-forwarded-proto"));
  const forwardedHost = firstForwardedValue(req.get("x-forwarded-host"));
  const requestHost = forwardedHost ?? req.get("host");
  const configuredOrigin = process.env.PASSKEY_ORIGIN?.trim();
  if (!configuredOrigin && !requestHost) {
    throw new Error(
      "PASSKEY_ORIGIN is required when the request has no Host header",
    );
  }

  const origin =
    configuredOrigin ?? `${forwardedProtocol ?? req.protocol}://${requestHost}`;
  const parsedOrigin = new URL(origin);
  if (parsedOrigin.origin !== origin) {
    throw new Error("PASSKEY_ORIGIN must be an origin without a path");
  }

  const rpID = process.env.PASSKEY_RP_ID?.trim() || parsedOrigin.hostname;
  if (!rpID || new URL(`https://${rpID}`).hostname !== rpID) {
    throw new Error("PASSKEY_RP_ID must be a valid hostname");
  }

  return { origin, rpID, rpName: "otter" };
}

async function saveChallenge(
  db: Queryable,
  ceremony: ChallengeRow["ceremony"],
  challenge: string,
  userId: string | null,
): Promise<string> {
  await db.query("DELETE FROM passkey_challenges WHERE expires_at <= now()");
  const id = makeId("passkey_challenge");
  await db.query(
    `INSERT INTO passkey_challenges (id, challenge, ceremony, user_id, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      id,
      challenge,
      ceremony,
      userId,
      new Date(Date.now() + challengeLifetimeMs).toISOString(),
    ],
  );
  return id;
}

async function consumeChallenge(
  db: Queryable,
  id: string,
  ceremony: ChallengeRow["ceremony"],
  userId: string | null,
): Promise<string | undefined> {
  const result = await db.query<ChallengeRow>(
    `DELETE FROM passkey_challenges
     WHERE id = $1
     RETURNING challenge, ceremony, user_id, expires_at`,
    [id],
  );
  const row = result.rows[0];
  if (
    !row ||
    row.ceremony !== ceremony ||
    row.user_id !== userId ||
    new Date(row.expires_at).getTime() <= Date.now()
  ) {
    return undefined;
  }
  return row.challenge;
}

function numericCounter(value: string | number): number {
  const counter = Number(value);
  if (!Number.isSafeInteger(counter) || counter < 0) {
    throw new Error("Invalid passkey counter in database");
  }
  return counter;
}

function publicPasskey(row: PasskeyRow) {
  return {
    backedUp: row.backed_up,
    createdAt: new Date(row.created_at).toISOString(),
    deviceType: row.device_type,
    id: row.credential_id,
    lastUsedAt: row.last_used_at
      ? new Date(row.last_used_at).toISOString()
      : null,
  };
}

export function registerPasskeyRoutes(
  app: OtterApp,
  pool: PgPool,
  mustBeSignedIn: OtterMiddleware,
  routeOptions: PasskeyRouteOptions = {},
) {
  const verifiers = routeOptions.verifiers ?? {
    verifyAuthentication: verifyAuthenticationResponse,
    verifyRegistration: verifyRegistrationResponse,
  };

  app.get(
    "/api/passkeys",
    mustBeSignedIn,
    asyncHandler(async (_req, res) => {
      const user = currentUser(res);
      const result = await pool.query<PasskeyRow>(
        `SELECT credential_id, user_id, public_key, counter, transports,
                device_type, backed_up, created_at, last_used_at
         FROM passkeys
         WHERE user_id = $1
         ORDER BY created_at, credential_id`,
        [user.id],
      );
      res.json({ passkeys: result.rows.map(publicPasskey) });
    }),
  );

  app.post(
    "/api/passkeys/registration/options",
    mustBeSignedIn,
    asyncHandler(async (req, res) => {
      const user = currentUser(res);
      const relyingParty = resolvePasskeyRelyingParty(
        req,
        routeOptions.relyingParty,
      );
      const existing = await pool.query<
        Pick<PasskeyRow, "credential_id" | "transports">
      >(`SELECT credential_id, transports FROM passkeys WHERE user_id = $1`, [
        user.id,
      ]);
      const options = await generateRegistrationOptions({
        attestationType: "none",
        authenticatorSelection: {
          residentKey: "required",
          userVerification: "required",
        },
        excludeCredentials: existing.rows.map((row) => ({
          id: row.credential_id,
          transports: row.transports,
        })),
        rpID: relyingParty.rpID,
        rpName: relyingParty.rpName,
        userDisplayName: user.name,
        userID: new TextEncoder().encode(user.id),
        userName: user.username,
      });
      const challengeId = await saveChallenge(
        pool,
        "registration",
        options.challenge,
        user.id,
      );
      res.json({ challengeId, options });
    }),
  );

  app.post(
    "/api/passkeys/registration/verify",
    mustBeSignedIn,
    asyncHandler(async (req, res) => {
      const user = currentUser(res);
      const submitted = responseFromBody<RegistrationResponseJSON>(req.body);
      if (!submitted) {
        sendError(res, 400, "Passkey 註冊回應格式錯誤");
        return;
      }
      const challenge = await consumeChallenge(
        pool,
        submitted.challengeId,
        "registration",
        user.id,
      );
      if (!challenge) {
        sendError(res, 400, "Passkey 註冊要求已失效，請重新嘗試");
        return;
      }

      const relyingParty = resolvePasskeyRelyingParty(
        req,
        routeOptions.relyingParty,
      );
      let verification: Awaited<ReturnType<typeof verifyRegistrationResponse>>;
      try {
        verification = await verifiers.verifyRegistration({
          expectedChallenge: challenge,
          expectedOrigin: relyingParty.origin,
          expectedRPID: relyingParty.rpID,
          requireUserVerification: true,
          response: submitted.response,
        });
      } catch {
        sendError(res, 400, "無法驗證 Passkey，請重新嘗試");
        return;
      }
      if (!verification.verified) {
        sendError(res, 400, "無法驗證 Passkey，請重新嘗試");
        return;
      }

      const { registrationInfo } = verification;
      try {
        await pool.query(
          `INSERT INTO passkeys (
             credential_id, user_id, public_key, counter, transports,
             device_type, backed_up
           ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            registrationInfo.credential.id,
            user.id,
            Buffer.from(registrationInfo.credential.publicKey),
            registrationInfo.credential.counter,
            registrationInfo.credential.transports ?? [],
            registrationInfo.credentialDeviceType,
            registrationInfo.credentialBackedUp,
          ],
        );
      } catch (error) {
        if (isPgCode(error, "23505")) {
          sendError(res, 409, "這組 Passkey 已經註冊");
          return;
        }
        throw error;
      }
      res.status(201).json({ ok: true });
    }),
  );

  app.delete(
    "/api/passkeys/:credentialId",
    mustBeSignedIn,
    asyncHandler(async (req, res) => {
      const user = currentUser(res);
      const result = await pool.query(
        `DELETE FROM passkeys WHERE credential_id = $1 AND user_id = $2`,
        [req.params.credentialId, user.id],
      );
      if (result.rowCount === 0) {
        sendError(res, 404, "找不到 Passkey");
        return;
      }
      res.json({ ok: true });
    }),
  );

  app.post(
    "/api/auth/passkey/options",
    asyncHandler(async (req, res) => {
      const relyingParty = resolvePasskeyRelyingParty(
        req,
        routeOptions.relyingParty,
      );
      const options = await generateAuthenticationOptions({
        rpID: relyingParty.rpID,
        userVerification: "required",
      });
      const challengeId = await saveChallenge(
        pool,
        "authentication",
        options.challenge,
        null,
      );
      res.json({ challengeId, options });
    }),
  );

  app.post(
    "/api/auth/passkey/verify",
    asyncHandler(async (req, res) => {
      const submitted = responseFromBody<AuthenticationResponseJSON>(req.body);
      if (!submitted) {
        sendError(res, 400, "Passkey 登入回應格式錯誤");
        return;
      }
      const challenge = await consumeChallenge(
        pool,
        submitted.challengeId,
        "authentication",
        null,
      );
      if (!challenge) {
        sendError(res, 400, "Passkey 登入要求已失效，請重新嘗試");
        return;
      }

      const credentialResult = await pool.query<PasskeyRow>(
        `SELECT credential_id, user_id, public_key, counter, transports,
                device_type, backed_up, created_at, last_used_at
         FROM passkeys
         WHERE credential_id = $1`,
        [submitted.response.id],
      );
      const credential = credentialResult.rows[0];
      if (!credential) {
        sendError(res, 401, "無法使用這組 Passkey 登入");
        return;
      }

      const relyingParty = resolvePasskeyRelyingParty(
        req,
        routeOptions.relyingParty,
      );
      let verification: Awaited<
        ReturnType<typeof verifyAuthenticationResponse>
      >;
      try {
        verification = await verifiers.verifyAuthentication({
          credential: {
            counter: numericCounter(credential.counter),
            id: credential.credential_id,
            publicKey: new Uint8Array(credential.public_key),
            transports: credential.transports,
          },
          expectedChallenge: challenge,
          expectedOrigin: relyingParty.origin,
          expectedRPID: relyingParty.rpID,
          requireUserVerification: true,
          response: submitted.response,
        });
      } catch {
        sendError(res, 401, "無法使用這組 Passkey 登入");
        return;
      }
      if (!verification.verified) {
        sendError(res, 401, "無法使用這組 Passkey 登入");
        return;
      }

      const session = await withTransaction(pool, async (client) => {
        await client.query(
          `UPDATE passkeys
           SET counter = $1,
               device_type = $2,
               backed_up = $3,
               last_used_at = now()
           WHERE credential_id = $4`,
          [
            verification.authenticationInfo.newCounter,
            verification.authenticationInfo.credentialDeviceType,
            verification.authenticationInfo.credentialBackedUp,
            credential.credential_id,
          ],
        );
        return createSession(client, credential.user_id);
      });
      setSessionCookie(res, session.id);
      res.json({ ok: true });
    }),
  );
}
