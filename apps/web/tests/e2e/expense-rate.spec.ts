import { randomUUID } from "node:crypto";
import type { TripPayload } from "@narumitw/otter-contracts";
import { expect, test } from "@playwright/test";

test("expense rows retain the saved quote after group rates change", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ baseURL, locale: "zh-TW" });
  try {
    const suffix = randomUUID().slice(0, 8);
    expect(
      (
        await context.request.post("/api/auth/register", {
          data: {
            username: `quote-${suffix}`,
            name: "Owner",
            password: "password123",
          },
        })
      ).status(),
    ).toBe(201);
    const created = await context.request.post("/api/trips", {
      data: { name: `Quote ${suffix}`, baseCurrency: "TWD" },
    });
    expect(created.status()).toBe(201);
    const trip = (await created.json()) as TripPayload;
    const root = `/api/trips/${trip.trip.id}`;
    expect(
      (
        await context.request.patch(root, {
          data: { exchangeRates: { USD: 30 } },
        })
      ).status(),
    ).toBe(200);
    const expense = await context.request.post(`${root}/expenses`, {
      data: {
        description: "Saved quote",
        amount: "1",
        currency: "USD",
        paidById: trip.trip.participants[0].id,
        participantIds: [trip.trip.participants[0].id],
      },
    });
    expect(expense.status()).toBe(201);
    expect(
      ((await expense.json()) as TripPayload).trip.expenses[0].exchangeRate
        ?.rateToBase,
    ).toBe(30);
    expect(
      (
        await context.request.patch(root, {
          data: { exchangeRates: { USD: 50 } },
        })
      ).status(),
    ).toBe(200);
    const page = await context.newPage();
    await page.goto(`/?trip=${trip.trip.id}&view=expenses`);
    await expect(page.getByText(/1 USD = 30 TWD/)).toBeVisible();
    await expect(page.getByText(/1 USD = 30 TWD/)).toContainText("$30");
    await expect(page.getByText(/1 USD = 30 TWD/)).toContainText("無報價時間");
  } finally {
    await context.close();
  }
});
