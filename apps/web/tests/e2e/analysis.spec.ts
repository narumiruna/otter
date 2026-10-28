import {
  calculateBalances,
  calculateSettlements,
} from "@narumitw/otter-core/settlement";
import { expect, type Page, test } from "@playwright/test";
import { languageOptions } from "../../src/client/i18n/locales.js";
import { translations } from "../../src/client/i18n/messages.js";
import {
  accessible,
  exampleTrip,
  mockWorkspace,
} from "./interface-fixtures.js";
import { expectNoOverflow } from "./layout-assertions.js";

type Messages = (typeof translations)["en"];

async function expectNavigation(page: Page, messages: Messages) {
  const navigation = page.getByRole("navigation", {
    name: messages.groupWorkspace,
  });
  await expect(navigation.getByRole("button")).toHaveCount(5);
  expect(
    await navigation
      .getByRole("button")
      .evaluateAll((buttons) =>
        buttons.map((button) => button.getAttribute("aria-label")),
      ),
  ).toEqual([
    messages.overview,
    messages.expenses,
    messages.spendingAnalysis,
    messages.people,
    messages.groupSettings,
  ]);
  await expect(navigation.locator(".record-expense-button")).toHaveCount(0);
  return navigation;
}

async function expectAnalysis(page: Page, messages = translations.en) {
  const analysis = page.getByRole("region", {
    name: messages.spendingAnalysis,
    exact: true,
  });
  await expect(analysis).toBeVisible();
  await expect(
    analysis.getByRole("heading", {
      name: messages.spendingAnalysis,
      exact: true,
    }),
  ).toBeVisible();
  for (const name of [
    messages.dailySpending,
    messages.paidByPerson,
    messages.byCategory,
  ])
    await expect(
      analysis.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
  await expect(
    analysis.getByRole("table", { name: messages.memberAccounts }),
  ).toBeVisible();
  expect(
    await analysis.evaluate((element) => element.closest("details") === null),
  ).toBe(true);
  await expect(
    page.locator("summary").filter({ hasText: messages.spendingAnalysis }),
  ).toHaveCount(0);
  return analysis;
}

async function expectFloatingAction(page: Page) {
  const floating = page.locator(".record-expense-button");
  await expect(floating).toBeVisible();
  await expect(page.locator(".workspace-navigation-controls")).toHaveCSS(
    "position",
    "fixed",
  );
  const nav = await page.locator(".workspace-nav").boundingBox();
  const action = await floating.boundingBox();
  if (!nav || !action)
    throw new Error("Missing mobile navigation or add action");
  const width = page.viewportSize()?.width ?? 0;
  const height = page.viewportSize()?.height ?? 0;
  expect(action.width).toBeGreaterThanOrEqual(44);
  expect(action.height).toBeGreaterThanOrEqual(44);
  expect(action.x).toBeGreaterThanOrEqual(0);
  expect(action.x + action.width).toBeLessThanOrEqual(width);
  expect(action.x + action.width / 2).toBeGreaterThan(width / 2);
  expect(action.y + action.height).toBeLessThanOrEqual(nav.y);
  expect(nav.y + nav.height).toBeLessThanOrEqual(height);
  expect(
    await floating.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return element.contains(
        document.elementFromPoint(
          rect.x + rect.width / 2,
          rect.y + rect.height / 2,
        ),
      );
    }),
  ).toBe(true);
}

test("analysis direct route, reload and browser history keep the correct page active", async ({
  page,
}) => {
  await mockWorkspace(page);
  await page.goto(
    "/?trip=interface-trip&view=analysis&source=bookmark#analysis",
  );
  const navigation = await expectNavigation(page, translations.en);
  const analysis = await expectAnalysis(page);
  const active = navigation.getByRole("button", {
    name: "Spending analysis",
    exact: true,
  });
  await expect(active).toHaveAttribute("aria-current", "page");
  await page.reload();
  await expectAnalysis(page);
  await expect(active).toHaveAttribute("aria-current", "page");
  await navigation
    .getByRole("button", { name: "Overview", exact: true })
    .click();
  await expect(analysis).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Spending analysis", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.locator("summary").filter({ hasText: "Spending analysis" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("table", { name: "Member accounts" }),
  ).toHaveCount(0);
  const url = new URL(page.url());
  expect(url.searchParams.get("source")).toBe("bookmark");
  expect(url.hash).toBe("#analysis");
  await page.goBack();
  await expect(page).toHaveURL(/view=analysis/);
  await expectAnalysis(page);
  await page.goForward();
  await expect(analysis).toHaveCount(0);
  await expect(
    navigation.getByRole("button", { name: "Overview", exact: true }),
  ).toHaveAttribute("aria-current", "page");
});

test("analysis retains fixed chart amounts and stored foreign-currency conversion", async ({
  page,
}) => {
  await mockWorkspace(page);
  await page.goto("/?trip=interface-trip&view=analysis");
  const analysis = await expectAnalysis(page);
  await expect(analysis).toContainText("¥120,965");
  const daily = analysis
    .getByRole("heading", { name: "Daily spending", exact: true })
    .locator("..");
  for (const amount of ["¥112,490", "¥6,375", "¥2,100"])
    await expect(daily).toContainText(amount);
  const payers = analysis
    .getByRole("heading", { name: translations.en.paidByPerson, exact: true })
    .locator("..");
  for (const amount of ["¥101,715", "¥17,150", "¥2,100"])
    await expect(payers).toContainText(amount);
  const metrics = analysis.locator(".spending-metrics");
  await expect(
    metrics.getByText("Expenses", { exact: true }).locator(".."),
  ).toContainText("5");
  await expect(
    metrics.getByText("Calendar days", { exact: true }).locator(".."),
  ).toContainText("42026-10-01 to 2026-10-04");
  await expect(
    metrics.getByText("Average expense", { exact: true }).locator(".."),
  ).toContainText("¥24,193");
  await expect(
    metrics.getByText("Daily average", { exact: true }).locator(".."),
  ).toContainText("¥30,241");
  await expect(payers).toContainText("84.1% of total");
  const largest = analysis.getByRole("region", { name: "Largest expenses" });
  await expect(largest.getByRole("listitem")).toHaveCount(5);
  await expect(largest.getByRole("listitem").first()).toContainText(
    "A quiet place to stay",
  );
  await expect(largest.getByRole("listitem").first()).toContainText("¥89,640");
  const originals = analysis.getByRole("region", {
    name: "Original currency totals",
  });
  await expect(originals).toContainText("JPY4 entries¥114,590");
  await expect(originals).toContainText("USD1 entry$42.50");
  await analysis
    .getByRole("region", { name: "Member accounts" })
    .locator("summary")
    .first()
    .click();
  await expect(
    analysis
      .getByText(`${translations.en.accountExpenseTotal}: USD`, {
        exact: false,
      })
      .first(),
  ).toBeVisible();
  await expect(
    analysis.getByText("Travel booking", { exact: false }).first(),
  ).toBeVisible();
});

test("missing rates show original amounts and counts instead of incomplete converted totals", async ({
  page,
}) => {
  await mockWorkspace(page);
  const trip = exampleTrip();
  trip.exchangeRates = undefined;
  const foreign = trip.expenses.find((expense) => expense.currency === "USD");
  if (!foreign) throw new Error("Missing foreign-currency fixture expense");
  foreign.exchangeRate = undefined;
  await page.route(`**/api/trips/${trip.id}`, (route) =>
    route.fulfill({
      json: { trip, currentUserRole: "owner", balances: [], settlements: [] },
    }),
  );
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto(`/?trip=${trip.id}&view=analysis`);
  const analysis = page.getByRole("region", {
    name: "Spending analysis",
    exact: true,
  });
  await expect(
    analysis.getByText(translations.en.analysisMissingRatesHelp),
  ).toBeVisible();
  await expect(
    analysis.getByText("Average expense", { exact: true }),
  ).toHaveCount(0);
  await expect(analysis.getByText("Total ¥0", { exact: true })).toHaveCount(0);
  await expect(
    analysis.getByRole("region", { name: "Largest expenses" }),
  ).toHaveCount(0);
  await expect(
    analysis.getByRole("region", { name: "Original currency totals" }),
  ).toContainText("USD1 entry$42.50");
  await expectNoOverflow(page);
  await accessible(page);
});

test("group changes reset to Overview and history restores the correct group's analysis", async ({
  page,
}) => {
  const first = exampleTrip();
  const second = {
    ...exampleTrip(),
    id: "second-trip",
    name: "Second group",
    expenses: [],
  };
  await mockWorkspace(page, first);
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
  await page.route(`**/api/trips/${second.id}`, (route) =>
    route.fulfill({
      json: {
        trip: second,
        currentUserRole: "owner",
        balances: calculateBalances(second),
        settlements: calculateSettlements(second),
      },
    }),
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/?trip=${first.id}&view=analysis`);
  await expectAnalysis(page);
  await page
    .locator(".workspace-sidebar")
    .getByRole("button", { name: /Second group/ })
    .click();
  await expect(page).toHaveURL(/trip=second-trip/);
  await expect(page).not.toHaveURL(/view=analysis/);
  await expect(
    page.getByRole("heading", {
      name: "Record the first shared expense",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .locator(".workspace-nav")
    .getByRole("button", { name: "Spending analysis", exact: true })
    .click();
  const analysis = await expectAnalysis(page);
  await expect(analysis).not.toContainText("¥120,965");
  await page.goBack();
  await expect(analysis).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL(/trip=interface-trip.*view=analysis/);
  await expectAnalysis(page);
  await expect(analysis).toContainText("¥120,965");
});

for (const role of ["owner", "editor"] as const) {
  for (const archived of [false, true]) {
    test(`${role} analysis preserves ${archived ? "archived" : "editable"} access and add action`, async ({
      page,
    }) => {
      const trip = exampleTrip();
      if (archived) trip.archivedAt = "2026-10-05T00:00:00Z";
      await mockWorkspace(page, trip, role);
      await page.goto(`/?trip=${trip.id}&view=analysis`);
      for (const width of [1440, 320]) {
        await page.setViewportSize({ width, height: 900 });
        await expectAnalysis(page);
        await expectNavigation(page, translations.en);
        await expect(
          page.getByRole("button", { name: "Record payment", exact: true }),
        ).toHaveCount(0);
        const add = page.getByRole("button", {
          name: "Add expense",
          exact: true,
        });
        if (width === 320) {
          await expectFloatingAction(page);
          if (archived) await expect(add).toBeDisabled();
          else await expect(add).toBeEnabled();
        } else if (archived) await expect(add).toHaveCount(0);
        else await expect(add).toBeEnabled();
      }
      if (!archived) {
        await page.locator(".record-expense-button").focus();
        await page.keyboard.press("Enter");
        await expect(page).toHaveURL(/view=analysis.*mode=add-expense/);
        await expect(
          page.getByRole("region", { name: "Add expense", exact: true }),
        ).toBeVisible();
        await expect(
          page.locator(".workspace-nav, .record-expense-button"),
        ).toHaveCount(0);
        await page.getByRole("button", { name: "Cancel", exact: true }).click();
        await expectAnalysis(page);
      }
    });
  }
}

test("editable guest share supports direct analysis, reload and expense entry without leaving its share path", async ({
  page,
}) => {
  const trip = exampleTrip();
  await mockWorkspace(page, trip);
  await page.route("**/api/share/analysis-guest", (route) =>
    route.fulfill({
      json: {
        trip,
        readonly: false,
        shareMode: "anyone-edit",
        currentUserRole: "editor",
        balances: calculateBalances(trip),
        settlements: calculateSettlements(trip),
      },
    }),
  );
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/share/analysis-guest?view=analysis&source=share");
  const navigation = await expectNavigation(page, translations.en);
  await expectAnalysis(page);
  await page.reload();
  await expectAnalysis(page);
  await navigation
    .getByRole("button", { name: "Overview", exact: true })
    .click();
  await expect(
    page.getByRole("table", { name: "Member accounts" }),
  ).toHaveCount(0);
  await navigation
    .getByRole("button", { name: "Spending analysis", exact: true })
    .click();
  await expectFloatingAction(page);
  await page.locator(".record-expense-button").click();
  await expect(
    page.getByRole("region", { name: "Add expense", exact: true }),
  ).toBeVisible();
  expect(new URL(page.url()).pathname).toBe("/share/analysis-guest");
  expect(new URL(page.url()).searchParams.get("source")).toBe("share");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expectAnalysis(page);
  await accessible(page);
});

for (const activity of ["empty", "payment-only"] as const) {
  test(`${activity} group analysis shows empty charts and member accounts`, async ({
    page,
  }) => {
    const trip = exampleTrip();
    trip.expenses = [];
    trip.settlementPayments =
      activity === "empty"
        ? []
        : [
            {
              id: "payment",
              fromId: "b",
              toId: "a",
              amountMinor: 200,
              currency: "JPY",
              paidAt: "2026-10-05",
              createdAt: "2026-10-05T00:00:00Z",
            },
          ];
    await mockWorkspace(page, trip);
    await page.goto(`/?trip=${trip.id}&view=analysis`);
    const analysis = await expectAnalysis(page);
    for (const name of [
      translations.en.dailySpending,
      translations.en.paidByPerson,
      translations.en.byCategory,
    ])
      await expect(
        analysis.getByRole("heading", { name, exact: true }).locator(".."),
      ).toContainText(translations.en.noDataYet);
    const accounts = analysis.getByRole("region", { name: "Member accounts" });
    await expect(accounts.locator("tbody")).toHaveCount(4);
    if (activity === "payment-only") {
      await expect(
        accounts.locator(".member-account-summary").first(),
      ).toContainText("¥200");
      await accounts.locator("summary").first().click();
      await expect(
        accounts
          .getByText(`${translations.en.accountPaymentReceived} 2026-10-05`, {
            exact: false,
          })
          .first(),
      ).toBeVisible();
    }
    await page
      .locator(".workspace-nav")
      .getByRole("button", { name: "Overview", exact: true })
      .click();
    await expect(analysis).toHaveCount(0);
    await expect(
      page.getByRole("table", { name: "Member accounts" }),
    ).toHaveCount(0);
    if (activity === "empty")
      await expect(
        page.getByRole("heading", {
          name: "Record the first shared expense",
          exact: true,
        }),
      ).toBeVisible();
    else
      await expect(
        page.getByRole("region", { name: "Balances", exact: true }),
      ).toBeVisible();
  });
}

test("public read-only share retains its analysis disclosure and restricted payment details", async ({
  page,
}) => {
  const trip = exampleTrip();
  delete trip.settlementPayments;
  await mockWorkspace(page, trip);
  await page.route("**/api/share/analysis-readonly", (route) =>
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
  await page.goto("/share/analysis-readonly");
  await expect(
    page.locator(".workspace-nav, .record-expense-button"),
  ).toHaveCount(0);
  const disclosure = page
    .locator("details")
    .filter({ has: page.locator("summary", { hasText: "Spending analysis" }) })
    .first();
  await disclosure.locator(":scope > summary").click();
  for (const name of [
    translations.en.dailySpending,
    translations.en.paidByPerson,
    translations.en.byCategory,
  ])
    await expect(
      disclosure.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
  const accounts = disclosure.getByRole("region", { name: "Member accounts" });
  await expect(accounts.getByRole("table")).toBeVisible();
  await accounts.locator("summary").first().click();
  await expect(
    accounts.getByText(translations.en.accountDetailsUnavailable).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Add expense|Record payment/ }),
  ).toHaveCount(0);
  await accessible(page);
});

test("expense save announcement does not cover the floating action on analysis", async ({
  page,
}, testInfo) => {
  const trip = exampleTrip();
  await mockWorkspace(page, trip);
  await page.route(`**/api/trips/${trip.id}/expenses`, async (route) => {
    expect(route.request().method()).toBe("POST");
    const body = route.request().postDataJSON();
    trip.expenses.push({
      id: "new-expense",
      description: body.description,
      amountMinor: 100,
      currency: "JPY",
      paidById: body.paidById,
      participantIds: body.participantIds,
      expenseDate: body.expenseDate,
      createdAt: "2026-10-05T00:00:00Z",
    });
    await route.fulfill({
      status: 201,
      json: {
        trip,
        createdExpenseId: "new-expense",
        currentUserRole: "owner",
        balances: calculateBalances(trip),
        settlements: calculateSettlements(trip),
      },
    });
  });
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto(`/?trip=${trip.id}&view=analysis`);
  await page.locator(".record-expense-button").click();
  await page
    .getByLabel("Description", { exact: true })
    .fill("Saved from analysis");
  await page.getByLabel("Amount", { exact: true }).fill("100");
  await page
    .getByRole("button", { name: "Record expense", exact: true })
    .click();
  const toast = page.locator(".status-toast");
  await expect(toast).toHaveText(translations.en.expenseRecorded);
  await page
    .locator(".workspace-nav")
    .getByRole("button", { name: "Spending analysis", exact: true })
    .click();
  await expectAnalysis(page);
  await expect(toast).toBeVisible();
  const toastBounds = await toast.boundingBox();
  const actionBounds = await page
    .locator(".record-expense-button")
    .boundingBox();
  if (!toastBounds || !actionBounds)
    throw new Error("Missing announcement or add action");
  const overlap =
    toastBounds.x < actionBounds.x + actionBounds.width &&
    toastBounds.x + toastBounds.width > actionBounds.x &&
    toastBounds.y < actionBounds.y + actionBounds.height &&
    toastBounds.y + toastBounds.height > actionBounds.y;
  expect(overlap, "Announcement must not cover the floating add action").toBe(
    false,
  );
  await expectFloatingAction(page);
  await page.screenshot({
    path: testInfo.outputPath("analysis-save-announcement.png"),
  });
  await page.locator(".record-expense-button").click();
  await expect(
    page.getByRole("region", { name: "Add expense", exact: true }),
  ).toBeVisible();
});

for (const { locale } of languageOptions) {
  test(`${locale} analysis navigation, themes, long labels and enlarged mobile controls reflow`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(90_000);
    const messages = translations[locale];
    const trip = exampleTrip();
    trip.name = "A long group name 京都旅行 ".repeat(4);
    trip.participants[0].name = "Alexandria 長姓名 Very Long Member Name";
    trip.expenses[0].category = "Long category label ".repeat(4);
    await mockWorkspace(page, trip, "owner", locale);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/?trip=${trip.id}&view=analysis`);
    for (const colorScheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme });
      const theme = page.locator(".radix-themes[data-is-root-theme='true']");
      await expect(theme).toHaveClass(new RegExp(colorScheme));
      const foreground = await theme.evaluate((element) => {
        const probe = document.createElement("span");
        probe.style.color =
          getComputedStyle(element).getPropertyValue("--gray-12");
        element.append(probe);
        const color = getComputedStyle(probe).color;
        probe.remove();
        return color;
      });
      for (const width of [1440, 320]) {
        // Wait for the inherited title color before Axe disables transitions.
        await expect(page.locator(".trip-heading h2")).toHaveCSS(
          "color",
          foreground,
        );
        await page.setViewportSize({ width, height: 900 });
        const analysis = await expectAnalysis(page, messages);
        for (const name of [
          messages.dailySpending,
          messages.paidByPerson,
          messages.byCategory,
        ]) {
          const amounts = analysis
            .getByRole("heading", { name, exact: true })
            .locator("..")
            .locator(".tabular-nums");
          expect(await amounts.count()).toBeGreaterThan(0);
          for (const amount of await amounts.all()) {
            const dimensions = await amount.evaluate((element) => {
              const range = document.createRange();
              range.selectNodeContents(element);
              return {
                textHeight: range.getBoundingClientRect().height,
                lineHeight: Number.parseFloat(
                  getComputedStyle(element).lineHeight,
                ),
              };
            });
            expect(
              dimensions.textHeight,
              `${name} money must use one line`,
            ).toBeLessThanOrEqual(dimensions.lineHeight + 1);
          }
        }
        const navigation = await expectNavigation(page, messages);
        await expect(
          navigation.getByRole("button", {
            name: messages.spendingAnalysis,
            exact: true,
          }),
        ).toHaveAttribute("aria-current", "page");
        await expectNoOverflow(page);
        for (const button of await navigation.getByRole("button").all()) {
          const bounds = await button.boundingBox();
          if (!bounds) throw new Error("Missing navigation button");
          expect(bounds.width).toBeGreaterThanOrEqual(44);
          expect(bounds.height).toBeGreaterThanOrEqual(44);
        }
        if (width === 320) await expectFloatingAction(page);
        await accessible(page);
        await page.screenshot({
          path: testInfo.outputPath(`analysis-${width}-${colorScheme}.png`),
          fullPage: true,
          animations: "disabled",
        });
      }
    }
    // Enlarge the actual controls, including px-sized labels, rather than only the root font.
    await page
      .locator(
        ".workspace-nav button, .workspace-nav button span, .record-expense-button",
      )
      .evaluateAll((elements) => {
        const sizes = elements.map((element) =>
          Number.parseFloat(getComputedStyle(element).fontSize),
        );
        elements.forEach((element, index) => {
          if (element instanceof HTMLElement)
            element.style.fontSize = `${sizes[index] * 2}px`;
        });
      });
    await expectNoOverflow(page);
    await expectFloatingAction(page);
    await accessible(page);
    await page.screenshot({
      path: testInfo.outputPath("analysis-mobile-text-200.png"),
      fullPage: true,
    });
    const accounts = page.getByRole("region", {
      name: messages.memberAccounts,
    });
    const lastDetail = accounts.locator("summary").last();
    await lastDetail.scrollIntoViewIfNeeded();
    const detailBounds = await lastDetail.boundingBox();
    const actionBounds = await page
      .locator(".record-expense-button")
      .boundingBox();
    if (!detailBounds || !actionBounds)
      throw new Error("Missing final detail control or floating action");
    expect(detailBounds.y + detailBounds.height).toBeLessThanOrEqual(
      actionBounds.y,
    );
  });
}

test("keyboard navigation opens analysis, member details and the separate add action", async ({
  page,
}) => {
  await mockWorkspace(page);
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/?trip=interface-trip&view=expenses");
  const navigation = await expectNavigation(page, translations.en);
  await navigation
    .getByRole("button", { name: "Expenses", exact: true })
    .focus();
  await page.keyboard.press("Tab");
  await expect(
    navigation.getByRole("button", { name: "Spending analysis", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  const analysis = await expectAnalysis(page);
  const details = analysis
    .getByRole("region", { name: "Member accounts" })
    .locator("details")
    .first();
  await details.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(details).toHaveAttribute("open");
  await page.keyboard.press("Space");
  await expect(details).not.toHaveAttribute("open");
  await page.locator(".record-expense-button").focus();
  await page.keyboard.press("Tab");
  await expect(
    navigation.getByRole("button", { name: "Overview", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.locator(".record-expense-button")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("region", { name: "Add expense", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(".workspace-nav, .record-expense-button"),
  ).toHaveCount(0);
  await accessible(page);
});
