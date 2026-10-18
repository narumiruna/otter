import {
  calculateBalances,
  calculateSettlements,
} from "@narumitw/otter-core/settlement";
import { expect, type Page, test } from "@playwright/test";
import type { WorkspaceHistoryEntry } from "../../src/client/workspace-history.js";
import { exampleTrip, mockWorkspace } from "./interface-fixtures.js";

const httpOrigin = "http://otter-history-http.invalid";
const listUrl = "/?trip=interface-trip&view=expenses&keep=1#ledger";
const description = "Dinner at the market";

async function expectHttpCrypto(page: Page) {
  expect(
    await page.evaluate(() => ({
      secure: window.isSecureContext,
      randomUUID: typeof crypto.randomUUID,
      getRandomValues: typeof crypto.getRandomValues,
      bytes: crypto.getRandomValues(new Uint8Array(16)).length,
    })),
  ).toEqual({
    secure: false,
    randomUUID: "undefined",
    getRandomValues: "function",
    bytes: 16,
  });
}

async function httpApp(page: Page, baseURL: string | undefined) {
  if (!baseURL) throw new Error("The browser test needs a Vite baseURL");
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  // Keep the browser on a non-loopback HTTP origin. Forward only app files to
  // Vite, so its allowedHosts check needs no change. Later API routes take priority.
  // Vite's HMR socket cannot resolve this host; these tests do not use HMR.
  await page.route(`${httpOrigin}/**`, async (route) => {
    const request = new URL(route.request().url());
    const upstream = new URL(request.pathname + request.search, baseURL);
    await route.fulfill({
      response: await route.fetch({ url: upstream.href }),
    });
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const trip = exampleTrip();
  for (const expense of trip.expenses) expense.version = 1;
  await mockWorkspace(page, trip);
  return { errors, trip };
}

async function entry(page: Page) {
  const result = await page.evaluate(
    () =>
      history.state?.otterWorkspaceHistory as WorkspaceHistoryEntry | undefined,
  );
  expect(result).toBeDefined();
  if (!result) throw new Error("Workspace history metadata is missing");
  expect(result.session).toMatch(/^[0-9a-f]{32}$/);
  expect(result.key).toMatch(/^[0-9a-f]{32}$/);
  expect(result.session).not.toBe(result.key);
  return result;
}

test("a non-loopback HTTP document has getRandomValues but no randomUUID", async ({
  page,
}) => {
  // This is a real insecure browser origin with a routed response, not a Crypto API mock.
  // No app code or init script changes the browser's Crypto API.
  await page.route(`${httpOrigin}/crypto-probe`, (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><title>HTTP Crypto probe</title>",
    }),
  );
  await page.goto(`${httpOrigin}/crypto-probe`);
  await expectHttpCrypto(page);
});

test("HTTP sign-in startup and login work without randomUUID", async ({
  page,
  baseURL,
}) => {
  const { errors } = await httpApp(page, baseURL);
  const user = { id: "owner", username: "alex", name: "Alex" };
  let signedIn = false;
  let logins = 0;
  await page.route("**/api/me", (route) =>
    route.fulfill({ json: { user: signedIn ? user : null } }),
  );
  await page.route("**/api/auth/login", (route) => {
    expect(route.request().method()).toBe("POST");
    signedIn = true;
    logins++;
    return route.fulfill({ json: { user } });
  });
  await page.goto(`${httpOrigin}/`);
  await expectHttpCrypto(page);
  await expect(
    page.getByRole("heading", { name: "Sign in", exact: true }),
  ).toBeVisible();
  const initial = await entry(page);
  await page.locator("#login-username").fill("alex");
  await page.locator("#login-password").fill("password123");
  await page.locator('#login-form button[type="submit"]').click();
  await expect(page.locator(".overview-recent")).toBeVisible();
  const loggedIn = await entry(page);
  expect(loggedIn.session).toBe(initial.session);
  await expect(page).toHaveURL(`${httpOrigin}/?trip=interface-trip`);
  expect(logins).toBe(1);
  expect(errors).toEqual([]);
});

test("HTTP read-only share startup works without randomUUID", async ({
  page,
  baseURL,
}) => {
  const { errors, trip } = await httpApp(page, baseURL);
  await page.route("**/api/me", (route) =>
    route.fulfill({ json: { user: null } }),
  );
  await page.route("**/api/share/http-readonly", (route) =>
    route.fulfill({
      json: {
        trip,
        readonly: true,
        shareMode: "readonly",
        balances: calculateBalances(trip),
        settlements: calculateSettlements(trip),
      },
    }),
  );
  await page.goto(`${httpOrigin}/share/http-readonly`);
  await expectHttpCrypto(page);
  await expect(
    page.getByRole("heading", { name: "Complete expense history" }),
  ).toBeVisible();
  const initial = await entry(page);
  await expect(
    page
      .getByRole("region", { name: "Complete expense history", exact: true })
      .getByText(description, { exact: true }),
  ).toBeVisible();
  for (const name of ["Add expense", "Record payment", "Save changes"]) {
    await expect(page.getByRole("button", { name, exact: true })).toHaveCount(
      0,
    );
  }
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Complete expense history" }),
  ).toBeVisible();
  const reloaded = await entry(page);
  expect(reloaded.session).toBe(initial.session);
  expect(reloaded.key).toBe(initial.key);
  expect(errors).toEqual([]);
});

test("HTTP list to editor and return retain history identity without randomUUID", async ({
  page,
  baseURL,
}) => {
  const { errors } = await httpApp(page, baseURL);
  const mutations: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET" && request.url().includes("/api/")) {
      mutations.push(`${request.method()} ${new URL(request.url()).pathname}`);
    }
  });
  await page.goto(`${httpOrigin}${listUrl}`);
  await expectHttpCrypto(page);
  const list = page.getByRole("region", { name: "Expenses", exact: true });
  await expect(list).toBeVisible();
  await page.evaluate(() => {
    history.replaceState({ ...history.state, extension: { id: 7 } }, "");
  });
  // Reload lets the history module read the unrelated state before navigation.
  await page.reload();
  await expect(list).toBeVisible();
  const source = await entry(page);
  const length = await page.evaluate(() => history.length);
  const keys = new Set([source.session, source.key]);
  const editor = page.getByRole("region", {
    name: "Edit expense",
    exact: true,
  });
  for (let iteration = 0; iteration < 3; iteration++) {
    await list.getByRole("button", { name: description, exact: true }).click();
    await expect(editor).toBeVisible();
    await expect(editor.getByLabel("Description", { exact: true })).toHaveValue(
      description,
    );
    const edited = await entry(page);
    expect(edited.session).toBe(source.session);
    expect(edited.index).toBe(source.index + 1);
    expect(keys.has(edited.key)).toBe(false);
    keys.add(edited.key);
    expect(edited.returnTo).toEqual({
      key: source.key,
      index: source.index,
      url: `${httpOrigin}${listUrl}`,
    });
    expect(await page.evaluate(() => history.state.extension)).toEqual({
      id: 7,
    });
    expect(await page.evaluate(() => history.length)).toBe(length + 1);
    await page
      .getByRole("button", { name: "Back to expense list", exact: true })
      .click();
    await expect(list).toBeVisible();
    await expect(page).toHaveURL(`${httpOrigin}${listUrl}`);
    const returned = await entry(page);
    expect(returned.session).toBe(source.session);
    expect(returned.key).toBe(source.key);
    expect(returned.index).toBe(source.index);
    expect(await page.evaluate(() => history.state.extension)).toEqual({
      id: 7,
    });
    expect(await page.evaluate(() => history.length)).toBe(length + 1);
  }
  await page.goForward();
  await expect(editor).toBeVisible();
  const forward = await entry(page);
  expect(forward.session).toBe(source.session);
  expect(keys.has(forward.key)).toBe(true);
  expect(mutations).toEqual([]);
  expect(errors).toEqual([]);
});
