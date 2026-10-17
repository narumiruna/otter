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

for (const viewport of [
  { width: 1280, height: 900 },
  { width: 390, height: 844 },
]) {
  test(`remembered defaults and foreign expense copy without identity at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const trip = exampleTrip();
    await mockWorkspace(page, trip, "editor");
    const writes: Record<string, unknown>[] = [];
    await page.route(`**/api/trips/${trip.id}/expenses`, async (route) => {
      if (route.request().method() !== "POST")
        throw new Error("Unexpected expense request");
      const body = route.request().postDataJSON();
      writes.push(body);
      const id = "copied-expense";
      trip.expenses.push({
        id,
        description: body.description,
        amountMinor: 4250,
        currency: "USD",
        paidById: body.paidById,
        participantIds: body.participantIds,
        expenseDate: body.expenseDate,
        createdAt: new Date().toISOString(),
        exchangeRate: {
          baseCurrency: "JPY",
          source: "custom",
          rateToBase: 160,
        },
      });
      await route.fulfill({
        status: 201,
        json: {
          trip,
          createdExpenseId: id,
          currentUserRole: "editor",
          balances: calculateBalances(trip),
          settlements: calculateSettlements(trip),
        },
      });
    });
    await page.goto(`/?trip=${trip.id}`);
    await expect(page.getByRole("region", { name: "My account" })).toHaveCount(
      0,
    );
    await expect(page.getByLabel("Who am I")).toHaveCount(0);
    await accessible(page);
    await expectNoOverflow(page);
    await page
      .getByRole("button", { name: "Add expense", exact: true })
      .first()
      .click();
    await expect(page.getByRole("combobox", { name: /^Paid by/ })).toHaveValue(
      "a",
    );
    await page.getByLabel("Amount", { exact: true }).fill("100");
    await page
      .getByRole("combobox", { name: "Currency", exact: true })
      .selectOption("USD");
    await page
      .getByRole("button", { name: "Remember currency and split settings" })
      .click();
    await expect(
      page.getByText("Currency and split settings saved for this group."),
    ).toBeVisible();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Discard draft" })
      .click();
    expect(writes).toHaveLength(0);
    await page
      .getByRole("button", { name: "Add expense", exact: true })
      .first()
      .click();
    await expect(
      page.getByRole("combobox", { name: "Currency", exact: true }),
    ).toHaveValue("USD");
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await page.getByRole("button", { name: "Expenses", exact: true }).click();
    const copy = page.getByRole("button", {
      name: "More actions for Travel booking",
      exact: true,
    });
    await copy.focus();
    await page.keyboard.press("Enter");
    await page.getByRole("menuitem", { name: "Copy as new expense" }).click();
    const heading = page.getByText("Copy as new expense", { exact: true });
    await expect(heading).toBeFocused();
    await expect(page.getByLabel("Amount", { exact: true })).toHaveValue(
      "42.5",
    );
    await expect(page.getByRole("combobox", { name: /^Paid by/ })).toHaveValue(
      "a",
    );
    const today = await page.evaluate(() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    });
    await expect(page.getByLabel("Date", { exact: true })).toHaveValue(today);
    await page
      .getByLabel("Description", { exact: true })
      .fill("Travel booking copy");
    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toContain("Discard");
      await dialog.dismiss();
    });
    await page.goBack();
    await expect(heading).toBeVisible();
    await expect(page.getByLabel("Description", { exact: true })).toHaveValue(
      "Travel booking copy",
    );
    await accessible(page);
    await expectNoOverflow(page);
    await page
      .getByRole("button", { name: "Record expense", exact: true })
      .click();
    await expect(
      page.getByRole("button", {
        name: "More actions for Travel booking",
        exact: true,
      }),
    ).toHaveCount(1);
    await expect(
      page.getByRole("button", {
        name: "More actions for Travel booking copy",
        exact: true,
      }),
    ).toBeVisible();
    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatchObject({
      expenseDate: today,
      currency: "USD",
      paidById: "a",
    });
    for (const key of [
      "id",
      "version",
      "receiptId",
      "receiptUrl",
      "exchangeRate",
      "visaExchangeRate",
      "createdAt",
    ])
      expect(writes[0]).not.toHaveProperty(key);
    expect(
      trip.expenses.find((e) => e.id === "usd")?.exchangeRate?.rateToBase,
    ).toBe(150);
    await page.reload();
    await page.getByRole("button", { name: "Overview", exact: true }).click();
    await expect(page.getByLabel("Who am I")).toHaveCount(0);
    await page
      .locator("summary")
      .filter({ hasText: "Spending analysis" })
      .first()
      .click();
    await expect(
      page.getByRole("table", { name: "Member accounts" }),
    ).toBeVisible();
  });
}
