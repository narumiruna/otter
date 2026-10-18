import type {
  ExpenseHistoryPage,
  TripPayload,
} from "@narumitw/otter-contracts";
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
const user = { id: "owner", username: "alex", name: "Alex" };

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

function gate() {
  let release = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { pending, release };
}

async function setup(page: Page, trip = versionedTrip()) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockWorkspace(page, trip);
  return trip;
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

async function openExpense(page: Page) {
  await list(page)
    .getByRole("button", { name: description, exact: true })
    .click();
  await expectEditor(page);
  await expect(page).toHaveURL(editUrl);
}

// Same-document traversal must wait for popstate, not a document load.
async function nativeHistory(page: Page, delta: number) {
  await page.evaluate(
    (delta) =>
      new Promise<void>((resolve) => {
        window.addEventListener("popstate", () => resolve(), { once: true });
        history.go(delta);
      }),
    delta,
  );
}

async function accountAction(
  page: Page,
  name: "Account settings" | "Sign out",
) {
  await page
    .getByRole("button", { name: "Alex's account menu", exact: true })
    .click();
  await page.getByRole("menuitem", { name, exact: true }).click();
}

async function signIn(page: Page) {
  await expect(
    page.getByRole("heading", { name: "Sign in", exact: true }),
  ).toBeVisible();
  await page.locator("#login-username").fill("alex");
  await page.locator("#login-password").fill("password123");
  await page.locator('#login-form button[type="submit"]').click();
}

async function settledFrames(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}

test("logout from a direct editor resets shared history state before signing in again", async ({
  page,
}) => {
  await setup(page);
  let signedIn = true;
  let logins = 0;
  let logouts = 0;
  await page.route("**/api/me", (route) =>
    route.fulfill({ json: { user: signedIn ? user : null } }),
  );
  await page.route("**/api/auth/logout", (route) => {
    expect(route.request().method()).toBe("POST");
    signedIn = false;
    logouts++;
    return route.fulfill({ json: { ok: true } });
  });
  await page.route("**/api/auth/login", (route) => {
    expect(route.request().method()).toBe("POST");
    signedIn = true;
    logins++;
    return route.fulfill({ json: { user } });
  });
  await page.goto(editUrl);
  await expectEditor(page);
  await accountAction(page, "Sign out");
  await expect(page).toHaveURL("/");
  await signIn(page);
  await expect(page.locator(".overview-recent")).toBeVisible();
  await expect(page).toHaveURL(`/?trip=${tripId}`);
  await expect(page.locator(".expense-composer")).toHaveCount(0);
  await page.getByRole("button", { name: "Expenses", exact: true }).click();
  await expect(page).toHaveURL(listUrl);
  await expect(list(page)).toBeVisible();
  expect(logouts).toBe(1);
  expect(logins).toBe(1);
});

test("a signed-in invitation selects the joined second group and joins only once", async ({
  page,
}) => {
  const first = await setup(page);
  const second = {
    ...versionedTrip(),
    id: "second-trip",
    name: "Invited group",
  };
  let joins = 0;
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
  await page.route("**/api/share/lifecycle-invite", (route) =>
    route.fulfill({ json: { mode: "signed-in-edit", tripName: second.name } }),
  );
  await page.route("**/api/share/lifecycle-invite/join", (route) => {
    expect(route.request().method()).toBe("POST");
    joins++;
    return route.fulfill({ json: { tripId: second.id } });
  });
  await page.goto("/share/lifecycle-invite");
  await expect(page).toHaveURL(/\/\?trip=second-trip(?:&view=overview)?$/);
  const invitationDestination = page.url();
  await expect(page.locator(".trip-header")).toContainText(second.name);
  await expect(page.locator(".overview-recent")).toBeVisible();
  await page.getByRole("button", { name: "Expenses", exact: true }).click();
  await expect(page).toHaveURL("/?trip=second-trip&view=expenses");
  await expect(list(page)).toBeVisible();
  await accountAction(page, "Account settings");
  await expect(page).toHaveURL(/account=settings/);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(list(page)).toBeVisible();
  await nativeHistory(page, -1);
  await expect(page).toHaveURL(invitationDestination);
  expect(joins).toBe(1);
});

test("Account settings cannot hide a submitting editor or reopen it after save", async ({
  page,
}) => {
  const trip = await setup(page);
  const save = gate();
  let patches = 0;
  await page.route(`**/api/trips/${tripId}/expenses/dinner`, async (route) => {
    expect(route.request().method()).toBe("PATCH");
    expect(route.request().headers()["if-match"]).toBe('"1"');
    patches++;
    await save.pending;
    trip.expenses[0] = {
      ...trip.expenses[0],
      description: "Saved dinner",
      version: 2,
    };
    await route.fulfill({ json: payload(trip) });
  });
  await page.goto(listUrl);
  await openExpense(page);
  await editor(page)
    .getByLabel("Description", { exact: true })
    .fill("Saved dinner");
  const original = await page.evaluate(() => ({
    state: history.state,
    length: history.length,
  }));
  await editor(page)
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await expect.poll(() => patches).toBe(1);
  try {
    await accountAction(page, "Account settings");
    await expect(page).toHaveURL(editUrl);
    await expectEditor(page, "Saved dinner");
    await expect(
      page.getByRole("heading", { name: "Account settings", exact: true }),
    ).toHaveCount(0);
    expect(
      await page.evaluate(() => ({
        state: history.state,
        length: history.length,
      })),
    ).toEqual(original);
  } finally {
    save.release();
  }
  await expect(page).toHaveURL(listUrl);
  await expect(
    list(page).getByRole("button", { name: "Saved dinner", exact: true }),
  ).toBeVisible();
  await accountAction(page, "Account settings");
  await expect(page).toHaveURL(/account=settings/);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page).toHaveURL(listUrl);
  await expect(list(page)).toBeVisible();
  await expect(page.locator(".expense-composer")).toHaveCount(0);
  expect(patches).toBe(1);
});

function historyFixture(trip: Trip): ExpenseHistoryPage {
  return {
    revisions: [
      {
        id: "dinner-revision-1",
        expenseId: "dinner",
        version: 1,
        action: "created",
        source: "expense",
        actor: { id: "owner", name: "Alex" },
        recordedAt: "2026-10-04T10:00:00Z",
        snapshot: {
          schemaVersion: 1,
          expense: {
            ...trip.expenses[0],
            description: "Restored dinner",
            tags: trip.expenses[0].tags ?? [],
          },
          participants: trip.participants,
          receipt: null,
        },
        previousSnapshot: null,
        changedFields: [],
      },
    ],
    latestRevision: { version: 1, action: "created" },
    nextCursor: null,
  };
}

async function startMutation(page: Page, action: "delete" | "restore") {
  if (action === "delete") {
    await editor(page)
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: `Delete “${description}”`, exact: true })
      .click();
  } else {
    await editor(page)
      .getByRole("button", {
        name: `Change history: ${description}`,
        exact: true,
      })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Restore v1", exact: true })
      .click();
    await page
      .getByRole("region", { name: "Restore expense version", exact: true })
      .getByRole("button", { name: "Restore this version", exact: true })
      .click();
  }
}

for (const action of ["delete", "restore"] as const) {
  for (const leave of [false, true]) {
    test(`${action} completion ${leave ? "does not redirect a newer Analysis entry" : "returns to its list and Forward reads the latest result"}`, async ({
      page,
    }) => {
      const trip = await setup(page);
      const mutation = gate();
      let calls = 0;
      let completed = false;
      if (action === "restore") {
        await page.route(`**/api/trips/${tripId}/expense-history?*`, (route) =>
          route.fulfill({ json: historyFixture(trip) }),
        );
      }
      const path = `/api/trips/${tripId}/expenses/dinner${action === "restore" ? "/restore" : ""}`;
      await page.route(`**${path}`, async (route) => {
        expect(route.request().method()).toBe(
          action === "delete" ? "DELETE" : "POST",
        );
        expect(route.request().headers()["if-match"]).toBe('"1"');
        if (action === "restore")
          expect(route.request().postDataJSON()).toEqual({
            revisionId: "dinner-revision-1",
          });
        calls++;
        await mutation.pending;
        if (action === "delete")
          trip.expenses = trip.expenses.filter(
            (expense) => expense.id !== "dinner",
          );
        else
          trip.expenses[0] = {
            ...trip.expenses[0],
            description: "Restored dinner",
            version: 2,
          };
        await route.fulfill({ json: payload(trip) });
        completed = true;
      });
      await page.goto(listUrl);
      await openExpense(page);
      await startMutation(page, action);
      await expect.poll(() => calls).toBe(1);
      try {
        if (leave) {
          await nativeHistory(page, -1);
          await expect(page).toHaveURL(listUrl);
          await expect(list(page)).toBeVisible();
          await page
            .getByRole("button", { name: "Spending analysis", exact: true })
            .click();
          await expect(page).toHaveURL(analysisUrl);
          await expect(
            page.getByRole("region", {
              name: "Spending analysis",
              exact: true,
            }),
          ).toBeVisible();
        }
      } finally {
        mutation.release();
      }
      await expect.poll(() => completed).toBe(true);
      await expect(
        page.getByRole("status").filter({
          hasText:
            action === "delete"
              ? "Expense deleted"
              : "Expense version restored",
        }),
      ).toBeVisible();
      await settledFrames(page);
      if (leave) {
        await expect(page).toHaveURL(analysisUrl);
        await expect(
          page.getByRole("region", { name: "Spending analysis", exact: true }),
        ).toBeVisible();
        await expect(page.locator(".expense-composer")).toHaveCount(0);
      } else {
        await expect(page).toHaveURL(listUrl);
        await expect(list(page)).toBeVisible();
        await nativeHistory(page, 1);
        await expect(page).toHaveURL(editUrl);
        if (action === "delete") {
          await expect(page.locator(".expense-composer")).toHaveCount(0);
          await expect(
            page.getByRole("button", {
              name: "Back to expense list",
              exact: true,
            }),
          ).toBeVisible();
        } else {
          await expectEditor(page, "Restored dinner");
          await editor(page)
            .getByLabel("Description", { exact: true })
            .fill("Saved restored dinner");
          let savedVersion: string | undefined;
          await page.route(
            `**/api/trips/${tripId}/expenses/dinner`,
            (route) => {
              expect(route.request().method()).toBe("PATCH");
              savedVersion = route.request().headers()["if-match"];
              trip.expenses[0] = {
                ...trip.expenses[0],
                description: "Saved restored dinner",
                version: 3,
              };
              return route.fulfill({ json: payload(trip) });
            },
          );
          await editor(page)
            .getByRole("button", { name: "Save changes", exact: true })
            .click();
          await expect(page).toHaveURL(listUrl);
          expect(savedVersion).toBe('"2"');
        }
      }
      expect(calls).toBe(1);
    });
  }
}

test("history.go(-2) restores the first of two same-route list snapshots", async ({
  page,
}) => {
  const trip = versionedTrip();
  const original = trip.expenses[0];
  trip.expenses = [
    ...Array.from({ length: 65 }, (_, index) => ({
      ...original,
      id: `dinner-${index}`,
      description: `Dinner ${String(index).padStart(2, "0")}`,
    })),
    trip.expenses[1],
  ];
  await setup(page, trip);
  await page.goto(listUrl);
  const query = page.getByRole("textbox", { name: "Search descriptions" });
  await query.fill("Dinner");
  await list(page)
    .getByRole("button", { name: "Dinner 40", exact: true })
    .scrollIntoViewIfNeeded();
  // Keyboard activation leaves the list scroll snapshot unchanged.
  await page
    .getByRole("button", { name: "Add expense", exact: true })
    .evaluate((button) => button.focus({ preventScroll: true }));
  const scroll = await page.evaluate(() => scrollY);
  expect(scroll).toBeGreaterThan(500);
  const length = await page.evaluate(() => history.length);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(`${listUrl}&mode=add-expense`);
  await page
    .locator(".expense-composer")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await expect(page).toHaveURL(listUrl);
  await expect(list(page)).toBeVisible();
  expect(await page.evaluate(() => history.length)).toBe(length + 2);
  await query.fill("Train");
  await expect(
    list(page).getByRole("button", {
      name: "Train to the mountains",
      exact: true,
    }),
  ).toBeVisible();
  await nativeHistory(page, -2);
  await expect(page).toHaveURL(listUrl);
  await expect(query).toHaveValue("Dinner");
  await expect(
    list(page).getByRole("button", { name: "Dinner 40", exact: true }),
  ).toBeVisible();
  await expect(list(page).locator("#expenses-heading")).toBeFocused();
  await expect
    .poll(() => page.evaluate((scroll) => Math.abs(scrollY - scroll), scroll))
    .toBeLessThanOrEqual(2);
  await nativeHistory(page, 2);
  await expect(page).toHaveURL(listUrl);
  await expect(query).toHaveValue("Train");
});

for (const failure of [false, true]) {
  test(`Forward waits for a fresh GET ${failure ? "and preserves the editor route for error and retry" : "before initializing version 2"}`, async ({
    page,
  }) => {
    const trip = await setup(page);
    const refresh = gate();
    let refreshRequested = false;
    let refreshMode = false;
    let failNext = failure;
    let gets = 0;
    await page.route(`**/api/trips/${tripId}`, async (route) => {
      expect(route.request().method()).toBe("GET");
      gets++;
      if (refreshMode && !refreshRequested) {
        refreshRequested = true;
        await refresh.pending;
      }
      if (refreshMode && failNext) {
        failNext = false;
        await route.fulfill({
          status: 503,
          json: { error: "Latest expense unavailable for this test" },
        });
      } else await route.fulfill({ json: payload(trip) });
    });
    await page.goto(listUrl);
    await openExpense(page);
    await nativeHistory(page, -1);
    await expect(list(page)).toBeVisible();
    const before = gets;
    trip.expenses[0] = {
      ...trip.expenses[0],
      description: "Dinner updated on the server",
      version: 2,
    };
    refreshMode = true;
    try {
      await nativeHistory(page, 1);
      await expect(page).toHaveURL(editUrl);
      await expect.poll(() => refreshRequested).toBe(true);
      expect(gets).toBeGreaterThan(before);
      await expect(page.locator(".expense-composer")).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "Save changes", exact: true }),
      ).toHaveCount(0);
    } finally {
      refresh.release();
    }
    if (failure) {
      await expect(
        page
          .getByText("Latest expense unavailable for this test", {
            exact: true,
          })
          .first(),
      ).toBeVisible();
      await expect(page).toHaveURL(editUrl);
      await expect(page.locator(".expense-composer")).toHaveCount(0);
      const failedGets = gets;
      await page.getByRole("button", { name: /^(Reload|Retry)$/ }).click();
      await expect.poll(() => gets).toBeGreaterThan(failedGets);
    }
    await expectEditor(page, "Dinner updated on the server");
    await expect(page).toHaveURL(editUrl);
    let patchVersion: string | undefined;
    await page.route(`**/api/trips/${tripId}/expenses/dinner`, (route) => {
      expect(route.request().method()).toBe("PATCH");
      patchVersion = route.request().headers()["if-match"];
      trip.expenses[0] = {
        ...trip.expenses[0],
        description: "Saved version 2",
        version: 3,
      };
      return route.fulfill({ json: payload(trip) });
    });
    await editor(page)
      .getByLabel("Description", { exact: true })
      .fill("Saved version 2");
    await editor(page)
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await expect(page).toHaveURL(listUrl);
    expect(patchVersion).toBe('"2"');
  });
}
