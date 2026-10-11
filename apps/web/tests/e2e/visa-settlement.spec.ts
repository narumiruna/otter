import type { Currency } from "@narumitw/otter-core/money";
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
  for (const currency of ["TWD", "USD"] as const) {
    test(`Visa settlements use selected ${currency} at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      const trip = exampleTrip();
      trip.participants = trip.participants.slice(0, 2);
      trip.expenses = [{ ...trip.expenses[0], amountMinor: 1000 }];
      await mockWorkspace(page, trip);
      const requests: unknown[] = [];
      await page.route(
        `**/api/trips/${trip.id}/visa-settlement`,
        async (route) => {
          const body = route.request().postDataJSON() as {
            enabled: boolean;
            currency: Currency;
          };
          requests.push(body);
          trip.visaSettlementEnabled = body.enabled;
          trip.visaSettlementCurrency = body.currency;
          trip.expenses[0].visaExchangeRate = {
            sourceCurrency: "JPY",
            targetCurrency: body.currency,
            date: trip.expenses[0].expenseDate,
            rate: body.currency === "TWD" ? 0.2 : 0.0065,
            fetchedAt: trip.createdAt,
          };
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
      async function openPreferences() {
        if (width > 680)
          await page
            .getByRole("link", { name: "Group preferences", exact: true })
            .click();
        else
          await page
            .locator("summary")
            .filter({ hasText: "Visa-based settlements" })
            .click();
      }
      await openPreferences();
      const control = page.getByRole("switch", {
        name: "Convert all expenses with dated Visa rates and settle in the selected currency",
      });
      await expect(control).not.toBeChecked();
      const selector = page.getByRole("combobox", {
        name: "Settlement currency",
      });
      await expect(selector).toHaveValue("JPY");
      await selector.selectOption(currency);
      await control.click();
      await expect(control).toBeChecked();
      await expect(page.getByText(`On · ${currency}`)).toBeVisible();
      await accessible(page);
      await expectNoOverflow(page);
      await page
        .locator(".workspace-nav")
        .getByRole("button", { name: "Overview", exact: true })
        .click();
      const amount = currency === "TWD" ? "NT$100" : "$3.25";
      await expect(page.locator(".settlement-list")).toContainText(amount);
      await expect(
        page.locator(".summary-card").filter({ hasText: "Outstanding" }),
      ).toContainText(amount);
      await page
        .getByRole("button", { name: "Record payment", exact: true })
        .click();
      await expect(page.getByRole("dialog")).toContainText(
        `Payment amount (${currency})`,
      );
      await page.keyboard.press("Escape");
      await page
        .locator(".workspace-nav")
        .getByRole("button", { name: "Group settings", exact: true })
        .click();
      await openPreferences();
      await expect(selector).toHaveValue(currency);
      await control.click();
      await expect(control).not.toBeChecked();
      await page
        .locator(".workspace-nav")
        .getByRole("button", { name: "Overview", exact: true })
        .click();
      await expect(page.locator(".settlement-list")).toContainText("¥500");
      expect(requests).toEqual([
        { enabled: true, currency },
        { enabled: false, currency },
      ]);
      await expectNoOverflow(page);
    });
  }
}
