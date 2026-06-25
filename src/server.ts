import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import {
  type Currency,
  currencies,
  currencyInfo,
  isCurrency,
  parseAmountToMinor,
} from "./shared/money.js";
import {
  calculateBalances,
  calculateSettlements,
  type Participant,
  type Trip,
} from "./shared/settlement.js";

type User = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
};

type Session = {
  id: string;
  userId: string;
  expiresAt: string;
};

type Store = {
  users: User[];
  sessions: Session[];
  trips: Trip[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
const dataFile = process.env.DATA_FILE ?? path.join(dataDir, "otter.json");
const sessionDays = 7;
const sessionMaxAgeSeconds = sessionDays * 24 * 60 * 60;
const passwordIterations = 210_000;

const store = loadStore();

function loadStore(): Store {
  if (!fs.existsSync(dataFile)) {
    return { sessions: [], trips: [], users: [] };
  }

  const parsed = JSON.parse(
    fs.readFileSync(dataFile, "utf8"),
  ) as Partial<Store>;
  return {
    sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
    trips: Array.isArray(parsed.trips) ? parsed.trips : [],
    users: Array.isArray(parsed.users) ? parsed.users : [],
  };
}

function saveStore() {
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  const tempFile = `${dataFile}.tmp`;
  fs.writeFileSync(tempFile, `${JSON.stringify(store, null, 2)}\n`);
  fs.renameSync(tempFile, dataFile);
}

function publicUser(user: User) {
  return {
    email: user.email,
    id: user.id,
    name: user.name,
  };
}

function makeId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, passwordIterations, 32, "sha256")
    .toString("hex");
  return `pbkdf2:${passwordIterations}:${salt}:${hash}`;
}

function verifyPassword(password: string, passwordHash: string): boolean {
  const [algorithm, iterationsText, salt, hash] = passwordHash.split(":");
  const iterations = Number(iterationsText);

  if (
    algorithm !== "pbkdf2" ||
    !Number.isSafeInteger(iterations) ||
    !salt ||
    !hash
  ) {
    return false;
  }

  const candidate = crypto
    .pbkdf2Sync(password, salt, iterations, 32, "sha256")
    .toString("hex");
  const hashBuffer = Buffer.from(hash, "hex");
  const candidateBuffer = Buffer.from(candidate, "hex");

  return (
    hashBuffer.length === candidateBuffer.length &&
    crypto.timingSafeEqual(hashBuffer, candidateBuffer)
  );
}

function requestBody(req: Request): Record<string, unknown> {
  return req.body && typeof req.body === "object"
    ? (req.body as Record<string, unknown>)
    : {};
}

function stringField(
  body: Record<string, unknown>,
  field: string,
): string | undefined {
  const value = body[field];
  return typeof value === "string" ? value.trim() : undefined;
}

function sendError(res: Response, status: number, error: string) {
  res.status(status).json({ error });
}

function getCookie(req: Request, name: string): string | undefined {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) {
    return undefined;
  }

  for (const cookie of cookieHeader.split(";")) {
    const [rawName, ...rawValue] = cookie.trim().split("=");
    if (rawName === name) {
      return decodeURIComponent(rawValue.join("="));
    }
  }

  return undefined;
}

function setSessionCookie(res: Response, sessionId: string) {
  const secure = process.env.COOKIE_SECURE === "true" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `otter_session=${encodeURIComponent(sessionId)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${sessionMaxAgeSeconds}${secure}`,
  );
}

function clearSessionCookie(res: Response) {
  res.setHeader(
    "Set-Cookie",
    "otter_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0",
  );
}

function createSession(userId: string): Session {
  const session = {
    expiresAt: new Date(Date.now() + sessionMaxAgeSeconds * 1000).toISOString(),
    id: crypto.randomBytes(32).toString("hex"),
    userId,
  };
  store.sessions.push(session);
  return session;
}

function userFromRequest(req: Request): User | undefined {
  const sessionId = getCookie(req, "otter_session");
  if (!sessionId) {
    return undefined;
  }

  const session = store.sessions.find((item) => item.id === sessionId);
  if (!session) {
    return undefined;
  }

  if (Date.parse(session.expiresAt) <= Date.now()) {
    store.sessions = store.sessions.filter((item) => item.id !== session.id);
    saveStore();
    return undefined;
  }

  return store.users.find((user) => user.id === session.userId);
}

function requireUser(req: Request, res: Response, next: NextFunction) {
  const user = userFromRequest(req);
  if (!user) {
    sendError(res, 401, "請先登入");
    return;
  }

  res.locals.user = user;
  next();
}

function currentUser(res: Response): User {
  return res.locals.user as User;
}

function tripForUser(user: User, tripId: string): Trip | undefined {
  return store.trips.find(
    (trip) => trip.id === tripId && trip.ownerId === user.id,
  );
}

function tripPayload(trip: Trip) {
  return {
    balances: calculateBalances(trip),
    currencies,
    currencyInfo,
    settlements: calculateSettlements(trip),
    trip,
  };
}

function participantExists(trip: Trip, participantId: string): boolean {
  return trip.participants.some(
    (participant) => participant.id === participantId,
  );
}

async function start() {
  const app = express();

  app.use(express.json({ limit: "1mb" }));

  app.get("/api/me", (req, res) => {
    const user = userFromRequest(req);
    res.json({
      currencies,
      currencyInfo,
      user: user ? publicUser(user) : null,
    });
  });

  app.post("/api/auth/register", (req, res) => {
    const body = requestBody(req);
    const name = stringField(body, "name");
    const email = stringField(body, "email");
    const password = stringField(body, "password");

    if (!name || name.length > 80) {
      sendError(res, 400, "請輸入 1-80 字的名稱");
      return;
    }
    if (!email?.includes("@")) {
      sendError(res, 400, "請輸入有效 email");
      return;
    }
    if (!password || password.length < 8) {
      sendError(res, 400, "密碼至少需要 8 個字");
      return;
    }

    const normalizedEmail = normalizeEmail(email);
    if (store.users.some((user) => user.email === normalizedEmail)) {
      sendError(res, 409, "這個 email 已經註冊");
      return;
    }

    const user: User = {
      createdAt: nowIso(),
      email: normalizedEmail,
      id: makeId("user"),
      name,
      passwordHash: hashPassword(password),
    };
    store.users.push(user);
    const session = createSession(user.id);
    saveStore();
    setSessionCookie(res, session.id);
    res.status(201).json({ user: publicUser(user) });
  });

  app.post("/api/auth/login", (req, res) => {
    const body = requestBody(req);
    const email = stringField(body, "email");
    const password = stringField(body, "password");

    if (!email || !password) {
      sendError(res, 400, "請輸入 email 和密碼");
      return;
    }

    const user = store.users.find(
      (item) => item.email === normalizeEmail(email),
    );
    if (!user || !verifyPassword(password, user.passwordHash)) {
      sendError(res, 401, "email 或密碼錯誤");
      return;
    }

    const session = createSession(user.id);
    saveStore();
    setSessionCookie(res, session.id);
    res.json({ user: publicUser(user) });
  });

  app.post("/api/auth/logout", (req, res) => {
    const sessionId = getCookie(req, "otter_session");
    if (sessionId) {
      store.sessions = store.sessions.filter(
        (session) => session.id !== sessionId,
      );
      saveStore();
    }
    clearSessionCookie(res);
    res.json({ ok: true });
  });

  app.get("/api/trips", requireUser, (_req, res) => {
    const user = currentUser(res);
    res.json({
      trips: store.trips
        .filter((trip) => trip.ownerId === user.id)
        .map((trip) => ({
          baseCurrency: trip.baseCurrency,
          createdAt: trip.createdAt,
          expenseCount: trip.expenses.length,
          id: trip.id,
          name: trip.name,
          participantCount: trip.participants.length,
        })),
    });
  });

  app.post("/api/trips", requireUser, (req, res) => {
    const user = currentUser(res);
    const body = requestBody(req);
    const name = stringField(body, "name");
    const baseCurrencyValue = body.baseCurrency;
    const baseCurrency: Currency = isCurrency(baseCurrencyValue)
      ? baseCurrencyValue
      : "TWD";

    if (!name || name.length > 100) {
      sendError(res, 400, "請輸入 1-100 字的旅行名稱");
      return;
    }

    const ownerParticipant: Participant = {
      id: makeId("participant"),
      name: user.name,
    };
    const trip: Trip = {
      baseCurrency,
      createdAt: nowIso(),
      expenses: [],
      id: makeId("trip"),
      name,
      ownerId: user.id,
      participants: [ownerParticipant],
    };
    store.trips.push(trip);
    saveStore();
    res.status(201).json(tripPayload(trip));
  });

  app.get("/api/trips/:tripId", requireUser, (req, res) => {
    const trip = tripForUser(currentUser(res), req.params.tripId);
    if (!trip) {
      sendError(res, 404, "找不到旅行");
      return;
    }

    res.json(tripPayload(trip));
  });

  app.post("/api/trips/:tripId/participants", requireUser, (req, res) => {
    const trip = tripForUser(currentUser(res), req.params.tripId);
    if (!trip) {
      sendError(res, 404, "找不到旅行");
      return;
    }

    const name = stringField(requestBody(req), "name");
    if (!name || name.length > 80) {
      sendError(res, 400, "請輸入 1-80 字的參與者名稱");
      return;
    }

    trip.participants.push({ id: makeId("participant"), name });
    saveStore();
    res.status(201).json(tripPayload(trip));
  });

  app.post("/api/trips/:tripId/expenses", requireUser, (req, res) => {
    const trip = tripForUser(currentUser(res), req.params.tripId);
    if (!trip) {
      sendError(res, 404, "找不到旅行");
      return;
    }

    const body = requestBody(req);
    const description = stringField(body, "description");
    const amountInput = body.amount;
    const currencyValue = body.currency;
    const paidById = stringField(body, "paidById");
    const participantIdsInput = body.participantIds;

    if (!description || description.length > 120) {
      sendError(res, 400, "請輸入 1-120 字的支出描述");
      return;
    }
    if (!isCurrency(currencyValue)) {
      sendError(res, 400, "不支援的貨幣");
      return;
    }
    if (!paidById || !participantExists(trip, paidById)) {
      sendError(res, 400, "付款人必須是參與者");
      return;
    }
    if (!Array.isArray(participantIdsInput)) {
      sendError(res, 400, "請選擇分帳參與者");
      return;
    }

    const participantIds = [...new Set(participantIdsInput)]
      .filter((id): id is string => typeof id === "string")
      .filter((id) => participantExists(trip, id));

    if (participantIds.length === 0) {
      sendError(res, 400, "請至少選擇一位分帳參與者");
      return;
    }

    try {
      const amountMinor = parseAmountToMinor(
        String(amountInput ?? ""),
        currencyValue,
      );
      trip.expenses.push({
        amountMinor,
        createdAt: nowIso(),
        currency: currencyValue,
        description,
        id: makeId("expense"),
        paidById,
        participantIds,
      });
      saveStore();
      res.status(201).json(tripPayload(trip));
    } catch (error) {
      sendError(
        res,
        400,
        error instanceof Error ? error.message : "金額格式錯誤",
      );
    }
  });

  app.use("/api", (_req, res) => {
    sendError(res, 404, "找不到 API");
  });

  if (process.env.NODE_ENV === "production") {
    const clientDir = path.resolve(__dirname, "../client");
    app.use(express.static(clientDir));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(clientDir, "index.html"));
    });
  } else {
    const { createServer } = await import("vite");
    const vite = await createServer({
      appType: "spa",
      server: { middlewareMode: true },
    });
    app.use(vite.middlewares);
  }

  const port = Number(process.env.PORT ?? 3000);
  app.listen(port, "0.0.0.0", () => {
    console.log(`otter listening on http://0.0.0.0:${port}`);
  });
}

void start();
