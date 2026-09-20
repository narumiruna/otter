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
import type { OtterApp, OtterMiddleware } from "./server-http.js";
import { parseRequestBody, requestRemoteAddress } from "./server-http.js";
import { createFixedWindowRateLimiter } from "./server-rate-limit.js";
import {
  createSession,
  currentUser,
  isPgCode,
  makeId,
  sendError,
  setSessionCookie,
  withTransaction,
} from "./server-support.js";

const challengeLifetimeMs = 5 * 60 * 1000;
const authenticationOptionsRateLimitWindowMs = 60 * 1000;
const authenticationOptionsPerClientLimit = 10;
const authenticationOptionsGlobalLimit = 120;

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

type PublicPasskeyRow = Pick<
  PasskeyRow,
  "backed_up" | "created_at" | "credential_id" | "device_type" | "last_used_at"
>;

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

function firstForwardedValue(value: string | null): string | undefined {
  return value?.split(",", 1)[0]?.trim() || undefined;
}

function parsePasskeyOrigin(origin: string): URL {
  const parsedOrigin = new URL(origin);
  if (
    parsedOrigin.username ||
    parsedOrigin.password ||
    parsedOrigin.pathname !== "/" ||
    parsedOrigin.search ||
    parsedOrigin.hash
  ) {
    throw new Error(
      "PASSKEY_ORIGIN must be an origin without credentials, path, query, or fragment",
    );
  }
  if (!parsedOrigin.hostname) {
    throw new Error("PASSKEY_ORIGIN must include a hostname");
  }
  if (
    parsedOrigin.protocol !== "https:" &&
    parsedOrigin.hostname !== "localhost"
  ) {
    throw new Error("PASSKEY_ORIGIN must use HTTPS except on localhost");
  }
  return parsedOrigin;
}

export function resolvePasskeyRelyingParty(
  req: Request,
  configured?: PasskeyRelyingParty,
): PasskeyRelyingParty {
  if (configured) {
    const parsedOrigin = parsePasskeyOrigin(configured.origin);
    return { ...configured, origin: parsedOrigin.origin };
  }

  const forwardedProtocol = firstForwardedValue(
    req.headers.get("x-forwarded-proto"),
  );
  const forwardedHost = firstForwardedValue(
    req.headers.get("x-forwarded-host"),
  );
  const requestHost = forwardedHost ?? req.headers.get("host");
  const configuredOrigin = process.env.PASSKEY_ORIGIN?.trim();
  if (!configuredOrigin && !requestHost) {
    throw new Error(
      "PASSKEY_ORIGIN is required when the request has no Host header",
    );
  }

  const origin =
    configuredOrigin ??
    `${forwardedProtocol ?? new URL(req.url).protocol.slice(0, -1)}://${requestHost}`;
  const parsedOrigin = parsePasskeyOrigin(origin);
  return {
    origin: parsedOrigin.origin,
    rpID: parsedOrigin.hostname,
    rpName: "otter",
  };
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
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id) WHERE ceremony = 'registration'
     DO UPDATE SET id = EXCLUDED.id,
                   challenge = EXCLUDED.challenge,
                   expires_at = EXCLUDED.expires_at,
                   created_at = now()`,
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
  const result = await db.query<Pick<ChallengeRow, "challenge">>(
    `DELETE FROM passkey_challenges
     WHERE id = $1
       AND ceremony = $2
       AND user_id IS NOT DISTINCT FROM $3
       AND expires_at > now()
     RETURNING challenge`,
    [id, ceremony, userId],
  );
  return result.rows[0]?.challenge;
}

function numericCounter(value: string | number): number {
  const counter = Number(value);
  if (!Number.isSafeInteger(counter) || counter < 0) {
    throw new Error("Invalid passkey counter in database");
  }
  return counter;
}

function publicPasskey(row: PublicPasskeyRow) {
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
  mustHaveBrowserSession: OtterMiddleware,
  routeOptions: PasskeyRouteOptions = {},
) {
  const verifiers = routeOptions.verifiers ?? {
    verifyAuthentication: verifyAuthenticationResponse,
    verifyRegistration: verifyRegistrationResponse,
  };
  const rateLimitOptions = {
    globalLimit: authenticationOptionsGlobalLimit,
    perClientLimit: authenticationOptionsPerClientLimit,
    trustProxy: process.env.PASSKEY_TRUST_PROXY === "true",
    windowMs: authenticationOptionsRateLimitWindowMs,
  };
  const limitAuthenticationOptions =
    createFixedWindowRateLimiter(rateLimitOptions);
  const limitRegistrationOptions =
    createFixedWindowRateLimiter(rateLimitOptions);

  app.get(
    "/api/passkeys",
    mustHaveBrowserSession,
    parseRequestBody,
    async (context) => {
      const user = currentUser(context);
      const result = await pool.query<PublicPasskeyRow>(
        `SELECT credential_id, device_type, backed_up, created_at, last_used_at
         FROM passkeys
         WHERE user_id = $1
         ORDER BY created_at, credential_id`,
        [user.id],
      );
      return context.json({ passkeys: result.rows.map(publicPasskey) });
    },
  );

  app.post(
    "/api/passkeys/registration/options",
    mustHaveBrowserSession,
    parseRequestBody,
    async (context) => {
      const retryAfter = limitRegistrationOptions(
        context.req.raw,
        requestRemoteAddress(context),
      );
      if (retryAfter !== undefined) {
        context.header("Retry-After", String(retryAfter));
        return sendError(context, 429, "Passkey 註冊要求過於頻繁，請稍後再試");
      }

      const user = currentUser(context);
      const relyingParty = resolvePasskeyRelyingParty(
        context.req.raw,
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
      return context.json({ challengeId, options });
    },
  );

  app.post(
    "/api/passkeys/registration/verify",
    mustHaveBrowserSession,
    parseRequestBody,
    async (context) => {
      const user = currentUser(context);
      const submitted = responseFromBody<RegistrationResponseJSON>(
        context.get("requestBody"),
      );
      if (!submitted) {
        return sendError(context, 400, "Passkey 註冊回應格式錯誤");
      }
      const challenge = await consumeChallenge(
        pool,
        submitted.challengeId,
        "registration",
        user.id,
      );
      if (!challenge) {
        return sendError(context, 400, "Passkey 註冊要求已失效，請重新嘗試");
      }

      const relyingParty = resolvePasskeyRelyingParty(
        context.req.raw,
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
        return sendError(context, 400, "無法驗證 Passkey，請重新嘗試");
      }
      if (!verification.verified) {
        return sendError(context, 400, "無法驗證 Passkey，請重新嘗試");
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
          return sendError(context, 409, "這組 Passkey 已經註冊");
        }
        throw error;
      }
      return context.json({ ok: true }, 201);
    },
  );

  app.delete(
    "/api/passkeys/:credentialId",
    mustHaveBrowserSession,
    parseRequestBody,
    async (context) => {
      const user = currentUser(context);
      const result = await pool.query(
        `DELETE FROM passkeys WHERE credential_id = $1 AND user_id = $2`,
        [context.req.param("credentialId"), user.id],
      );
      if (result.rowCount === 0) {
        return sendError(context, 404, "找不到 Passkey");
      }
      return context.json({ ok: true });
    },
  );

  app.post("/api/auth/passkey/options", parseRequestBody, async (context) => {
    const retryAfter = limitAuthenticationOptions(
      context.req.raw,
      requestRemoteAddress(context),
    );
    if (retryAfter !== undefined) {
      context.header("Retry-After", String(retryAfter));
      return sendError(context, 429, "Passkey 登入要求過於頻繁，請稍後再試");
    }

    const relyingParty = resolvePasskeyRelyingParty(
      context.req.raw,
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
    return context.json({ challengeId, options });
  });

  app.post("/api/auth/passkey/verify", parseRequestBody, async (context) => {
    const submitted = responseFromBody<AuthenticationResponseJSON>(
      context.get("requestBody"),
    );
    if (!submitted) {
      return sendError(context, 400, "Passkey 登入回應格式錯誤");
    }
    const challenge = await consumeChallenge(
      pool,
      submitted.challengeId,
      "authentication",
      null,
    );
    if (!challenge) {
      return sendError(context, 400, "Passkey 登入要求已失效，請重新嘗試");
    }

    const relyingParty = resolvePasskeyRelyingParty(
      context.req.raw,
      routeOptions.relyingParty,
    );
    const session = await withTransaction(pool, async (client) => {
      const credentialResult = await client.query<PasskeyRow>(
        `SELECT credential_id, user_id, public_key, counter, transports,
                  device_type, backed_up, created_at, last_used_at
           FROM passkeys
           WHERE credential_id = $1
           FOR UPDATE`,
        [submitted.response.id],
      );
      const credential = credentialResult.rows[0];
      if (!credential) return undefined;

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
        return undefined;
      }
      if (!verification.verified) return undefined;

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
    if (!session) {
      return sendError(context, 401, "無法使用這組 Passkey 登入");
    }
    setSessionCookie(context, session.id);
    return context.json({ ok: true });
  });
}
