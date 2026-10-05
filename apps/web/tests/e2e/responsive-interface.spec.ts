import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import {
  calculateBalances,
  calculateSettlements,
  type Trip,
} from "@narumitw/otter-core/settlement";
import { expect, type Page, test } from "@playwright/test";
import type { TripPayload } from "../../src/client/client-support.js";
import { expectNoOverflow } from "./layout-assertions.js";

const screenshotDirectory = process.env.OTTER_UI_SCREENSHOTS;

function exampleTrip(): Trip {
  const participants = [
    { id: "a", name: "Alex" },
    { id: "b", name: "Morgan" },
    { id: "c", name: "Jamie" },
    { id: "d", name: "Sam", settledById: "c" },
  ];
  return {
    id: "interface-trip",
    name: "Autumn in Kyoto · 京都秋旅",
    baseCurrency: "JPY",
    ownerId: "owner",
    createdAt: "2026-10-01T00:00:00Z",
    participants,
    exchangeRates: { JPY: 1, USD: 250 },
    expenses: [
      {
        id: "dinner",
        description: "Dinner at the market",
        amountMinor: 5700,
        currency: "JPY",
        category: "餐飲",
        expenseDate: "2026-10-04",
        paidById: "a",
        participantIds: ["a", "b"],
        receiptUrl: "/icon.svg",
        createdAt: "2026-10-04T10:00:00Z",
        exchangeRate: { baseCurrency: "JPY", rateToBase: 1, source: "fixed" },
      },
      {
        id: "train",
        description: "Train to the mountains",
        amountMinor: 17150,
        currency: "JPY",
        category: "交通",
        expenseDate: "2026-10-04",
        paidById: "b",
        participantIds: ["a", "b", "c", "d"],
        createdAt: "2026-10-04T09:00:00Z",
      },
      {
        id: "stay",
        description: "A quiet place to stay",
        amountMinor: 89640,
        currency: "JPY",
        category: "住宿",
        expenseDate: "2026-10-04",
        paidById: "a",
        participantIds: ["a", "b", "c", "d"],
        createdAt: "2026-10-04T08:00:00Z",
      },
      {
        id: "usd",
        description: "Travel booking",
        amountMinor: 4250,
        currency: "USD",
        category: "其他",
        expenseDate: "2026-10-02",
        paidById: "a",
        participantIds: ["a", "b", "c", "d"],
        createdAt: "2026-10-02T08:00:00Z",
        exchangeRate: {
          baseCurrency: "JPY",
          rateToBase: 150,
          source: "bank",
          provider: "BANK_OF_TAIWAN",
          rateType: "spotMid",
          fetchedAt: "2026-10-01T12:00:00Z",
        },
      },
      {
        id: "coffee",
        description: "Coffee and a slow morning",
        amountMinor: 2100,
        currency: "JPY",
        category: "餐飲",
        expenseDate: "2026-10-01",
        paidById: "c",
        participantIds: ["a", "b", "c"],
        createdAt: "2026-10-01T08:00:00Z",
      },
    ],
  };
}

async function mockWorkspace(
  page: Page,
  trip = exampleTrip(),
  role: "owner" | "editor" = "owner",
) {
  const payload = (): TripPayload => ({
    trip,
    balances: calculateBalances(trip),
    settlements: calculateSettlements(trip),
    currentUserRole: role,
    exchangeRateInfo: {
      source: "bank",
      provider: "BANK_OF_TAIWAN",
      rateType: "spotMid",
      fetchedAt: "2026-10-01T12:00:00Z",
    },
    collaborators: [
      { userId: "owner", username: "alex", name: "Alex", role: "owner" },
    ],
    shareLinks: [
      {
        id: "link-1",
        mode: "readonly",
        createdAt: "2026-10-01T12:00:00Z",
        revokedAt: null,
      },
      {
        id: "link-2",
        mode: "anyone-edit",
        createdAt: "2026-09-28T12:00:00Z",
        revokedAt: "2026-10-01T12:00:00Z",
      },
    ],
  });
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/config")
      await route.fulfill({ json: { devLoginCredentials: null } });
    else if (path === "/api/me")
      await route.fulfill({
        json: { user: { id: "owner", username: "alex", name: "Alex" } },
      });
    else if (path === "/api/trips")
      await route.fulfill({
        json: {
          archivedTrips: [],
          trips: [
            {
              id: trip.id,
              name: trip.name,
              baseCurrency: trip.baseCurrency,
              participantCount: trip.participants.length,
              expenseCount: trip.expenses.length,
            },
          ],
        },
      });
    else if (path === `/api/trips/${trip.id}`)
      await route.fulfill({ json: payload() });
    else if (path === `/api/trips/${trip.id}/expense-history`)
      await route.fulfill({ json: { revisions: [], nextCursor: null } });
    else if (path === "/api/passkeys")
      await route.fulfill({ json: { passkeys: [] } });
    else if (path === "/api/auth/tokens")
      await route.fulfill({ json: { tokens: [] } });
    else
      throw new Error(
        `Unexpected request: ${route.request().method()} ${path}`,
      );
  });
  await page.addInitScript(() => {
    window.localStorage.setItem("otter.locale", "en");
  });
}

async function accessible(page: Page) {
  const result = await new AxeBuilder({ page }).analyze();
  expect(
    result.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    ),
  ).toEqual([]);
}

async function screenshot(page: Page, name: string) {
  if (!screenshotDirectory) return;
  await mkdir(screenshotDirectory, { recursive: true });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: join(screenshotDirectory, `${name}.png`),
    fullPage: !name.includes("-mobile"),
  });
}

for (const colorScheme of ["light", "dark"] as const) {
  test(`${colorScheme} responsive workspace, filters, details, people and account settings`, async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await mockWorkspace(page);
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/?trip=interface-trip");
    await expect(
      page.getByRole("heading", { name: "Recent expenses" }),
    ).toBeVisible();
    await expectNoOverflow(page);
    await accessible(page);
    await screenshot(page, `overview-desktop-${colorScheme}`);
    await page.getByRole("button", { name: "View all" }).click();
    const expenses = page.getByRole("region", {
      name: "Expenses",
      exact: true,
    });
    await expect(expenses.getByRole("table")).toBeVisible();
    await expenses.getByRole("button", { name: "Columns" }).click();
    await page.getByRole("checkbox", { name: "Split", exact: true }).check();
    await page.getByRole("checkbox", { name: "Receipt", exact: true }).check();
    await page.keyboard.press("Escape");
    const columnsBefore = await page.evaluate(() =>
      window.localStorage.getItem("otter.expense-columns.owner"),
    );
    await screenshot(page, `expenses-desktop-${colorScheme}`);
    await expenses
      .getByRole("button", {
        name: "View amount and exchange rate for Travel booking",
      })
      .click();
    await expect(page.getByText(/1 USD = 150 JPY/)).toBeVisible();
    await expect(page.getByText(/1 USD = 150 JPY/)).toContainText("¥6,375");
    await page.keyboard.press("Escape");
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      const addExpense = page.getByRole("button", {
        name: "Add expense",
        exact: true,
      });
      await expect(addExpense).toBeVisible();
      await expect(addExpense).toBeEnabled();
      await expectNoOverflow(page);
      await accessible(page);
      if (width === 320 || width === 768)
        await screenshot(
          page,
          `expenses-${width === 320 ? "mobile" : "tablet"}-${width}-${colorScheme}`,
        );
      if (width <= 680) {
        await expect(expenses.getByRole("table")).toHaveCount(0);
        await expect(
          expenses.getByRole("button", { name: "Columns" }),
        ).toHaveCount(0);
        await expect(page.locator(".workspace-nav button")).toHaveCount(5);
        await expect(page.locator(".group-switch-trigger")).toHaveText(
          "Autumn in Kyoto · 京都秋旅",
        );
        await expect(page.locator(".desktop-trip-title")).toBeHidden();
        const first = await expenses
          .getByRole("button", { name: "Dinner at the market", exact: true })
          .boundingBox();
        expect(first?.y).toBeLessThan(500);
        for (const button of await page
          .locator(".workspace-nav button")
          .all()) {
          const bounds = await button.boundingBox();
          expect(bounds?.width).toBeGreaterThanOrEqual(44);
          expect(bounds?.height).toBeGreaterThanOrEqual(44);
        }
        await expenses
          .getByRole("button", { name: "Filters", exact: true })
          .click();
        const sheet = page.getByRole("dialog", {
          name: "Filters",
          exact: true,
        });
        await expect(
          sheet.getByRole("combobox", { name: "Sort", exact: true }),
        ).toBeVisible();
        await sheet
          .getByRole("combobox", { name: "Category", exact: true })
          .selectOption("餐飲");
        await expectNoOverflow(page);
        await accessible(page);
        if (width === 390)
          await screenshot(page, `filters-mobile-${colorScheme}`);
        await page.setViewportSize({ width, height: 480 }); // reduced visual viewport with an on-screen keyboard
        await sheet.getByRole("textbox", { name: "Tag", exact: true }).focus();
        await sheet
          .getByRole("button", { name: "Done", exact: true })
          .scrollIntoViewIfNeeded();
        const done = await sheet
          .getByRole("button", { name: "Done", exact: true })
          .boundingBox();
        expect((done?.y ?? 0) + (done?.height ?? 0)).toBeLessThanOrEqual(480);
        await sheet.getByRole("button", { name: "Done", exact: true }).click();
        await expect(
          expenses.getByRole("button", { name: /^Filters/ }),
        ).toBeFocused();
        await page.setViewportSize({ width, height: 844 });
        await expenses.getByRole("button", { name: "Clear all" }).click();
        expect(
          await page.evaluate(() =>
            window.localStorage.getItem("otter.expense-columns.owner"),
          ),
        ).toBe(columnsBefore);
        await expenses
          .getByRole("button", {
            name: "View receipt for Dinner at the market",
          })
          .click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await page.keyboard.press("Escape");
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    const lastExpense = page.locator(".expense-mobile-row").last();
    await expect(lastExpense).toBeVisible();
    await expect
      .poll(async () => {
        await page.evaluate(() =>
          window.scrollTo({
            top: document.body.scrollHeight,
            behavior: "instant",
          }),
        );
        const lastBounds = await lastExpense.boundingBox();
        const navBounds = await page.locator(".workspace-nav").boundingBox();
        return (
          (lastBounds?.y ?? 0) + (lastBounds?.height ?? 0) - (navBounds?.y ?? 0)
        );
      })
      .toBeLessThanOrEqual(0);
    await screenshot(page, `expenses-mobile-${colorScheme}`);
    const groupSwitch = page.getByRole("button", {
      name: "Switch groups",
      exact: true,
    });
    await groupSwitch.click();
    const groups = page.getByRole("dialog", {
      name: "Switch groups",
      exact: true,
    });
    await expect(groups).toBeVisible();
    await expectNoOverflow(page);
    await accessible(page);
    await groups
      .getByRole("button", { name: "Create group", exact: true })
      .click();
    await expect(
      page.getByRole("dialog", { name: "Create group", exact: true }),
    ).toBeVisible();
    await accessible(page);
    await page.keyboard.press("Escape");
    await expect(groups).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(groupSwitch).toBeFocused();
    await page
      .locator(".workspace-nav")
      .getByRole("button", { name: "Overview", exact: true })
      .click();
    await screenshot(page, `overview-mobile-${colorScheme}`);
    await page
      .locator(".workspace-nav")
      .getByRole("button", { name: "People", exact: true })
      .click();
    await expect(page.locator(".people-row")).toHaveCount(4);
    await page.getByRole("button", { name: "Add person", exact: true }).click();
    await expect(
      page.getByRole("dialog").getByLabel("Person's name"),
    ).toBeFocused();
    await accessible(page);
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Advanced people tools" }).click();
    await expect(
      page.getByRole("dialog").getByText(/will move to/),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await screenshot(page, `people-mobile-${colorScheme}`);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await expect(page.locator(".people-table")).toBeVisible();
    await accessible(page);
    await screenshot(page, `people-desktop-${colorScheme}`);
    await page
      .locator(".workspace-nav")
      .getByRole("button", { name: "Group settings", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Share links" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Revoke", exact: true }).click();
    await expect(
      page.getByRole("dialog", { name: "Revoke this share link?" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await accessible(page);
    await screenshot(page, `group-settings-desktop-${colorScheme}`);
    await page
      .getByRole("link", { name: "API write access", exact: true })
      .click();
    await expect(page.locator("#sharing-settings")).toBeHidden();
    await expect(page.locator("#api-write-settings")).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await expectNoOverflow(page);
    await screenshot(page, `group-settings-mobile-${colorScheme}`);
    await page.getByRole("button", { name: "Alex's account menu" }).click();
    await page.getByRole("menuitem", { name: "Account settings" }).click();
    await expect(
      page.getByRole("heading", { name: "Account settings", exact: true }),
    ).toBeFocused();
    await accessible(page);
    await expectNoOverflow(page);
    await screenshot(page, `account-mobile-${colorScheme}`);
    for (const theme of ["Ocean", "Lavender", "Sunset", "Rose", "Forest"]) {
      await page
        .locator(".theme-palette-option")
        .filter({ hasText: theme })
        .click();
      await expect(
        page.getByRole("radio", { name: theme, exact: true }),
      ).toBeChecked();
      await expectNoOverflow(page);
      await accessible(page);
    }
    for (const mode of ["Light", "Dark", "System"]) {
      await page
        .locator(".appearance-mode-option")
        .filter({ hasText: mode })
        .click();
      await expect(
        page.locator(".radix-themes[data-is-root-theme='true']"),
      ).toHaveClass(
        new RegExp(mode === "System" ? colorScheme : mode.toLowerCase()),
      );
      const foreground = await page
        .locator(".radix-themes[data-is-root-theme='true']")
        .evaluate((element) => {
          // Axe temporarily assigns transition durations, so wait for the new token's color.
          const probe = document.createElement("span");
          probe.style.color =
            getComputedStyle(element).getPropertyValue("--gray-12");
          return probe.style.color;
        });
      for (const selector of [
        ".radix-themes[data-is-root-theme='true']",
        ".brand-name",
        "#account-settings-heading",
        ".account-section-title",
      ]) {
        await expect(page.locator(selector).first()).toHaveCSS(
          "color",
          foreground,
        );
      }
      await accessible(page);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await accessible(page);
    await screenshot(page, `account-desktop-${colorScheme}`);
    expect(pageErrors).toEqual([]);
  });
}

for (const colorScheme of ["light", "dark"] as const) {
  test(`${colorScheme} sticky tabs preserve Back scroll and print keeps ledger content`, async ({
    page,
  }) => {
    await mockWorkspace(page);
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1440, height: 700 });
    await page.goto("/?trip=interface-trip");
    await expect(
      page.getByRole("heading", { name: "Recent expenses" }),
    ).toBeVisible();
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    await page.evaluate(() =>
      window.scrollTo({ top: 900, behavior: "instant" }),
    );
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(200);
    const previousScroll = await page.evaluate(() => window.scrollY);
    const navigation = page.getByRole("navigation", {
      name: "Group workspace",
    });
    const settings = navigation.getByRole("button", {
      name: "Group settings",
      exact: true,
    });
    const bounds = await settings.boundingBox();
    expect(bounds?.y).toBeGreaterThanOrEqual(72);
    expect((bounds?.y ?? 0) + (bounds?.height ?? 0)).toBeLessThanOrEqual(700);
    await settings.click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await page.goBack();
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBe(previousScroll);
    await navigation
      .getByRole("button", { name: "Expenses", exact: true })
      .click();
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      await page.emulateMedia({ media: "print" });
      await expect(navigation).toBeHidden();
      await expect(page.locator(".app-header")).toBeHidden();
      await expect(page.locator(".workspace-sidebar")).toBeHidden();
      await expect(page.locator(".group-switch-trigger")).toBeHidden();
      await expect(
        page.getByRole("heading", { name: "Autumn in Kyoto · 京都秋旅" }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Expenses", exact: true }),
      ).toHaveCSS("color", "rgb(0, 0, 0)");
      await expect(
        page.getByRole("button", { name: "Dinner at the market", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", {
          name: "View amount and exchange rate for Dinner at the market",
        }),
      ).toBeVisible();
      await expect(page.locator(".expense-toolbar")).toBeHidden();
      await page.emulateMedia({ media: "screen" });
    }
  });
}

test("read-only share keeps viewing available without edit controls", async ({
  page,
}) => {
  const trip = exampleTrip();
  trip.name = "A shared trip with a long name ".repeat(4);
  trip.expenses[0].description = "A long shared expense description ".repeat(4);
  await mockWorkspace(page, trip);
  await page.route("**/api/share/interface-readonly", (route) =>
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
  await page.goto("/share/interface-readonly");
  await expect(
    page.getByRole("heading", { name: "Complete expense history" }),
  ).toBeVisible();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await expectNoOverflow(page);
    await accessible(page);
    await expect(
      page.getByRole("button", { name: "Add expense", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Record payment", exact: true }),
    ).toHaveCount(0);
  }
});

test("long names, multiple currencies, editor and archived permissions reflow", async ({
  page,
}) => {
  const trip = exampleTrip();
  trip.name = "A very long group name ".repeat(5);
  trip.participants[0].name = "Alexandria-with-a-very-long-name";
  trip.expenses[0].description =
    "A long expense description that still needs to be readable ".repeat(3);
  trip.archivedAt = "2026-10-05T00:00:00Z";
  await mockWorkspace(page, trip, "editor");
  await page.goto("/?trip=interface-trip&view=expenses");
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await expectNoOverflow(page);
    await accessible(page);
    await expect(
      page.getByRole("button", { name: "Add expense", exact: true }),
    ).toHaveCount(width <= 680 ? 1 : 0);
    if (width <= 680)
      await expect(
        page.getByRole("button", { name: "Add expense", exact: true }),
      ).toBeDisabled();
  }
});
