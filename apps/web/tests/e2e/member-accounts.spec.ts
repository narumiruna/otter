import {
  calculateBalances,
  calculateSettlements,
} from "@narumitw/otter-core/settlement";
import { expect, test } from "@playwright/test";
import { translations } from "../../src/client/i18n/messages.js";
import {
  accessible,
  exampleTrip,
  mockWorkspace,
} from "./interface-fixtures.js";
import { expectNoOverflow } from "./layout-assertions.js";

for (const locale of ["en", "zh-TW", "ja", "ko"] as const) {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1280, height: 900 },
    { width: 1280, height: 720 },
  ]) {
    for (const appearance of ["light", "dark"] as const) {
      test(`${locale} member accounts at ${viewport.width}x${viewport.height} in ${appearance}`, async ({
        page,
      }) => {
        const messages = translations[locale];
        await page.setViewportSize(viewport);
        await page.emulateMedia({ colorScheme: appearance });
        const trip = exampleTrip();
        trip.participants[0].name = "Narumi 長姓名測試 Very Long Member Name";
        trip.expenses[0].amountMinor = 9999999;
        trip.settlementPayments = [
          {
            id: "p",
            fromId: "b",
            toId: "a",
            amountMinor: 200,
            currency: "JPY",
            paidAt: "2026-10-05",
            createdAt: "now",
            note: "Partial payment",
          },
        ];
        await mockWorkspace(page, trip, "editor");
        await page.addInitScript(
          ({ locale }) => {
            localStorage.setItem("otter.locale", locale);
          },
          { locale },
        );
        await page.goto(`/?trip=${trip.id}`);
        await expect(page.getByLabel("Who am I")).toHaveCount(0);
        const balances = page.getByRole("region", {
          name: messages.balances,
          exact: true,
        });
        const settlements = page.getByRole("region", {
          name: messages.settleUp,
          exact: true,
        });
        await expect(balances).toBeVisible();
        await expect(settlements).toBeVisible();
        const analysis = page
          .locator("details")
          .filter({
            has: page.locator("summary", {
              hasText: messages.spendingAnalysis,
            }),
          })
          .first();
        await expect(analysis).not.toHaveAttribute("open");
        await analysis.locator(":scope > summary").click();
        const accounts = page.getByRole("region", {
          name: messages.memberAccounts,
        });
        await expect(
          accounts.getByRole("table", { name: messages.memberAccounts }),
        ).toBeVisible();
        await expect(accounts.locator("tbody")).toHaveCount(
          trip.participants.length,
        );
        for (const [index, balance] of calculateBalances(trip).entries()) {
          const cell = accounts
            .locator(".member-account-summary")
            .nth(index)
            .locator("td")
            .last();
          const value = new Intl.NumberFormat(locale, {
            style: "currency",
            currency: balance.currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(Math.abs(balance.amountMinor));
          if (balance.amountMinor) {
            await expect(cell).toContainText(value);
            await expect(balances).toContainText(value);
          } else await expect(cell).toContainText(messages.accountSettled);
        }
        const detail = accounts.locator("summary").first();
        await detail.focus();
        await page.keyboard.press("Enter");
        await expect(accounts.locator("details").first()).toHaveAttribute(
          "open",
        );
        await expect(
          accounts.getByText(`${messages.accountPayments} (JPY)`).first(),
        ).toBeVisible();
        await expect(
          accounts.getByRole("button", { name: messages.recordPayment }),
        ).toHaveCount(0);
        await accessible(page);
        await expectNoOverflow(page);
        await page.screenshot({
          path: `/tmp/otter-accounts-${locale}-${viewport.width}-${viewport.height}-${appearance}.png`,
          fullPage: true,
        });
      });
    }
  }
}

test("recording a partial payment updates both balance views without changing paid/share totals", async ({
  page,
}) => {
  const trip = exampleTrip();
  trip.settlementPayments = [];
  await mockWorkspace(page, trip, "editor");
  await page.route(
    `**/api/trips/${trip.id}/settlement-payments`,
    async (route) => {
      expect(route.request().method()).toBe("POST");
      const body = route.request().postDataJSON();
      trip.settlementPayments?.push({
        id: "new-payment",
        fromId: body.fromId,
        toId: body.toId,
        amountMinor: Number(body.amount),
        currency: body.currency,
        paidAt: body.paidAt,
        note: body.note,
        createdAt: "now",
      });
      await route.fulfill({
        json: {
          trip,
          currentUserRole: "editor",
          balances: calculateBalances(trip),
          settlements: calculateSettlements(trip),
        },
      });
    },
  );
  await page.goto(`/?trip=${trip.id}`);
  await page
    .locator("summary")
    .filter({ hasText: "Spending analysis" })
    .first()
    .click();
  const accounts = page.getByRole("region", { name: "Member accounts" });
  const totals = await accounts
    .locator(".member-account-summary")
    .evaluateAll((rows) =>
      rows.map((row) =>
        Array.from(row.querySelectorAll("td"))
          .slice(0, 2)
          .map((cell) => cell.textContent),
      ),
    );
  const before = await accounts
    .locator(".member-account-summary")
    .allTextContents();
  await page
    .getByRole("button", { name: "Record payment", exact: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Payment amount", { exact: false }).fill("100");
  await dialog
    .getByRole("button", { name: "Record payment", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect
    .poll(async () =>
      accounts.locator(".member-account-summary").allTextContents(),
    )
    .not.toEqual(before);
  expect(
    await accounts.locator(".member-account-summary").evaluateAll((rows) =>
      rows.map((row) =>
        Array.from(row.querySelectorAll("td"))
          .slice(0, 2)
          .map((cell) => cell.textContent),
      ),
    ),
  ).toEqual(totals);
  for (const [index, balance] of calculateBalances(trip).entries()) {
    if (balance.amountMinor)
      await expect(
        accounts.locator(".member-account-summary").nth(index),
      ).toContainText(
        new Intl.NumberFormat("en", {
          style: "currency",
          currency: "JPY",
          maximumFractionDigits: 0,
        }).format(Math.abs(balance.amountMinor)),
      );
  }
});
