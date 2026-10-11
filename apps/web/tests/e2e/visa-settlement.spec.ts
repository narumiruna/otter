import {
  calculateBalances,
  calculateSettlements,
} from "@narumitw/otter-core/settlement";
import { expect, test } from "@playwright/test";
import {
  accessible,
  exampleTrip,
  mockWorkspace,
} from "./interface-fixtures.js";
import { expectNoOverflow } from "./layout-assertions.js";

for (const width of [1440, 390]) {
  test(`Visa setting changes settlement currency at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const trip = exampleTrip();
    trip.participants = trip.participants.slice(0, 2);
    trip.expenses = [
      {
        ...trip.expenses[0],
        amountMinor: 1000,
        visaExchangeRate: {
          sourceCurrency: "JPY",
          date: trip.expenses[0].expenseDate,
          rateToTwd: 0.2,
          fetchedAt: trip.createdAt,
        },
      },
    ];
    await mockWorkspace(page, trip);
    const requests: unknown[] = [];
    await page.route(
      `**/api/trips/${trip.id}/visa-settlement`,
      async (route) => {
        const body = route.request().postDataJSON() as { enabled: boolean };
        requests.push(body);
        trip.visaSettlementEnabled = body.enabled;
        await route.fulfill({
          json: {
            trip,
            currentUserRole: "owner",
            balances: calculateBalances(trip),
            settlements: calculateSettlements(trip),
          },
        });
      },
    );
    await page.goto(`/?trip=${trip.id}&view=more`);
    if (width > 680)
      await page
        .getByRole("link", { name: "Group preferences", exact: true })
        .click();
    else
      await page
        .locator("summary")
        .filter({ hasText: "Visa TWD settlements" })
        .click();
    const control = page.getByRole("switch", {
      name: "Convert all expenses with dated Visa rates and settle in TWD",
    });
    await expect(control).not.toBeChecked();
    await control.click();
    await expect(control).toBeChecked();
    await accessible(page);
    await expectNoOverflow(page);
    await page
      .locator(".workspace-nav")
      .getByRole("button", { name: "Overview", exact: true })
      .click();
    await expect(page.locator(".settlement-list")).toContainText("NT$100");
    await expect(
      page.locator(".summary-card").filter({ hasText: "Outstanding" }),
    ).toContainText("NT$100");
    await page
      .getByRole("button", { name: "Record payment", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toContainText(
      "Payment amount (TWD)",
    );
    await page.keyboard.press("Escape");
    await page
      .locator(".workspace-nav")
      .getByRole("button", { name: "Group settings", exact: true })
      .click();
    if (width > 680)
      await page
        .getByRole("link", { name: "Group preferences", exact: true })
        .click();
    else
      await page
        .locator("summary")
        .filter({ hasText: "Visa TWD settlements" })
        .click();
    await control.click();
    await expect(control).not.toBeChecked();
    await page
      .locator(".workspace-nav")
      .getByRole("button", { name: "Overview", exact: true })
      .click();
    await expect(page.locator(".settlement-list")).toContainText("¥500");
    expect(requests).toEqual([{ enabled: true }, { enabled: false }]);
    await expectNoOverflow(page);
  });
}
