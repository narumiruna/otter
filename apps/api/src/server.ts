import path from "node:path";
import { fileURLToPath } from "node:url";
import { serve as serveNode } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { type Currency, isCurrency } from "@narumitw/otter-core/money";
import { participantDeletionBlock } from "@narumitw/otter-core/participant-deletion";
import type { Participant } from "@narumitw/otter-core/settlement";
import {
  isValidUsername,
  usernameValidationMessage,
} from "@narumitw/otter-core/username";
import { Hono } from "hono";
import type { Pool as PgPool } from "pg";
import { registerBackupRoutes } from "./server-backup.js";
import { registerCollaborationRoutes } from "./server-collaboration.js";
import { registerCsvImportRoutes } from "./server-csv-import.js";
import {
  type DevelopmentAdminCredentials,
  developmentAdminCredentials,
  ensureDevelopmentAdmin,
  ensureDevelopmentFixtures,
} from "./server-dev.js";
import { registerDeviceAuthRoutes } from "./server-device-auth.js";
import {
  createExchangeRateService,
  type ExchangeRateRouteOptions,
  registerExchangeRateRoutes,
} from "./server-exchange-rates.js";
import { registerExpenseHistoryRoutes } from "./server-expense-history-routes.js";
import { registerExpenseRoutes } from "./server-expenses.js";
import type { OtterApp, OtterEnv } from "./server-http.js";
import { parseRequestBody, requestRemoteAddress } from "./server-http.js";
import { registerParticipantMergeRoute } from "./server-participant-merge.js";
import {
  type PasskeyRouteOptions,
  registerPasskeyRoutes,
} from "./server-passkeys.js";
import { registerPersonalApiTokenRoutes } from "./server-personal-api-tokens.js";
import { createFixedWindowRateLimiter } from "./server-rate-limit.js";
import { registerReceiptRoutes } from "./server-receipts.js";
import { registerSettlementPaymentRoutes } from "./server-settlement-payments.js";
import { registerShareRoutes } from "./server-sharing.js";
import {
  archivedTripResponse,
  clearSessionCookie,
  createPool,
  createSession,
  currencyFromDb,
  currentUser,
  findUserByUsername,
  getCookie,
  hashPassword,
  iso,
  isPgCode,
  isProduction,
  type LoadedTrip,
  loadTripForUser,
  makeId,
  normalizeUsername,
  nowIso,
  participantExists,
  participantNameExists,
  publicUser,
  requestBody,
  requireSessionUser,
  requireUser,
  type Session,
  sendError,
  setSessionCookie,
  stringField,
  tripNameExistsForUser,
  type User,
  userFromRequest,
  verifyPassword,
  withTransaction,
} from "./server-support.js";
import { tripMutation } from "./server-trip-mutation.js";

type TripSummaryRow = {
  id: string;
  name: string;
  base_currency: string;
  archived_at: Date | string | null;
  created_at: Date | string;
  participant_count: string | number;
  expense_count: string | number;
};

function tripExchangeRatesFromBody(
  value: unknown,
  baseCurrency: Currency,
): [Currency, number][] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("匯率格式錯誤");
  }
  const rows: [Currency, number][] = [];
  for (const [currency, rawRate] of Object.entries(value)) {
    if (!isCurrency(currency)) {
      throw new Error("不支援的匯率貨幣");
    }
    if (currency === baseCurrency || String(rawRate ?? "").trim() === "") {
      continue;
    }
    const rate = Number(rawRate);
    if (!Number.isFinite(rate) || rate <= 0) {
      throw new Error("匯率必須大於 0");
    }
    rows.push([currency, rate]);
  }
  return rows;
}

const passwordRateLimitWindowMs = 60 * 1000;
const loginPerClientLimit = 10;
const loginGlobalLimit = 120;
const registrationPerClientLimit = 5;
const registrationGlobalLimit = 30;
const dummyPasswordHash =
  "pbkdf2:210000:0123456789abcdef0123456789abcdef:d2cd8cc578b0a477ba3359db4388f614d386886df393c8aabb022b3e8e40ff14";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type CreateAppOptions = {
  devLoginCredentials?: DevelopmentAdminCredentials | null;
  exchangeRates?: ExchangeRateRouteOptions;
  passkeys?: PasskeyRouteOptions;
  passwordVerifier?: typeof verifyPassword;
};

export function createApp(
  pool: PgPool,
  options: CreateAppOptions = {},
): OtterApp {
  const app = new Hono<OtterEnv>();
  const mustBeSignedIn = requireUser(pool);
  const mustHaveBrowserSession = requireSessionUser(pool);
  const exchangeRateService = createExchangeRateService(options.exchangeRates);
  const { buildTripPayload } = exchangeRateService;
  const passwordVerifier = options.passwordVerifier ?? verifyPassword;
  const passwordRateLimitOptions = {
    trustProxy: process.env.PASSWORD_AUTH_TRUST_PROXY === "true",
    windowMs: passwordRateLimitWindowMs,
  };
  const limitLoginRequests = createFixedWindowRateLimiter({
    ...passwordRateLimitOptions,
    globalLimit: loginGlobalLimit,
    perClientLimit: loginPerClientLimit,
  });
  const limitRegistrationRequests = createFixedWindowRateLimiter({
    ...passwordRateLimitOptions,
    globalLimit: registrationGlobalLimit,
    perClientLimit: registrationPerClientLimit,
  });

  registerPasskeyRoutes(app, pool, mustHaveBrowserSession, options.passkeys);
  registerBackupRoutes(app, pool, mustBeSignedIn, buildTripPayload);
  registerDeviceAuthRoutes(app, pool, mustBeSignedIn, mustHaveBrowserSession);
  registerExchangeRateRoutes(app, mustBeSignedIn, exchangeRateService);
  registerPersonalApiTokenRoutes(app, pool, mustHaveBrowserSession);

  app.get("/api/config", (context) => {
    const credentials = options.devLoginCredentials;
    return context.json({
      devLoginCredentials: credentials
        ? { username: credentials.username, password: credentials.password }
        : null,
    });
  });

  app.get("/api/me", parseRequestBody, async (context) => {
    const user = await userFromRequest(pool, context.req.raw);
    return context.json({ user: user ? publicUser(user) : null });
  });

  app.patch(
    "/api/me",
    mustHaveBrowserSession,
    parseRequestBody,
    async (context) => {
      const user = currentUser(context);
      const username = stringField(requestBody(context), "username");
      if (!username || !isValidUsername(username)) {
        return sendError(context, 400, usernameValidationMessage);
      }

      const normalizedUsername = normalizeUsername(username);
      if (
        options.devLoginCredentials &&
        user.username ===
          normalizeUsername(options.devLoginCredentials.username)
      ) {
        return sendError(context, 409, "開發環境預設帳號不能修改 Username");
      }
      try {
        await pool.query("UPDATE users SET username = $1 WHERE id = $2", [
          normalizedUsername,
          user.id,
        ]);
      } catch (error) {
        if (isPgCode(error, "23505")) {
          return sendError(context, 409, "這個 Username 已經註冊");
        }
        throw error;
      }

      return context.json({
        user: publicUser({ ...user, username: normalizedUsername }),
      });
    },
  );

  app.post("/api/auth/register", parseRequestBody, async (context) => {
    const retryAfter = limitRegistrationRequests(
      context.req.raw,
      requestRemoteAddress(context),
    );
    if (retryAfter !== undefined) {
      context.header("Retry-After", String(retryAfter));
      return sendError(context, 429, "驗證要求過於頻繁，請稍後再試");
    }

    const body = requestBody(context);
    const username = stringField(body, "username");
    const password = stringField(body, "password");

    if (!username || !isValidUsername(username)) {
      return sendError(context, 400, usernameValidationMessage);
    }
    if (!password || password.length < 8) {
      return sendError(context, 400, "密碼至少需要 8 個字");
    }

    const normalizedUsername = normalizeUsername(username);
    const legacyName = stringField(body, "name");
    if (legacyName && legacyName.length > 80) {
      return sendError(context, 400, "名稱最多 80 字");
    }
    if (await findUserByUsername(pool, normalizedUsername)) {
      return sendError(context, 409, "這個 Username 已經註冊");
    }

    const user: User = {
      createdAt: nowIso(),
      username: normalizedUsername,
      id: makeId("user"),
      name: legacyName || normalizedUsername,
      passwordHash: await hashPassword(password),
    };

    let session: Session;
    try {
      session = await withTransaction(pool, async (client) => {
        await client.query(
          `INSERT INTO users (id, name, username, password_hash, created_at)
             VALUES ($1, $2, $3, $4, $5)`,
          [
            user.id,
            user.name,
            user.username,
            user.passwordHash,
            user.createdAt,
          ],
        );
        return createSession(client, user.id);
      });
    } catch (error) {
      if (isPgCode(error, "23505")) {
        return sendError(context, 409, "這個 Username 已經註冊");
      }
      throw error;
    }

    setSessionCookie(context, session.id);
    return context.json({ user: publicUser(user) }, 201);
  });

  app.post("/api/auth/login", parseRequestBody, async (context) => {
    const retryAfter = limitLoginRequests(
      context.req.raw,
      requestRemoteAddress(context),
    );
    if (retryAfter !== undefined) {
      context.header("Retry-After", String(retryAfter));
      return sendError(context, 429, "驗證要求過於頻繁，請稍後再試");
    }

    const body = requestBody(context);
    const username = stringField(body, "username");
    const password = stringField(body, "password");

    if (!username || !password) {
      return sendError(context, 400, "請輸入 Username 和密碼");
    }

    const user = await findUserByUsername(pool, normalizeUsername(username));
    const passwordMatches = await passwordVerifier(
      password,
      user?.passwordHash ?? dummyPasswordHash,
    );
    if (!user || !passwordMatches) {
      return sendError(context, 401, "Username 或密碼錯誤");
    }

    const session = await createSession(pool, user.id);
    setSessionCookie(context, session.id);
    return context.json({ user: publicUser(user) });
  });

  app.post("/api/auth/logout", parseRequestBody, async (context) => {
    const sessionId = getCookie(context.req.raw, "otter_session");
    if (sessionId) {
      await pool.query("DELETE FROM sessions WHERE id = $1", [sessionId]);
    }
    clearSessionCookie(context);
    return context.json({ ok: true });
  });

  app.get("/api/trips", mustBeSignedIn, parseRequestBody, async (context) => {
    const user = currentUser(context);
    const result = await pool.query<TripSummaryRow>(
      `SELECT trips.id,
                trips.name,
                trips.base_currency,
                trips.archived_at,
                trips.created_at,
                count(DISTINCT participants.id) AS participant_count,
                count(DISTINCT expenses.id) AS expense_count
         FROM trips
         JOIN trip_members ON trip_members.trip_id = trips.id
         LEFT JOIN participants ON participants.trip_id = trips.id
         LEFT JOIN expenses ON expenses.trip_id = trips.id
         WHERE trip_members.user_id = $1
         GROUP BY trips.id, trip_members.role
         ORDER BY trips.created_at, trips.id`,
      [user.id],
    );

    const trips = result.rows.map((row) => ({
      archivedAt: row.archived_at ? iso(row.archived_at) : null,
      baseCurrency: currencyFromDb(row.base_currency),
      createdAt: iso(row.created_at),
      expenseCount: Number(row.expense_count),
      id: row.id,
      name: row.name,
      participantCount: Number(row.participant_count),
    }));
    return context.json({
      archivedTrips: trips.filter((trip) => trip.archivedAt),
      trips: trips.filter((trip) => !trip.archivedAt),
    });
  });

  app.post("/api/trips", mustBeSignedIn, parseRequestBody, async (context) => {
    const user = currentUser(context);
    const body = requestBody(context);
    const name = stringField(body, "name");
    const baseCurrencyValue = body.baseCurrency;
    if (baseCurrencyValue !== undefined && !isCurrency(baseCurrencyValue)) {
      return sendError(context, 400, "不支援的基準貨幣");
    }
    const baseCurrency: Currency = baseCurrencyValue ?? "TWD";

    if (!name || name.length > 100) {
      return sendError(context, 400, "請輸入 1-100 字的旅行名稱");
    }
    if (await tripNameExistsForUser(pool, user.id, name)) {
      return sendError(context, 409, "旅行名稱已存在");
    }

    const createdAt = nowIso();
    const ownerParticipant: Participant = {
      id: makeId("participant"),
      name: user.name,
    };
    const trip: LoadedTrip = {
      baseCurrency,
      createdAt,
      expenses: [],
      id: makeId("trip"),
      name,
      ownerId: user.id,
      participants: [ownerParticipant],
    };

    await withTransaction(pool, async (client) => {
      await client.query(
        `INSERT INTO trips (id, owner_id, name, base_currency, created_at)
           VALUES ($1, $2, $3, $4, $5)`,
        [trip.id, trip.ownerId, trip.name, trip.baseCurrency, trip.createdAt],
      );
      await client.query(
        `INSERT INTO trip_members (id, trip_id, user_id, role, created_at)
           VALUES ($1, $2, $3, 'owner', $4)`,
        [makeId("member"), trip.id, user.id, createdAt],
      );
      await client.query(
        `INSERT INTO participants (id, trip_id, name, created_at)
           VALUES ($1, $2, $3, $4)`,
        [ownerParticipant.id, trip.id, ownerParticipant.name, createdAt],
      );
    });

    return context.json(await buildTripPayload(trip), 201);
  });

  app.get(
    "/api/trips/:tripId",
    mustBeSignedIn,
    parseRequestBody,
    async (context) => {
      const trip = await loadTripForUser(
        pool,
        currentUser(context).id,
        context.req.param("tripId"),
      );
      if (!trip) {
        return sendError(context, 404, "找不到旅行");
      }

      return context.json(await buildTripPayload(trip));
    },
  );

  app.patch(
    "/api/trips/:tripId",
    mustBeSignedIn,
    parseRequestBody,
    tripMutation(pool, async (context, pool) => {
      const user = currentUser(context);
      const trip = await loadTripForUser(
        pool,
        user.id,
        context.req.param("tripId"),
      );
      if (!trip) {
        return sendError(context, 404, "找不到旅行");
      }
      if (trip.currentUserRole !== "owner") {
        return sendError(context, 403, "只有擁有者可管理旅行設定");
      }

      const body = requestBody(context);
      const hasName = "name" in body;
      const hasBaseCurrency = "baseCurrency" in body;
      const hasArchived = "archived" in body;
      const hasExchangeRates = "exchangeRates" in body;
      if (!hasName && !hasBaseCurrency && !hasArchived && !hasExchangeRates) {
        return sendError(context, 400, "請提供要更新的旅行內容");
      }
      if (trip.archivedAt && (hasName || hasBaseCurrency || hasExchangeRates)) {
        return archivedTripResponse(context);
      }

      const name = hasName ? stringField(body, "name") : trip.name;
      if (!name || name.length > 100) {
        return sendError(context, 400, "請輸入 1-100 字的旅行名稱");
      }
      if (await tripNameExistsForUser(pool, user.id, name, trip.id)) {
        return sendError(context, 409, "旅行名稱已存在");
      }

      const baseCurrencyValue = hasBaseCurrency
        ? body.baseCurrency
        : trip.baseCurrency;
      if (!isCurrency(baseCurrencyValue)) {
        return sendError(context, 400, "不支援的基準貨幣");
      }

      let archivedAt: string | null | undefined;
      if (hasArchived) {
        if (typeof body.archived !== "boolean") {
          return sendError(context, 400, "封存狀態格式錯誤");
        }
        archivedAt = body.archived === true ? nowIso() : null;
      }

      let exchangeRates: [Currency, number][] = [];
      if (hasExchangeRates) {
        try {
          exchangeRates = tripExchangeRatesFromBody(
            body.exchangeRates,
            baseCurrencyValue,
          );
        } catch (error) {
          return sendError(
            context,
            400,
            error instanceof Error ? error.message : "匯率格式錯誤",
          );
        }
      }

      const baseCurrencyChanged =
        hasBaseCurrency && baseCurrencyValue !== trip.baseCurrency;

      await withTransaction(pool, async (client) => {
        if (hasArchived) {
          await client.query(
            "UPDATE trips SET name = $1, base_currency = $2, archived_at = $3 WHERE id = $4 AND owner_id = $5",
            [
              name,
              baseCurrencyValue,
              archivedAt,
              context.req.param("tripId"),
              user.id,
            ],
          );
        } else {
          await client.query(
            "UPDATE trips SET name = $1, base_currency = $2 WHERE id = $3 AND owner_id = $4",
            [name, baseCurrencyValue, context.req.param("tripId"), user.id],
          );
        }

        if (!hasExchangeRates && !baseCurrencyChanged) {
          return;
        }
        await client.query(
          "DELETE FROM trip_exchange_rates WHERE trip_id = $1",
          [context.req.param("tripId")],
        );
        for (const [currency, rate] of exchangeRates) {
          await client.query(
            `INSERT INTO trip_exchange_rates (trip_id, currency, rate_to_base)
             VALUES ($1, $2, $3)`,
            [context.req.param("tripId"), currency, rate],
          );
        }
      });

      const updated = await loadTripForUser(
        pool,
        user.id,
        context.req.param("tripId"),
      );
      if (!updated) {
        throw new Error("Trip disappeared after rename");
      }
      return context.json(await buildTripPayload(updated));
    }),
  );

  app.delete(
    "/api/trips/:tripId",
    mustBeSignedIn,
    parseRequestBody,
    async (context) => {
      const user = currentUser(context);
      const deleted = await withTransaction(pool, async (client) => {
        const lockedTrip = await client.query(
          "SELECT id FROM trips WHERE id = $1 AND owner_id = $2 FOR UPDATE",
          [context.req.param("tripId"), user.id],
        );
        if (lockedTrip.rowCount === 0) {
          return lockedTrip;
        }

        await client.query(
          "DELETE FROM settlement_payments WHERE trip_id = $1",
          [context.req.param("tripId")],
        );
        await client.query(
          "DELETE FROM expense_participants WHERE trip_id = $1",
          [context.req.param("tripId")],
        );
        await client.query("DELETE FROM expenses WHERE trip_id = $1", [
          context.req.param("tripId"),
        ]);
        await client.query("DELETE FROM participants WHERE trip_id = $1", [
          context.req.param("tripId"),
        ]);
        return client.query("DELETE FROM trips WHERE id = $1", [
          context.req.param("tripId"),
        ]);
      });
      if (deleted.rowCount === 0) {
        return sendError(context, 404, "找不到旅行");
      }

      return context.json({ ok: true });
    },
  );

  app.post(
    "/api/trips/:tripId/participants",
    mustBeSignedIn,
    parseRequestBody,
    tripMutation(pool, async (context, pool) => {
      const user = currentUser(context);
      const trip = await loadTripForUser(
        pool,
        user.id,
        context.req.param("tripId"),
      );
      if (!trip) {
        return sendError(context, 404, "找不到旅行");
      }
      if (trip.archivedAt) {
        return archivedTripResponse(context);
      }

      const name = stringField(requestBody(context), "name");
      if (!name || name.length > 80) {
        return sendError(context, 400, "請輸入 1-80 字的參與者名稱");
      }
      if (participantNameExists(trip, name)) {
        return sendError(context, 409, "參與者名稱已存在");
      }

      await pool.query(
        `INSERT INTO participants (id, trip_id, name, created_at)
         VALUES ($1, $2, $3, $4)`,
        [makeId("participant"), trip.id, name, nowIso()],
      );
      const updated = await loadTripForUser(pool, user.id, trip.id);
      if (!updated) {
        throw new Error("Trip disappeared after participant insert");
      }
      return context.json(await buildTripPayload(updated), 201);
    }),
  );

  app.patch(
    "/api/trips/:tripId/participants/:participantId",
    mustBeSignedIn,
    parseRequestBody,
    tripMutation(pool, async (context, pool) => {
      const user = currentUser(context);
      const trip = await loadTripForUser(
        pool,
        user.id,
        context.req.param("tripId"),
      );
      if (!trip) {
        return sendError(context, 404, "找不到旅行");
      }
      if (trip.archivedAt) {
        return archivedTripResponse(context);
      }

      const name = stringField(requestBody(context), "name");
      if (!name || name.length > 80) {
        return sendError(context, 400, "請輸入 1-80 字的參與者名稱");
      }
      if (!participantExists(trip, context.req.param("participantId"))) {
        return sendError(context, 404, "找不到參與者");
      }
      if (
        participantNameExists(trip, name, context.req.param("participantId"))
      ) {
        return sendError(context, 409, "參與者名稱已存在");
      }

      const renamed = await pool.query(
        "UPDATE participants SET name = $1 WHERE trip_id = $2 AND id = $3",
        [name, trip.id, context.req.param("participantId")],
      );
      if (renamed.rowCount === 0) {
        return sendError(context, 404, "找不到參與者");
      }

      const updated = await loadTripForUser(pool, user.id, trip.id);
      if (!updated) {
        throw new Error("Trip disappeared after participant rename");
      }
      return context.json(await buildTripPayload(updated));
    }),
  );

  registerParticipantMergeRoute(app, pool, mustBeSignedIn, buildTripPayload);

  app.delete(
    "/api/trips/:tripId/participants/:participantId",
    mustBeSignedIn,
    parseRequestBody,
    tripMutation(pool, async (context, pool) => {
      const user = currentUser(context);
      const trip = await loadTripForUser(
        pool,
        user.id,
        context.req.param("tripId"),
      );
      if (!trip) {
        return sendError(context, 404, "找不到旅行");
      }
      if (trip.archivedAt) {
        return archivedTripResponse(context);
      }

      const participantId = context.req.param("participantId");
      if (!participantExists(trip, participantId)) {
        return sendError(context, 404, "找不到參與者");
      }
      const deletionBlock = participantDeletionBlock(trip, participantId);
      if (deletionBlock === "last-participant") {
        return sendError(context, 400, "至少需要一位參與者");
      }
      if (deletionBlock === "expense") {
        return sendError(context, 409, "參與者已有支出，不能刪除");
      }
      if (deletionBlock === "payment") {
        return sendError(context, 409, "參與者已有付款紀錄，不能刪除");
      }

      await pool.query(
        "DELETE FROM participants WHERE trip_id = $1 AND id = $2",
        [trip.id, participantId],
      );
      const updated = await loadTripForUser(pool, user.id, trip.id);
      if (!updated) {
        throw new Error("Trip disappeared after participant delete");
      }
      return context.json(await buildTripPayload(updated));
    }),
  );

  registerCollaborationRoutes(
    app,
    pool,
    mustHaveBrowserSession,
    buildTripPayload,
  );
  registerCsvImportRoutes(app, pool, mustBeSignedIn, buildTripPayload);
  registerExpenseRoutes(app, pool, mustBeSignedIn, buildTripPayload);
  registerExpenseHistoryRoutes(app, pool, mustBeSignedIn);
  registerReceiptRoutes(app, pool, mustBeSignedIn, buildTripPayload);
  registerSettlementPaymentRoutes(app, pool, mustBeSignedIn, buildTripPayload);
  registerShareRoutes(app, pool, mustHaveBrowserSession, buildTripPayload);

  app.all("/api", (context) => context.json({ error: "找不到 API" }, 404));
  app.all("/api/*", (context) => context.json({ error: "找不到 API" }, 404));

  app.notFound((context) =>
    context.req.path.startsWith("/api")
      ? context.json({ error: "找不到 API" }, 404)
      : context.text("Not found", 404),
  );

  app.onError((error, context) => {
    console.error(error);
    return context.json({ error: "伺服器錯誤" }, 500);
  });

  return app;
}

export function webAssetsRoot(
  environment: NodeJS.ProcessEnv = process.env,
  moduleDirectory = __dirname,
): string {
  return environment.OTTER_WEB_ROOT
    ? path.resolve(environment.OTTER_WEB_ROOT)
    : path.resolve(moduleDirectory, "../../web/dist");
}

async function start() {
  const pool = createPool();
  const credentials = developmentAdminCredentials(process.env);
  if (credentials) {
    const userId = await ensureDevelopmentAdmin(pool, credentials);
    await ensureDevelopmentFixtures(pool, userId);
    console.log(`Development fixtures ready for: ${credentials.username}`);
  }
  const app = createApp(pool, { devLoginCredentials: credentials });

  const port = Number(process.env.PORT ?? (isProduction ? 17463 : 17464));
  if (isProduction) {
    const clientDir = webAssetsRoot();
    app.use("*", serveStatic({ root: clientDir }));
    app.get("*", serveStatic({ path: "index.html", root: clientDir }));
  }
  serveNode({ fetch: app.fetch, hostname: "0.0.0.0", port }, () =>
    console.log(`otter listening on http://0.0.0.0:${port}`),
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  void start();
}
