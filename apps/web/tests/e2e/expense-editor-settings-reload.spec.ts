import type { TripPayload } from "@narumitw/otter-contracts";
import {
  calculateBalances,
  calculateSettlements,
  type Trip,
} from "@narumitw/otter-core/settlement";
import { expect, type Page, test } from "@playwright/test";
import { exampleTrip, mockWorkspace } from "./interface-fixtures.js";

const tripId = "interface-trip";
const description = "Dinner at the market";
const listUrl = `/?trip=${tripId}&view=expenses`;
const editUrl = `${listUrl}&mode=edit-expense&expense=dinner`;
const analysisUrl = `/?trip=${tripId}&view=analysis`;

type CloseAction = "native Back" | "Cancel";

function payload(trip: Trip): TripPayload {
  return {
    trip,
    balances: calculateBalances(trip),
    settlements: calculateSettlements(trip),
    currentUserRole: "owner",
    collaborators: [],
    shareLinks: [],
  };
}

async function setup(page: Page) {
  const trip = exampleTrip();
  for (const expense of trip.expenses) expense.version = 1;
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockWorkspace(page, trip);
  const mutations: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET" && request.url().includes("/api/"))
      mutations.push(`${request.method()} ${new URL(request.url()).pathname}`);
  });
  return { trip, mutations };
}

function editor(page: Page) {
  return page.getByRole("region", { name: "Edit expense", exact: true });
}

function list(page: Page) {
  return page.getByRole("region", { name: "Expenses", exact: true });
}

async function expectEditor(page: Page, value = description) {
  await expect(editor(page)).toBeVisible();
  await expect(
    editor(page).getByLabel("Description", { exact: true }),
  ).toHaveValue(value);
}

async function historyEntry(page: Page) {
  return page.evaluate(() => ({
    key: history.state.otterWorkspaceHistory.key as string,
    index: history.state.otterWorkspaceHistory.index as number,
    length: history.length,
  }));
}

async function nativeBack(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        window.addEventListener("popstate", () => resolve(), { once: true });
        history.back();
      }),
  );
}

async function openSettings(page: Page) {
  await page
    .getByRole("button", { name: "Alex's account menu", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Account settings", exact: true })
    .click();
  await expect(page).toHaveURL(/account=settings/);
  await expect(
    page.getByRole("heading", { name: "Account settings", exact: true }),
  ).toBeVisible();
}

async function closeSettings(page: Page, action: CloseAction) {
  if (action === "native Back") await nativeBack(page);
  else await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page).toHaveURL(editUrl);
  await expectEditor(page);
}

async function openFromList(page: Page) {
  await page.goto(analysisUrl);
  await page.getByRole("button", { name: "Expenses", exact: true }).click();
  await expect(page).toHaveURL(listUrl);
  const source = await historyEntry(page);
  await list(page)
    .getByRole("button", { name: description, exact: true })
    .click();
  await expectEditor(page);
  return source;
}

async function editAndSave(page: Page, trip: Trip) {
  const patches: unknown[] = [];
  await page.route(`**/api/trips/${tripId}/expenses/dinner`, async (route) => {
    expect(route.request().method()).toBe("PATCH");
    expect(route.request().headers()["if-match"]).toBe('"1"');
    const body = route.request().postDataJSON();
    patches.push(body);
    expect(body).toMatchObject({
      description: "Saved after settings reload",
      amount: "6800",
      expenseDate: "2026-10-05",
      paidById: "b",
    });
    trip.expenses[0] = {
      ...trip.expenses[0],
      description: "Saved after settings reload",
      amountMinor: 6800,
      expenseDate: "2026-10-05",
      paidById: "b",
      version: 2,
    };
    await route.fulfill({ json: payload(trip) });
  });
  await editor(page)
    .getByLabel("Description", { exact: true })
    .fill("Saved after settings reload");
  await editor(page).getByLabel("Amount", { exact: true }).fill("6800");
  await editor(page).getByLabel("Date", { exact: true }).fill("2026-10-05");
  await editor(page)
    .getByRole("combobox", { name: /^Paid by/ })
    .selectOption("b");
  await editor(page)
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await expect.poll(() => patches.length).toBe(1);
  await expect(page).toHaveURL(listUrl);
  await expect(list(page)).toBeVisible();
  await expect(page.locator(".expense-composer")).toHaveCount(0);
  await expect(
    list(page).getByRole("button", {
      name: "Saved after settings reload",
      exact: true,
    }),
  ).toBeVisible();
  return patches;
}

for (const close of ["native Back", "Cancel"] as const) {
  test(`settings reload then ${close} saves and returns to its list once`, async ({
    page,
  }) => {
    const { trip, mutations } = await setup(page);
    const source = await openFromList(page);
    const originalEditor = await historyEntry(page);
    await openSettings(page);
    const settings = await historyEntry(page);
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Account settings", exact: true }),
    ).toBeVisible();
    expect(await historyEntry(page)).toEqual(settings);
    await closeSettings(page, close);
    expect(await historyEntry(page)).toEqual({
      ...originalEditor,
      length: settings.length,
    });
    const patches = await editAndSave(page, trip);
    expect(await historyEntry(page)).toEqual({
      ...source,
      length: settings.length,
    });
    await nativeBack(page);
    await expect(page).toHaveURL(analysisUrl);
    await page.goForward();
    await expect(page).toHaveURL(listUrl);
    await expect(page.locator(".expense-composer")).toHaveCount(0);
    await page.goForward();
    await expectEditor(page, "Saved after settings reload");
    expect(patches).toHaveLength(1);
    expect(mutations).toEqual([`PATCH /api/trips/${tripId}/expenses/dinner`]);
  });

  test(`settings reload then ${close} keeps editor cancellation stable`, async ({
    page,
  }) => {
    const { mutations } = await setup(page);
    const source = await openFromList(page);
    await openSettings(page);
    await page.reload();
    await closeSettings(page, close);
    await editor(page)
      .getByLabel("Description", { exact: true })
      .fill("Unsaved after settings reload");
    const original = await historyEntry(page);
    const cancel = editor(page).getByRole("button", {
      name: "Cancel",
      exact: true,
    });
    await cancel.click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Cancel", exact: true })
      .click();
    await expectEditor(page, "Unsaved after settings reload");
    await expect(cancel).toBeFocused();
    expect(await historyEntry(page)).toEqual(original);
    await cancel.click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Discard draft", exact: true })
      .click();
    await expect(page).toHaveURL(listUrl);
    await expect(list(page)).toBeVisible();
    await expect(page.locator(".expense-composer")).toHaveCount(0);
    expect(await historyEntry(page)).toEqual({
      ...source,
      length: original.length,
    });
    await page.goForward();
    await expectEditor(page);
    expect(mutations).toEqual([]);
  });
}

for (const metadata of [
  "missing",
  "malformed",
  "empty",
  "self",
  "unpaired",
] as const) {
  test(`direct settings URL with ${metadata} source metadata safely saves after close`, async ({
    page,
  }) => {
    const { trip, mutations } = await setup(page);
    await page.goto(analysisUrl);
    await page.goto(`${editUrl}&account=settings`);
    await expect(
      page.getByRole("heading", { name: "Account settings", exact: true }),
    ).toBeVisible();
    await page.evaluate((metadata) => {
      const state = { ...history.state };
      if (metadata === "missing") delete state.otterAccountSettingsSource;
      else if (metadata === "malformed")
        state.otterAccountSettingsSource = { key: "invalid-source" };
      else if (metadata === "empty") state.otterAccountSettingsSource = "";
      else if (metadata === "self")
        state.otterAccountSettingsSource = state.otterWorkspaceHistory.key;
      else state.otterAccountSettingsSource = "unpaired-source";
      history.replaceState(state, "");
    }, metadata);
    await page.reload();
    const original = await historyEntry(page);
    await closeSettings(page, "Cancel");
    expect(await historyEntry(page)).toEqual(original);
    await editAndSave(page, trip);
    expect(await historyEntry(page)).toEqual(original);
    await page.goBack();
    await expect(page).toHaveURL(analysisUrl);
    expect(mutations).toEqual([`PATCH /api/trips/${tripId}/expenses/dinner`]);
  });
}
