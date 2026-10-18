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
const overviewUrl = `/?trip=${tripId}&view=overview`;

function versionedTrip() {
  const trip = exampleTrip();
  for (const expense of trip.expenses) expense.version = 1;
  return trip;
}

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

async function setup(page: Page, trip = versionedTrip()) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockWorkspace(page, trip);
  const mutations: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET" && request.url().includes("/api/")) {
      mutations.push(`${request.method()} ${new URL(request.url()).pathname}`);
    }
  });
  return { trip, mutations };
}

function editor(page: Page) {
  return page.getByRole("region", { name: "Edit expense", exact: true });
}

function list(page: Page) {
  return page.getByRole("region", { name: "Expenses", exact: true });
}

function returnButton(page: Page) {
  return page.getByRole("button", {
    name: "Back to expense list",
    exact: true,
  });
}

async function expectEditor(page: Page, value = description) {
  await expect(editor(page)).toBeVisible();
  await expect(
    editor(page).getByLabel("Description", { exact: true }),
  ).toHaveValue(value);
}

async function openExpense(page: Page, name = description) {
  await list(page).getByRole("button", { name, exact: true }).click();
  await expectEditor(page, name);
}

async function dirty(page: Page, value = "Unsaved dinner") {
  await editor(page).getByLabel("Description", { exact: true }).fill(value);
}

async function nativeTraversal(page: Page, delta: number, accept: boolean) {
  const dialog = page.waitForEvent("dialog");
  await page.evaluate((delta) => history.go(delta), delta);
  const confirmation = await dialog;
  expect(confirmation.type()).toBe("confirm");
  if (accept) await confirmation.accept();
  else await confirmation.dismiss();
}

async function installOtherTrip(page: Page, first: Trip) {
  const second = {
    ...versionedTrip(),
    id: "second-trip",
    name: "Second group",
  };
  await page.route("**/api/trips", (route) =>
    route.fulfill({
      json: {
        archivedTrips: [],
        trips: [first, second].map((trip) => ({
          id: trip.id,
          name: trip.name,
          baseCurrency: trip.baseCurrency,
          participantCount: trip.participants.length,
          expenseCount: trip.expenses.length,
        })),
      },
    }),
  );
  await page.route("**/api/trips/second-trip", (route) =>
    route.fulfill({ json: payload(second) }),
  );
  return second;
}

for (const entry of [
  "row",
  "name",
  "menu",
  "mobile-name",
  "mobile-menu",
  "overview",
] as const) {
  test(`${entry} opens an identified history entry and restores its source`, async ({
    page,
  }) => {
    const { mutations } = await setup(page);
    if (entry.startsWith("mobile"))
      await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(
      entry === "overview" ? overviewUrl : `${listUrl}&keep=1#ledger`,
    );
    const sourceUrl = page.url();
    const before = await page.evaluate(() => history.length);
    if (entry.endsWith("menu")) {
      await page
        .getByRole("button", {
          name: `More actions for ${description}`,
          exact: true,
        })
        .click();
      await page
        .getByRole("menuitem", { name: "Edit expense", exact: true })
        .click();
    } else if (entry === "overview") {
      await page
        .locator(".recent-expense-row")
        .filter({ hasText: description })
        .getByRole("button")
        .click();
    } else if (entry === "row") {
      await page
        .locator(".expense-table-row")
        .filter({ hasText: description })
        .locator(".expense-amount-cell")
        .click();
    } else {
      await page
        .getByRole("button", { name: description, exact: true })
        .click();
    }
    await expectEditor(page);
    const url = new URL(page.url());
    expect(url.searchParams.get("trip")).toBe(tripId);
    expect(url.searchParams.get("view")).toBe("expenses");
    expect(url.searchParams.get("mode")).toBe("edit-expense");
    expect(url.searchParams.get("expense")).toBe("dinner");
    if (entry !== "overview") {
      expect(url.searchParams.get("keep")).toBe("1");
      expect(url.hash).toBe("#ledger");
    }
    expect(await page.evaluate(() => history.length)).toBe(before + 1);
    await expect(
      editor(page).locator("#expense-composer-heading"),
    ).toBeFocused();
    await expect(returnButton(page)).toHaveAttribute("type", "button");
    await page.goBack();
    await expect(page).toHaveURL(sourceUrl);
    await expect(editor(page)).toHaveCount(0);
    await page.goForward();
    await expectEditor(page);
    expect(mutations).toEqual([]);
  });
}

for (const action of ["return", "cancel"] as const) {
  test(`clean ${action} reuses the source list without adding history entries`, async ({
    page,
  }) => {
    const { mutations } = await setup(page);
    await page.goto(overviewUrl);
    await page.getByRole("button", { name: "Expenses", exact: true }).click();
    await openExpense(page);
    const length = await page.evaluate(() => history.length);
    for (let iteration = 0; iteration < 3; iteration++) {
      if (action === "return") await returnButton(page).click();
      else
        await editor(page)
          .getByRole("button", { name: "Cancel", exact: true })
          .click();
      await expect(list(page)).toBeVisible();
      await expect(page).toHaveURL(listUrl);
      expect(await page.evaluate(() => history.length)).toBe(length);
      await page.goForward();
      await expectEditor(page);
    }
    await returnButton(page).click();
    await page.goBack();
    await expect(page).toHaveURL(overviewUrl);
    expect(mutations).toEqual([]);
  });
}

test("direct editor reload reconstructs saved data and page return safely replaces the entry", async ({
  page,
}) => {
  const { mutations } = await setup(page);
  await page.goto("/?trip=interface-trip&view=analysis");
  await page.goto(editUrl);
  await expectEditor(page);
  await page.reload();
  await expectEditor(page);
  const length = await page.evaluate(() => history.length);
  await returnButton(page).click();
  await expect(page).toHaveURL(listUrl);
  expect(await page.evaluate(() => history.length)).toBe(length);
  await page.goBack();
  await expect(page).toHaveURL(/view=analysis/);
  expect(mutations).toEqual([]);
});

test("Overview page return goes to its labelled list, but native Back keeps the real source", async ({
  page,
}) => {
  await setup(page);
  await page.goto(overviewUrl);
  await page
    .locator(".recent-expense-row")
    .filter({ hasText: description })
    .getByRole("button")
    .click();
  await expectEditor(page);
  const length = await page.evaluate(() => history.length);
  await returnButton(page).click();
  await expect(page).toHaveURL(listUrl);
  expect(await page.evaluate(() => history.length)).toBe(length);
  await page.goBack();
  await expect(page).toHaveURL(overviewUrl);
});

for (const failure of [
  "missing-expense",
  "missing-id",
  "readonly",
  "archived",
  "missing-trip",
] as const) {
  test(`direct ${failure} editor cannot submit and has a safe return`, async ({
    page,
  }) => {
    const { trip, mutations } = await setup(page);
    if (failure === "readonly") {
      await page.route(`**/api/trips/${tripId}`, (route) =>
        route.fulfill({ json: { ...payload(trip), readonly: true } }),
      );
    }
    if (failure === "archived") trip.archivedAt = "2026-10-17T00:00:00Z";
    if (failure === "missing-trip") {
      await page.route("**/api/trips/unavailable", (route) =>
        route.fulfill({ status: 404, json: { error: "Group not found" } }),
      );
    }
    await page.goto(
      failure === "missing-id"
        ? editUrl.replace("&expense=dinner", "")
        : failure === "missing-expense"
          ? editUrl.replace("expense=dinner", "expense=absent")
          : failure === "missing-trip"
            ? editUrl.replace(`trip=${tripId}`, "trip=unavailable")
            : editUrl,
    );
    await expect(page.locator(".expense-composer")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Save changes", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Record expense", exact: true }),
    ).toHaveCount(0);
    await expect(returnButton(page)).toBeVisible();
    await returnButton(page).click();
    await expect(page).not.toHaveURL(/mode=edit-expense|expense=/);
    await expect(page.locator(".expense-composer")).toHaveCount(0);
    expect(mutations).toEqual([]);
  });
}

for (const action of ["return", "cancel"] as const) {
  test(`dirty ${action} rejects without reset, then discards once`, async ({
    page,
  }) => {
    const { mutations } = await setup(page);
    let nativePrompts = 0;
    page.on("dialog", async (dialog) => {
      nativePrompts++;
      await dialog.dismiss();
    });
    await page.goto(listUrl);
    await openExpense(page);
    await dirty(page);
    const state = await page.evaluate(() => ({
      state: history.state,
      length: history.length,
    }));
    const leave =
      action === "return"
        ? returnButton(page)
        : editor(page).getByRole("button", { name: "Cancel", exact: true });
    await leave.click();
    const confirmation = page.getByRole("dialog");
    await expect(confirmation).toContainText(/unsaved|discard/i);
    await confirmation
      .getByRole("button", { name: "Cancel", exact: true })
      .click();
    await expectEditor(page, "Unsaved dinner");
    await expect(leave).toBeFocused();
    await expect(page).toHaveURL(editUrl);
    expect(
      await page.evaluate(() => ({
        state: history.state,
        length: history.length,
      })),
    ).toEqual(state);
    await leave.click();
    await confirmation
      .getByRole("button", { name: "Discard draft", exact: true })
      .click();
    await expect(list(page)).toBeVisible();
    await page.goForward();
    await expectEditor(page);
    expect(nativePrompts).toBe(0);
    expect(mutations).toEqual([]);
  });
}

for (const delta of [-1, -2]) {
  test(`dirty history.go(${delta}) compensates its full delta without polluting Forward`, async ({
    page,
  }) => {
    const { mutations } = await setup(page);
    await page.goto(overviewUrl);
    await page.getByRole("button", { name: "Expenses", exact: true }).click();
    await openExpense(page);
    await dirty(page);
    await editor(page).getByLabel("Description", { exact: true }).focus();
    const original = await page.evaluate(() => ({
      state: history.state,
      length: history.length,
    }));
    await nativeTraversal(page, delta, false);
    await expect(page).toHaveURL(editUrl);
    await expectEditor(page, "Unsaved dinner");
    await expect(
      editor(page).getByLabel("Description", { exact: true }),
    ).toBeFocused();
    expect(
      await page.evaluate(() => ({
        state: history.state,
        length: history.length,
      })),
    ).toEqual(original);
    await nativeTraversal(page, delta, true);
    await expect(page).toHaveURL(delta === -1 ? listUrl : overviewUrl);
    for (let index = 0; index < -delta; index++) await page.goForward();
    await expectEditor(page);
    expect(await page.evaluate(() => history.length)).toBe(original.length);
    expect(mutations).toEqual([]);
  });
}

for (const delta of [1, 2]) {
  test(`dirty forward ${delta} rejects and accepts across app-owned entries`, async ({
    page,
  }) => {
    const { trip, mutations } = await setup(page);
    await installOtherTrip(page, trip);
    await page.goto(listUrl);
    await openExpense(page);
    await page
      .locator(".trip-switcher-item")
      .filter({ hasText: "Second group" })
      .click();
    await expect(page).toHaveURL(/trip=second-trip/);
    if (delta === 2) {
      await page
        .locator(".recent-expense-row")
        .filter({ hasText: description })
        .getByRole("button")
        .click();
      await expectEditor(page);
    }
    await page.evaluate((delta) => history.go(-delta), delta);
    await expect(page).toHaveURL(editUrl);
    await expectEditor(page);
    await dirty(page);
    const original = await page.evaluate(() => ({
      state: history.state,
      length: history.length,
    }));
    await nativeTraversal(page, delta, false);
    await expect(page).toHaveURL(editUrl);
    await expectEditor(page, "Unsaved dinner");
    expect(
      await page.evaluate(() => ({
        state: history.state,
        length: history.length,
      })),
    ).toEqual(original);
    await nativeTraversal(page, delta, true);
    await expect(page).toHaveURL(/trip=second-trip/);
    if (delta === 2) await expectEditor(page);
    else await expect(page.locator(".overview-recent")).toBeVisible();
    await page.evaluate((delta) => history.go(-delta), delta);
    await expect(page).toHaveURL(editUrl);
    await expectEditor(page);
    expect(mutations).toEqual([]);
  });
}

test("same-expense entries protect dirty drafts in both history directions", async ({
  page,
}) => {
  const { trip, mutations } = await setup(page);
  await installOtherTrip(page, trip);
  await page.goto(listUrl);
  await openExpense(page);
  await page
    .locator(".trip-switcher-item")
    .filter({ hasText: "Second group" })
    .click();
  await expect(page).toHaveURL(/trip=second-trip/);
  await page
    .locator(".trip-switcher-item")
    .filter({ hasText: trip.name })
    .click();
  await expect(page.locator(".overview-recent")).toBeVisible();
  await page
    .locator(".recent-expense-row")
    .filter({ hasText: description })
    .getByRole("button")
    .click();
  await expectEditor(page);
  await dirty(page);
  const laterState = await page.evaluate(() => history.state);
  await nativeTraversal(page, -3, false);
  await expect
    .poll(() => page.evaluate(() => history.state))
    .toEqual(laterState);
  await expectEditor(page, "Unsaved dinner");
  await nativeTraversal(page, -3, true);
  await expectEditor(page);
  await dirty(page, "Earlier unsaved dinner");
  const earlierState = await page.evaluate(() => history.state);
  await nativeTraversal(page, 3, false);
  await expect
    .poll(() => page.evaluate(() => history.state))
    .toEqual(earlierState);
  await expectEditor(page, "Earlier unsaved dinner");
  await nativeTraversal(page, 3, true);
  await expectEditor(page);
  expect(mutations).toEqual([]);
});

test("cross-trip page exit uses one Radix confirmation and clears edit parameters", async ({
  page,
}) => {
  const { trip, mutations } = await setup(page);
  await installOtherTrip(page, trip);
  await page.goto(listUrl);
  await openExpense(page);
  await dirty(page);
  const target = page
    .locator(".trip-switcher-item")
    .filter({ hasText: "Second group" });
  await target.click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await expectEditor(page, "Unsaved dinner");
  await expect(page).toHaveURL(editUrl);
  await target.click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Discard draft", exact: true })
    .click();
  await expect(page).toHaveURL(/trip=second-trip/);
  await expect(page).not.toHaveURL(/mode=|expense=/);
  expect(mutations).toEqual([]);
});

test("dirty reload uses beforeunload and rejecting retains the draft", async ({
  page,
}) => {
  await setup(page);
  await page.goto(editUrl);
  await expectEditor(page);
  await dirty(page);
  const prompt = page.waitForEvent("dialog");
  const reload = page.evaluate(() => window.location.reload());
  const confirmation = await prompt;
  expect(confirmation.type()).toBe("beforeunload");
  await confirmation.dismiss();
  await reload;
  await expectEditor(page, "Unsaved dinner");
  page.once("dialog", (dialog) => dialog.accept());
  await page.reload();
  await expectEditor(page);
});

for (const result of ["success", "failure", "conflict", "pending"] as const) {
  test(`save ${result} preserves navigation and sends exactly one PATCH`, async ({
    page,
  }) => {
    const { trip, mutations } = await setup(page);
    let calls = 0;
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(
      `**/api/trips/${tripId}/expenses/dinner`,
      async (route) => {
        expect(route.request().method()).toBe("PATCH");
        expect(route.request().headers()["if-match"]).toBe('"1"');
        expect(route.request().postDataJSON().description).toBe("Saved dinner");
        calls++;
        if (result === "pending") await gate;
        if (result === "failure" || result === "conflict") {
          await route.fulfill({
            status: result === "failure" ? 500 : 412,
            json: {
              error:
                result === "failure"
                  ? "Save failed for this test"
                  : "Changed by another editor",
              code: "EXPENSE_VERSION_CONFLICT",
            },
          });
        } else {
          trip.expenses[0] = {
            ...trip.expenses[0],
            description: "Saved dinner",
            version: 2,
          };
          await route.fulfill({ json: payload(trip) });
        }
      },
    );
    await page.goto(listUrl);
    await openExpense(page);
    await dirty(page, "Saved dinner");
    await editor(page)
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await expect.poll(() => calls).toBe(1);
    if (result === "pending") {
      await expect(
        editor(page).locator('button[type="submit"]'),
      ).toBeDisabled();
      await expect(returnButton(page)).toBeDisabled();
      await expect(
        editor(page).getByRole("button", { name: "Cancel", exact: true }),
      ).toBeDisabled();
      const before = await page.evaluate(() => ({
        state: history.state,
        length: history.length,
      }));
      const prompts: string[] = [];
      page.on("dialog", async (dialog) => {
        prompts.push(dialog.type());
        await dialog.dismiss();
      });
      await page.evaluate(
        () =>
          new Promise<void>((resolve) => {
            window.addEventListener("popstate", () => resolve(), {
              once: true,
            });
            history.back();
          }),
      );
      await expect(page).toHaveURL(editUrl);
      await expectEditor(page, "Saved dinner");
      await expect
        .poll(() =>
          page.evaluate(() => ({
            state: history.state,
            length: history.length,
          })),
        )
        .toEqual(before);
      expect(prompts).toEqual([]);
      release?.();
    }
    if (result === "failure" || result === "conflict") {
      await expectEditor(page, "Saved dinner");
      await expect(page).toHaveURL(editUrl);
      await expect(
        page
          .getByText(
            result === "failure"
              ? "Save failed for this test"
              : "Changed by another editor",
            { exact: true },
          )
          .first(),
      ).toBeVisible();
      if (result === "conflict") {
        await expect(
          editor(page).getByRole("button", {
            name: "Save changes",
            exact: true,
          }),
        ).toBeDisabled();
        await expect(
          editor(page).getByRole("button", { name: "Review latest expense" }),
        ).toBeVisible();
      }
    } else {
      await expect(page).toHaveURL(listUrl);
      await expect(
        list(page).getByRole("button", { name: "Saved dinner", exact: true }),
      ).toBeVisible();
      await page.goForward();
      await expectEditor(page, "Saved dinner");
    }
    expect(calls).toBe(1);
    expect(mutations).toEqual([`PATCH /api/trips/${tripId}/expenses/dinner`]);
  });
}

for (const reload of [false, true]) {
  test(`source list restores filters, sort, grouping, columns, scroll and focus${reload ? " after editor reload" : ""}`, async ({
    page,
  }) => {
    const trip = versionedTrip();
    const original = trip.expenses[0];
    trip.expenses = Array.from({ length: 65 }, (_, index) => ({
      ...original,
      id: `dinner-${index}`,
      description: `Dinner ${String(index).padStart(2, "0")}`,
      amountMinor: 1000 + index,
    }));
    const { mutations } = await setup(page, trip);
    await page.goto(listUrl);
    await page
      .getByRole("textbox", { name: "Search descriptions" })
      .fill("Dinner");
    await page
      .getByRole("combobox", { name: "Sort", exact: true })
      .selectOption("amount-desc");
    await page
      .getByRole("combobox", { name: "Group by", exact: true })
      .selectOption("none");
    await page.getByRole("button", { name: "Filters", exact: true }).click();
    await page
      .getByRole("dialog")
      .getByRole("combobox", { name: "Paid by", exact: true })
      .selectOption("a");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Done", exact: true })
      .click();
    await page.getByRole("button", { name: "Columns", exact: true }).click();
    await page
      .getByRole("checkbox", { name: "Paid by", exact: true })
      .uncheck();
    await page.getByRole("checkbox", { name: "Split", exact: true }).check();
    await page.keyboard.press("Escape");
    const trigger = list(page).getByRole("button", {
      name: "Dinner 20",
      exact: true,
    });
    await trigger.scrollIntoViewIfNeeded();
    const scroll = await page.evaluate(() => scrollY);
    expect(scroll).toBeGreaterThan(500);
    await trigger.click();
    await expectEditor(page, "Dinner 20");
    if (reload) {
      await page.reload();
      await expectEditor(page, "Dinner 20");
    }
    await returnButton(page).click();
    await expect(list(page)).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: "Search descriptions" }),
    ).toHaveValue("Dinner");
    await expect(
      page.getByRole("combobox", { name: "Sort", exact: true }),
    ).toHaveValue("amount-desc");
    await expect(
      page.getByRole("combobox", { name: "Group by", exact: true }),
    ).toHaveValue("none");
    await expect(
      page.getByRole("columnheader", { name: "Paid by", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("columnheader", { name: "Split", exact: true }),
    ).toBeVisible();
    await expect(trigger).toBeFocused();
    await expect
      .poll(() => page.evaluate((scroll) => Math.abs(scrollY - scroll), scroll))
      .toBeLessThanOrEqual(2);
    await page.getByRole("button", { name: /^Filters\b/ }).click();
    await expect(
      page
        .getByRole("dialog")
        .getByRole("combobox", { name: "Paid by", exact: true }),
    ).toHaveValue("a");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Done", exact: true })
      .click();
    expect(mutations).toEqual([]);
  });
}

test("removed source item keeps filters, clamps scroll, and focuses the list heading", async ({
  page,
}) => {
  const trip = versionedTrip();
  trip.expenses = Array.from({ length: 45 }, (_, index) => ({
    ...trip.expenses[0],
    id: `item-${index}`,
    description: `Dinner ${index}`,
  }));
  await setup(page, trip);
  await page.goto(listUrl);
  await page
    .getByRole("textbox", { name: "Search descriptions" })
    .fill("Dinner");
  await openExpense(page, "Dinner 40");
  trip.expenses = [
    { ...trip.expenses[0], id: "coffee", description: "Coffee" },
  ];
  // Reload refetches data without adding a new entry or deleting the source metadata.
  await page.reload();
  await expect(page.locator(".expense-composer")).toHaveCount(0);
  await returnButton(page).click();
  await expect(list(page)).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Search descriptions" }),
  ).toHaveValue("Dinner");
  await expect(
    list(page).getByRole("heading", {
      name: "No matching expenses",
      exact: true,
    }),
  ).toBeVisible();
  await expect(list(page).locator("#expenses-heading")).toBeFocused();
  expect(
    await page.evaluate(
      () => scrollY <= document.documentElement.scrollHeight - innerHeight + 1,
    ),
  ).toBe(true);
});

test("account settings Back and Forward retain the draft and use the shared history sequence", async ({
  page,
}) => {
  const { mutations } = await setup(page);
  const nativePrompts: string[] = [];
  page.on("dialog", async (dialog) => {
    nativePrompts.push(dialog.type());
    await dialog.dismiss();
  });
  await page.goto(listUrl);
  await openExpense(page);
  await dirty(page);
  await page
    .getByRole("button", { name: "Alex's account menu", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Account settings", exact: true })
    .click();
  await expect(page).toHaveURL(/account=settings/);
  const length = await page.evaluate(() => history.length);
  await page.goBack();
  await expect(page).toHaveURL(editUrl);
  await expectEditor(page, "Unsaved dinner");
  await page.goForward();
  await expect(page).toHaveURL(/account=settings/);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expectEditor(page, "Unsaved dinner");
  await expect(page).toHaveURL(editUrl);
  expect(await page.evaluate(() => history.length)).toBe(length);
  expect(nativePrompts).toEqual([]);
  expect(mutations).toEqual([]);
});

test("multi-entry traversal from account settings rejects without losing the hidden draft", async ({
  page,
}) => {
  const { mutations } = await setup(page);
  await page.goto(listUrl);
  await openExpense(page);
  await dirty(page);
  await page
    .getByRole("button", { name: "Alex's account menu", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Account settings", exact: true })
    .click();
  await expect(page).toHaveURL(/account=settings/);
  const settingsUrl = page.url();
  const original = await page.evaluate(() => ({
    state: history.state,
    length: history.length,
  }));
  await nativeTraversal(page, -2, false);
  await expect(page).toHaveURL(settingsUrl);
  await expect
    .poll(() =>
      page.evaluate(() => ({ state: history.state, length: history.length })),
    )
    .toEqual(original);
  await page.goBack();
  await expectEditor(page, "Unsaved dinner");
  await nativeTraversal(page, -1, true);
  await expect(page).toHaveURL(listUrl);
  await page.goForward();
  await expectEditor(page);
  expect(mutations).toEqual([]);
});

test("direct loading waits for permissions before mounting a submit form", async ({
  page,
}) => {
  const { trip, mutations } = await setup(page);
  let release: (() => void) | undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requested = false;
  await page.route(`**/api/trips/${tripId}`, async (route) => {
    requested = true;
    await gate;
    await route.fulfill({ json: payload(trip) });
  });
  await page.goto(editUrl);
  await expect.poll(() => requested).toBe(true);
  await expect(page.locator(".expense-composer")).toHaveCount(0);
  release?.();
  await expectEditor(page);
  expect(mutations).toEqual([]);
});

test("direct editor has default list state and the localized return label", async ({
  page,
}) => {
  const trip = versionedTrip();
  await mockWorkspace(page, trip, "owner", "zh-TW");
  await page.goto(editUrl);
  const back = page.getByRole("button", { name: "返回支出列表", exact: true });
  await expect(back).toHaveAttribute("type", "button");
  await back.click();
  await expect(page).toHaveURL(listUrl);
  await expect(page.getByRole("textbox", { name: "搜尋描述" })).toHaveValue("");
  await expect(page.getByRole("combobox", { name: "分組方式" })).toHaveValue(
    "date",
  );
});
