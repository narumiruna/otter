/// <reference lib="dom" />
import { randomBytes } from "node:crypto";
import { mkdtemp, readFile, realpath, rm } from "node:fs/promises";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  type Browser,
  type BrowserContext,
  chromium,
  type Page,
  expect as playwrightExpect,
  type Response,
} from "@playwright/test";

import {
  type OwnedProcess,
  startProcess,
} from "./ios-integration-browser-process.js";

// The parent owns the API, pool, schema, and migrations.
// This module neither starts nor closes them. Importing it has no side effects.
// No Playwright runner, trace, screenshot, HAR, video, or storageState file is used.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const expect = playwrightExpect.configure({ timeout: 30_000 });
const packagePath = path.join(root, "apps/ios/CrossClientIntegration");
const phaseChecks = {
  create: ["nativeCreate", "unequalShares", "sameAccount"],
  review: [
    "stale412",
    "webEditPreserved",
    "explicitLatestReview",
    "partialPayment",
    "readonlyShareBounds",
  ],
  interopLoss: [
    "nativeCSVPreview",
    "nativeBackupV2Preview",
    "backupRestoreRemapsIDs",
    "csvImportRemapsIDs",
    "realCommitThenResponseLoss",
    "durableAttemptBeforeSend",
  ],
  replay: [
    "persistentQueueReplay",
    "sameOperationBodyHeaders",
    "confirmedRowRemoval",
    "realRelogin",
  ],
} as const;
type Phase = keyof typeof phaseChecks;

interface SameData {
  userID: string;
  tripID: string;
  ownerID: string;
  friendID: string;
  expenseID: string;
  originalVersion: number;
}
interface NativeResult {
  same: SameData;
  checks: Record<string, boolean>;
  version: number;
  expenseCount: number;
  groupCount: number;
  remainingMinor: number;
  restoredID?: string;
  restoredExpenseID?: string;
  csvID?: string;
  csvExpenseID?: string;
  queuedID?: string;
  operationID?: string;
  bodySHA256?: string;
}
export interface CrossClientBrowserResult {
  same: SameData;
  entities: {
    restoredID: string;
    restoredExpenseID: string;
    csvID: string;
    csvExpenseID: string;
    queuedID: string;
    operationID: string;
    bodySHA256: string;
  };
  steps: Record<string, boolean>;
  version: number;
  expenseCount: number;
  groupCount: number;
  remainingMinor: number;
}

function requireCheck(condition: unknown, check: string): asserts condition {
  if (!condition) throw new Error(`Cross-client check failed: ${check}`);
}

// Pure helpers can be tested without starting a server or browser.
export function crossClientOrigin(origin: string): URL {
  requireCheck(
    /^http:\/\/localhost:[1-9]\d{3,4}$/.test(origin),
    "local origin",
  );
  const url = new URL(origin);
  requireCheck(
    url.origin === origin &&
      Number(url.port) >= 1024 &&
      Number(url.port) <= 65535 &&
      url.pathname === "/" &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash,
    "local origin",
  );
  return url;
}

export function crossClientToolEnvironment(): Record<string, string> {
  const result: Record<string, string> = {};
  // Do not inspect DATABASE_URL, dotenv, provider keys, or other private values.
  for (const key of [
    "PATH",
    "HOME",
    "USER",
    "LOGNAME",
    "TMPDIR",
    "LANG",
    "LC_ALL",
    "DEVELOPER_DIR",
    "SDKROOT",
  ]) {
    const value = process.env[key];
    if (value) result[key] = value;
  }
  return result;
}

function object(value: unknown): Record<string, unknown> {
  requireCheck(
    value !== null && typeof value === "object" && !Array.isArray(value),
    "object",
  );
  return value as Record<string, unknown>;
}
function identifier(value: unknown): string {
  requireCheck(
    typeof value === "string" && /^[A-Za-z0-9_-]{1,200}$/.test(value),
    "identifier",
  );
  return value;
}
function integer(value: unknown): number {
  requireCheck(
    typeof value === "number" && Number.isSafeInteger(value) && value >= 0,
    "integer",
  );
  return value;
}
function optionalID(value: unknown): string | undefined {
  return value === undefined ? undefined : identifier(value);
}
function requiredID(value: string | undefined): string {
  return identifier(value);
}

export function decodeCrossClientResult(
  text: string,
  phase: Phase,
): NativeResult {
  const value = object(JSON.parse(text));
  const allowed = new Set([
    "same",
    "checks",
    "version",
    "expenseCount",
    "groupCount",
    "remainingMinor",
    "restoredID",
    "restoredExpenseID",
    "csvID",
    "csvExpenseID",
    "queuedID",
    "operationID",
    "bodySHA256",
  ]);
  requireCheck(
    Object.keys(value).every((key) => allowed.has(key)),
    "non-secret result keys",
  );
  const same = object(value.same);
  const sameKeys = [
    "userID",
    "tripID",
    "ownerID",
    "friendID",
    "expenseID",
    "originalVersion",
  ];
  requireCheck(
    Object.keys(same).length === sameKeys.length &&
      Object.keys(same).every((key) => sameKeys.includes(key)),
    "same data keys",
  );
  const checks = object(value.checks);
  const expected: readonly string[] = phaseChecks[phase];
  requireCheck(
    Object.keys(checks).length === expected.length &&
      expected.every((key) => checks[key] === true),
    "native assertions",
  );
  const result: NativeResult = {
    same: {
      userID: identifier(same.userID),
      tripID: identifier(same.tripID),
      ownerID: identifier(same.ownerID),
      friendID: identifier(same.friendID),
      expenseID: identifier(same.expenseID),
      originalVersion: integer(same.originalVersion),
    },
    checks: Object.fromEntries(expected.map((key) => [key, true])),
    version: integer(value.version),
    expenseCount: integer(value.expenseCount),
    groupCount: integer(value.groupCount),
    remainingMinor: integer(value.remainingMinor),
    restoredID: optionalID(value.restoredID),
    restoredExpenseID: optionalID(value.restoredExpenseID),
    csvID: optionalID(value.csvID),
    csvExpenseID: optionalID(value.csvExpenseID),
    queuedID: optionalID(value.queuedID),
    operationID: optionalID(value.operationID),
    bodySHA256: optionalID(value.bodySHA256),
  };
  requireCheck(
    result.bodySHA256 === undefined || /^[a-f0-9]{64}$/.test(result.bodySHA256),
    "body digest",
  );
  requireCheck(result.same.originalVersion === 1, "original v1");
  requireCheck(
    result.same.ownerID !== result.same.friendID,
    "distinct participants",
  );
  return result;
}

async function runTool(
  executable: string,
  args: string[],
  signal: AbortSignal,
  timeout: number,
  input?: string,
): Promise<string> {
  const owned = startProcess(
    executable,
    args,
    signal,
    crossClientToolEnvironment(),
    timeout,
    input,
    true,
    root,
  );
  try {
    return await owned.done;
  } finally {
    await owned.stop();
  }
}

async function freePort(): Promise<number> {
  const server = createServer();
  try {
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address();
    requireCheck(address && typeof address === "object", "Vite port");
    return address.port;
  } finally {
    if (server.listening)
      await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

async function waitForVite(
  origin: string,
  owned: OwnedProcess,
  signal: AbortSignal,
): Promise<void> {
  const startup = new AbortController();
  const deadline = AbortSignal.any([
    signal,
    startup.signal,
    AbortSignal.timeout(30_000),
  ]);
  const ready = async () => {
    while (!deadline.aborted) {
      try {
        const response = await fetch(origin, {
          signal: deadline,
          redirect: "error",
        });
        await response.body?.cancel();
        if (response.ok) return;
      } catch {
        deadline.throwIfAborted();
      }
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 100);
        const abort = () => {
          clearTimeout(timer);
          resolve();
        };
        deadline.addEventListener("abort", abort, { once: true });
        setTimeout(
          () => deadline.removeEventListener("abort", abort),
          100,
        ).unref();
      });
    }
    deadline.throwIfAborted();
  };
  try {
    await Promise.race([
      ready(),
      owned.done.then(() => {
        throw new Error("Cross-client Vite stopped before startup.");
      }),
    ]);
  } finally {
    startup.abort();
  }
}

function tripResponse(
  response: Response,
  tripID: string,
  method = "GET",
  suffix = "",
): boolean {
  return (
    response.request().method() === method &&
    new URL(response.url()).pathname === `/api/trips/${tripID}${suffix}`
  );
}

function verifyTripPayload(
  raw: unknown,
  same: SameData,
  description: string,
  version: number,
  count: number,
  remaining: number,
): void {
  const payload = object(raw);
  const trip = object(payload.trip);
  requireCheck(
    trip.id === same.tripID &&
      trip.ownerId === same.userID &&
      payload.currentUserRole === "owner" &&
      trip.baseCurrency === "TWD" &&
      Array.isArray(trip.expenses) &&
      trip.expenses.length === count,
    "browser same group and account",
  );
  const expense = object(
    trip.expenses.find((item: unknown) => object(item).id === same.expenseID),
  );
  requireCheck(
    expense.description === description &&
      expense.version === version &&
      expense.amountMinor === 101 &&
      expense.currency === "TWD" &&
      expense.paidById === same.ownerID &&
      JSON.stringify(expense.participantIds) ===
        JSON.stringify([same.ownerID, same.friendID]),
    "browser same expense",
  );
  requireCheck(
    Array.isArray(expense.participantShares) &&
      expense.participantShares.length === 2,
    "browser shares",
  );
  const shares = expense.participantShares.map(object);
  requireCheck(
    shares[0].participantId === same.ownerID &&
      shares[0].shareMinor === 31 &&
      shares[1].participantId === same.friendID &&
      shares[1].shareMinor === 70,
    "browser unchanged unequal shares",
  );
  requireCheck(
    Array.isArray(payload.settlements) && payload.settlements.length === 1,
    "browser settlement",
  );
  const debt = object(payload.settlements[0]);
  requireCheck(
    debt.fromId === same.friendID &&
      debt.toId === same.ownerID &&
      debt.amountMinor === remaining &&
      debt.currency === "TWD",
    "browser remaining debt",
  );
}

async function expenses(page: Page) {
  await page
    .locator(".workspace-nav")
    .getByRole("button", { name: "Expenses", exact: true })
    .click();
  const region = page.getByRole("region", { name: "Expenses", exact: true });
  await expect(region).toBeVisible();
  return region;
}

async function checkEditor(
  page: Page,
  description: string,
  stage: (name: string) => void = () => {},
) {
  stage("browser expense editor visible");
  const editor = page.getByRole("region", {
    name: "Edit expense",
    exact: true,
  });
  await expect(editor).toBeVisible();
  stage("browser expense editor description");
  await expect(editor.getByLabel("Description", { exact: true })).toHaveValue(
    description,
  );
  stage("browser expense editor amount");
  await expect(editor.getByLabel("Amount", { exact: true })).toHaveValue("101");
  stage("browser expense editor currency");
  await expect(
    editor.getByRole("combobox", { name: "Currency", exact: true }),
  ).toHaveValue("TWD");
  stage("browser expense editor payer");
  await expect(
    editor
      .getByRole("combobox", { name: /^Paid by/ })
      .locator("option:checked"),
  ).toHaveText("Cross owner");
  stage("browser expense editor owner share");
  await expect(
    editor.getByLabel("Cross owner's Amount", { exact: true }),
  ).toHaveValue("31");
  stage("browser expense editor friend share");
  await expect(
    editor.getByLabel("Cross friend's Amount", { exact: true }),
  ).toHaveValue("70");
  await expect(editor.locator('input[type="checkbox"]:checked')).toHaveCount(2);
  return editor;
}

async function loginBrowser(
  page: Page,
  webOrigin: string,
  apiOrigin: string,
  same: SameData,
  username: string,
  password: string,
  signal: AbortSignal,
) {
  crossClientOrigin(apiOrigin);
  await page.goto(`${webOrigin}/?trip=${same.tripID}`);
  await expect(
    page.getByRole("heading", { name: "Sign in", exact: true }),
  ).toBeVisible();
  signal.throwIfAborted();
  requireCheck(
    new URL(page.url()).origin === webOrigin,
    "credential destination",
  );
  await page.locator("#login-username").fill(username);
  signal.throwIfAborted();
  requireCheck(
    new URL(page.url()).origin === webOrigin,
    "credential destination",
  );
  await page.locator("#login-password").fill(password);
  const [response] = await Promise.all([
    page.waitForResponse((item) => tripResponse(item, same.tripID)),
    page.locator('#login-form button[type="submit"]').click(),
  ]);
  requireCheck(response.status() === 200, "browser password login");
  verifyTripPayload(await response.json(), same, "Native dinner", 1, 1, 70);
  await expect(page.locator(".workspace-nav")).toBeVisible();
  requireCheck(
    new URL(page.url()).searchParams.get("trip") === same.tripID,
    "browser selected group",
  );
}

async function editAndDownload(
  page: Page,
  same: SameData,
  scratch: string,
  stage: (name: string) => void,
) {
  stage("browser expense list");
  const list = await expenses(page);
  stage("browser original expense row");
  const row = list.locator(`[data-expense-id="${same.expenseID}"]`);
  await expect(row).toHaveCount(1);
  await row.getByRole("button", { name: "Native dinner", exact: true }).click();
  const editor = await checkEditor(page, "Native dinner", stage);
  stage("browser description-only save");
  // This is the only edited field. No page.evaluate, API PATCH, or financial storage writes.
  await editor
    .getByLabel("Description", { exact: true })
    .fill("Web updated dinner");
  const [response] = await Promise.all([
    page.waitForResponse((item) =>
      tripResponse(item, same.tripID, "PATCH", `/expenses/${same.expenseID}`),
    ),
    page.getByRole("button", { name: "Save changes", exact: true }).click(),
  ]);
  requireCheck(response.status() === 200, "browser edit save");
  verifyTripPayload(
    await response.json(),
    same,
    "Web updated dinner",
    2,
    1,
    70,
  );
  await expect(list).toBeVisible();
  await expect(
    row.getByRole("button", { name: "Web updated dinner", exact: true }),
  ).toBeVisible();

  stage("browser data and export navigation");
  await page
    .locator(".workspace-nav")
    .getByRole("button", { name: "Group settings", exact: true })
    .click();
  await page
    .locator(".section-navigation")
    .getByRole("link", { name: "Data and export", exact: true })
    .click();
  async function download(button: string, filename: string, maximum: number) {
    const [item] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: button, exact: true }).click(),
    ]);
    const destination = path.join(scratch, filename);
    await item.saveAs(destination);
    requireCheck((await item.failure()) === null, "UI download");
    const bytes = await readFile(destination);
    requireCheck(bytes.length > 0 && bytes.length <= maximum, "download size");
    return bytes;
  }
  stage("browser CSV download");
  const csv = await download(
    "Export expense CSV",
    "web-expenses.csv",
    1024 * 1024,
  );
  stage("browser backup download");
  const backup = await download(
    "Download complete backup",
    "web-backup.json",
    10 * 1024 * 1024,
  );
  return { csv: csv.toString("utf8"), backupBase64: backup.toString("base64") };
}

async function verifyFinalBrowser(
  page: Page,
  webOrigin: string,
  result: NativeResult,
) {
  const same = result.same;
  const [response] = await Promise.all([
    page.waitForResponse((item) => tripResponse(item, same.tripID)),
    page.reload(),
  ]);
  requireCheck(response.status() === 200, "browser reload");
  const raw: unknown = await response.json();
  verifyTripPayload(raw, same, "Native reviewed dinner", 3, 2, 50);
  const trip = object(object(raw).trip);
  requireCheck(Array.isArray(trip.expenses), "final expense list");
  requireCheck(
    trip.expenses.filter((item: unknown) => object(item).id === result.queuedID)
      .length === 1,
    "queued ID once",
  );
  const payments = trip.settlementPayments;
  requireCheck(
    Array.isArray(payments) &&
      payments.length === 1 &&
      object(payments[0]).amountMinor === 20,
    "single payment",
  );
  await expect(page.locator(".trip-switcher-item")).toHaveCount(3);
  const list = await expenses(page);
  await expect(list.locator("[data-expense-id]")).toHaveCount(2);
  await expect(
    list
      .locator(`[data-expense-id="${same.expenseID}"]`)
      .getByRole("button", { name: "Native reviewed dinner", exact: true }),
  ).toBeVisible();
  await expect(
    list
      .locator(`[data-expense-id="${requiredID(result.queuedID)}"]`)
      .getByRole("button", { name: "Native queued snack", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Showing 2 of 2 expenses", { exact: true }),
  ).toBeVisible();
  await page
    .locator(".workspace-nav")
    .getByRole("button", { name: "Overview", exact: true })
    .click();
  const settlement = page.getByRole("region", {
    name: "Settle up",
    exact: true,
  });
  await expect(settlement.locator(".settlement-item")).toHaveCount(1);
  await expect(settlement).toContainText("Cross friend");
  await expect(settlement).toContainText("Cross owner");
  await expect(settlement).toContainText("TWD · NT$50");

  for (const [groupID, expenseID] of [
    [requiredID(result.restoredID), requiredID(result.restoredExpenseID)],
    [requiredID(result.csvID), requiredID(result.csvExpenseID)],
  ]) {
    const [downloaded] = await Promise.all([
      page.waitForResponse((item) => tripResponse(item, groupID)),
      page.goto(`${webOrigin}/?trip=${groupID}&view=expenses`),
    ]);
    requireCheck(downloaded.status() === 200, "restored UI load");
    const payload = object(await downloaded.json());
    const restoredTrip = object(payload.trip);
    requireCheck(
      payload.currentUserRole === "owner" &&
        restoredTrip.ownerId === same.userID &&
        restoredTrip.id === groupID,
      "restored UI role and group",
    );
    const restoredList = page.getByRole("region", {
      name: "Expenses",
      exact: true,
    });
    await expect(restoredList).toBeVisible();
    await expect(restoredList.locator("[data-expense-id]")).toHaveCount(1);
    await restoredList
      .locator(`[data-expense-id="${expenseID}"]`)
      .getByRole("button", { name: "Web updated dinner", exact: true })
      .click();
    await checkEditor(page, "Web updated dinner");
    await page
      .getByRole("button", { name: "Back to expense list", exact: true })
      .click();
  }
}

/**
 * Use a fresh schema and a scratch directory owned by
 * the parent. Pass its cancellation signal. No API server ownership is transferred.
 * Build output uses directory/CrossClientBuild, never the app's DerivedData.
 * Financial download/queue files stay in an owned 0700 child directory and are
 * removed here. The parent can remove CrossClientBuild with its own scratch root.
 * This proof covers Kit HTTP/domain/queue plus the real web UI, not SwiftUI taps,
 * receipt/history backup parity, or an actual transfer of funds.
 */
export async function runCrossClientBrowser(
  origin: string,
  directory: string,
  signal: AbortSignal,
): Promise<CrossClientBrowserResult> {
  let stage = "origin validation";
  let vite: OwnedProcess | undefined;
  let browser: Browser | undefined;
  let context: BrowserContext | undefined;
  let scratch: string | undefined;
  const lifetime = AbortSignal.any([signal, AbortSignal.timeout(600_000)]);
  const closeOnAbort = () => {
    void context?.close().catch(() => {});
  };
  try {
    const api = crossClientOrigin(origin);
    lifetime.throwIfAborted();
    requireCheck(path.isAbsolute(directory), "absolute scratch directory");
    scratch = await mkdtemp(path.join(directory, "cross-client-"));
    const queueDirectory = path.join(scratch, "queue");
    // One account only. Neither value is put in argv, env, a file, or a result.
    const username = `cross-${randomBytes(12).toString("hex")}`;
    const password = randomBytes(40).toString("base64url");
    const build = path.join(directory, "CrossClientBuild");
    stage = "Swift package build";
    await runTool(
      "swift",
      [
        "build",
        "--package-path",
        packagePath,
        "--scratch-path",
        build,
        "--product",
        "OtterCrossClient",
      ],
      lifetime,
      180_000,
    );
    const bin = (
      await runTool(
        "swift",
        [
          "build",
          "--package-path",
          packagePath,
          "--scratch-path",
          build,
          "--show-bin-path",
        ],
        lifetime,
        30_000,
      )
    ).trim();
    requireCheck(path.isAbsolute(bin) && !bin.includes("\n"), "binary path");
    const canonicalBuild = await realpath(build);
    requireCheck(
      (await realpath(bin)).startsWith(`${canonicalBuild}${path.sep}`),
      "scratch binary path",
    );
    const binary = path.join(bin, "OtterCrossClient");
    const steps: Record<string, boolean> = {};
    let previous: NativeResult | undefined;
    async function native(
      phase: Phase,
      downloads?: { csv: string; backupBase64: string },
    ) {
      crossClientOrigin(origin);
      lifetime.throwIfAborted();
      const input = JSON.stringify({
        phase,
        origin,
        username,
        password,
        queueDirectory,
        previous,
        ...downloads,
      });
      const text = await runTool(binary, [], lifetime, 90_000, input);
      const next = decodeCrossClientResult(text, phase);
      if (previous)
        requireCheck(
          JSON.stringify(next.same) === JSON.stringify(previous.same),
          "same data across phases",
        );
      previous = next;
      console.log(
        `PASS cross-client native ${phase}: ${Object.keys(next.checks).length} checks`,
      );
      for (const [key, value] of Object.entries(next.checks)) {
        requireCheck(steps[key] === undefined && value, "unique step");
        steps[key] = value;
      }
      return next;
    }
    stage = "native create";
    const created = await native("create");
    requireCheck(
      created.version === 1 &&
        created.expenseCount === 1 &&
        created.groupCount === 1 &&
        created.remainingMinor === 70,
      "created counts",
    );
    stage = "Vite startup";
    const port = await freePort();
    const webOrigin = `http://127.0.0.1:${port}`;
    // Load the real workspace config, but do not read any dotenv file.
    // Current Vite config reads OTTER_API_URL. Keep the requested E2E port too.
    const viteSource = `import { createServer } from "vite";
const server = await createServer({ envDir: false, server: {
  host: "127.0.0.1", port: ${port}, strictPort: true
}});
await server.listen();`;
    vite = startProcess(
      process.execPath,
      ["--input-type=module", "--eval", viteSource],
      lifetime,
      {
        ...crossClientToolEnvironment(),
        NODE_ENV: "development",
        OTTER_API_URL: origin,
        OTTER_E2E_API_PORT: api.port,
      },
      600_000,
      undefined,
      false,
      path.join(root, "apps/web"),
    );
    await waitForVite(webOrigin, vite, lifetime);
    stage = "browser startup";
    browser = await chromium.launch({
      headless: true,
      timeout: 30_000,
      downloadsPath: scratch,
      env: crossClientToolEnvironment(),
    });
    context = await browser.newContext({
      locale: "en-US",
      viewport: { width: 1440, height: 1000 },
      acceptDownloads: true,
      serviceWorkers: "block",
    });
    context.setDefaultTimeout(30_000);
    context.setDefaultNavigationTimeout(30_000);
    lifetime.addEventListener("abort", closeOnAbort, { once: true });
    // Start empty. The only init write is the registered UI language preference.
    await context.clearCookies();
    await context.addInitScript(() => {
      localStorage.setItem("otter.locale", "en");
    });
    await context.route("**/*", async (route) => {
      const target = new URL(route.request().url());
      if (target.origin === webOrigin) await route.continue();
      else await route.abort("blockedbyclient");
    });
    const page = await context.newPage();
    stage = "browser password login";
    await loginBrowser(
      page,
      webOrigin,
      origin,
      created.same,
      username,
      password,
      lifetime,
    );
    steps.browserPasswordLogin = true;
    stage = "browser edit and downloads";
    const downloads = await editAndDownload(
      page,
      created.same,
      scratch,
      (name) => {
        stage = name;
      },
    );
    steps.browserDescriptionOnlyEdit = true;
    steps.browserCSVAndJSONDownloads = true;
    stage = "native stale version review and partial payment";
    const reviewed = await native("review");
    requireCheck(
      reviewed.version === 3 &&
        reviewed.expenseCount === 1 &&
        reviewed.remainingMinor === 50,
      "reviewed counts",
    );
    stage = "native web-file interop and queue response loss";
    const lost = await native("interopLoss", downloads);
    requireCheck(
      lost.expenseCount === 2 &&
        lost.groupCount === 3 &&
        lost.remainingMinor === 50,
      "lost response counts",
    );
    stage = "native persistent queue replay and relogin";
    const replayed = await native("replay");
    requireCheck(
      replayed.expenseCount === 2 &&
        replayed.groupCount === 3 &&
        replayed.version === 3 &&
        replayed.remainingMinor === 50,
      "replayed counts",
    );
    stage = "browser reload and restored groups";
    await verifyFinalBrowser(page, webOrigin, replayed);
    steps.browserNativeV3SameID = true;
    steps.browserQueuedExpenseOnce = true;
    steps.browserRemaining50 = true;
    steps.browserRestoredGroups = true;
    console.log(
      `PASS cross-client total: ${Object.keys(steps).length}; version ${replayed.version}; expenses ${replayed.expenseCount}; groups ${replayed.groupCount}; remaining ${replayed.remainingMinor}`,
    );
    return {
      same: replayed.same,
      entities: {
        restoredID: requiredID(replayed.restoredID),
        restoredExpenseID: requiredID(replayed.restoredExpenseID),
        csvID: requiredID(replayed.csvID),
        csvExpenseID: requiredID(replayed.csvExpenseID),
        queuedID: requiredID(replayed.queuedID),
        operationID: requiredID(replayed.operationID),
        bodySHA256: requiredID(replayed.bodySHA256),
      },
      steps,
      version: replayed.version,
      expenseCount: replayed.expenseCount,
      groupCount: replayed.groupCount,
      remainingMinor: replayed.remainingMinor,
    };
  } catch {
    // Drop all underlying errors, including Playwright typed-password call logs,
    // private request URLs, download bodies, and Swift compiler/transport output.
    throw new Error(
      `Cross-client acceptance failed at ${stage}; private diagnostics discarded.`,
    );
  } finally {
    lifetime.removeEventListener("abort", closeOnAbort);
    let cleanupFailed = false;
    await context?.close().catch(() => {
      cleanupFailed = true;
    });
    await browser?.close().catch(() => {
      cleanupFailed = true;
    });
    await vite?.stop();
    if (scratch)
      await rm(scratch, { recursive: true, force: true }).catch(() => {
        cleanupFailed = true;
      });
    requireCheck(!cleanupFailed, "owned browser and scratch cleanup");
  }
}
