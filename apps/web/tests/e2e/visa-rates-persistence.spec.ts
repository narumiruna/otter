import { parseTripPayload } from "@narumitw/otter-contracts";
import { expect, test } from "@playwright/test";
import { accessible } from "./interface-fixtures.js";
import { expectNoOverflow } from "./layout-assertions.js";

// No page.route mocks: the API writes to the isolated PostgreSQL database.
// serve-e2e.ts injects only the external Visa transport.
for (const width of [1440, 390]) {
  test(`dated Visa rates persist through JPY entry and TWD settlement at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() =>
      localStorage.setItem("otter.locale", "zh-TW"),
    );
    await page.setExtraHTTPHeaders({
      "X-Forwarded-For": width === 390 ? "198.51.100.231" : "198.51.100.230",
    });
    const registered = await page.request.post("/api/auth/register", {
      data: {
        name: "Visa owner",
        username: `visa-${width}-${Date.now()}`,
        password: "visa-test-password",
      },
    });
    expect(registered.status()).toBe(201);
    const created = await page.request.post("/api/trips", {
      data: { name: `Japan ${width}`, baseCurrency: "JPY" },
    });
    expect(created.status()).toBe(201);
    const initial = parseTripPayload(await created.json());
    const path = `/api/trips/${initial.trip.id}`;
    const owner = initial.trip.participants[0].id;
    const joined = await page.request.post(`${path}/participants`, {
      data: { name: "Bob" },
    });
    const people = parseTripPayload(await joined.json()).trip.participants.map(
      (p) => p.id,
    );
    for (const [currency, amount, expenseDate] of [
      ["JPY", "1000", "2026-07-05"],
      ["JPY", "1000", "2026-07-06"],
      ["TWD", "100", "2026-07-05"],
    ]) {
      const result = await page.request.post(`${path}/expenses`, {
        data: {
          currency,
          amount,
          expenseDate,
          description: `${currency} ${expenseDate}`,
          paidById: owner,
          participantIds: people,
        },
      });
      expect(result.status()).toBe(201);
    }
    const enabled = await page.request.patch(`${path}/visa-settlement`, {
      data: { enabled: true, currency: "TWD" },
    });
    expect(enabled.status()).toBe(200);
    const saved = parseTripPayload(await enabled.json());
    expect(saved.trip.expenses.map((e) => [e.currency, e.amountMinor])).toEqual(
      [
        ["JPY", 1000],
        ["JPY", 1000],
        ["TWD", 100],
      ],
    );
    expect(saved.trip.expenses.map((e) => e.visaExchangeRate?.rate)).toEqual([
      0.22, 0.24, 1,
    ]);
    expect(saved.trip.expenses[2].exchangeRate).toMatchObject({
      source: "visa",
      date: "2026-07-05",
      baseCurrency: "JPY",
    });
    expect(saved.settlements[0]).toMatchObject({
      amountMinor: 280,
      currency: "TWD",
    });
    await page.goto(`/?trip=${initial.trip.id}&view=overview`);
    await expect(page.locator(".settlement-list")).toContainText("280");
    await expect(page.locator(".summary-card-primary")).toContainText("2,455");
    await expect(page.locator(".summary-card-primary")).toContainText("JPY");
    await accessible(page);
    await expectNoOverflow(page);
    await page.reload();
    await expect(page.locator(".settlement-list")).toContainText("280");
    const reread = parseTripPayload(
      await (await page.request.get(path)).json(),
    );
    expect(reread.trip.expenses.map((e) => e.visaExchangeRate)).toEqual(
      saved.trip.expenses.map((e) => e.visaExchangeRate),
    );
    await page.getByRole("button", { name: "記錄付款", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "記錄結清付款" });
    await dialog.getByLabel("付款金額（TWD）").fill("280");
    await dialog.getByRole("button", { name: "確認記錄付款" }).click();
    await expect(dialog).toBeHidden();
    const paid = parseTripPayload(await (await page.request.get(path)).json());
    expect(paid.settlements).toEqual([]);
    expect(paid.trip.settlementPayments?.[0]).toMatchObject({
      currency: "TWD",
      amountMinor: 280,
    });
    await page.getByRole("button", { name: "記一筆", exact: true }).click();
    await page
      .getByLabel("描述", { exact: true })
      .fill("Unavailable dated rate");
    await page.getByLabel("金額", { exact: true }).fill("100");
    await page.locator('select[name="currency"]').selectOption("JPY");
    await page.locator('input[name="expenseDate"]').fill("1900-01-01");
    await page.getByRole("button", { name: "記錄支出", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("1900-01-01");
    await expect(page.getByLabel("描述", { exact: true })).toHaveValue(
      "Unavailable dated rate",
    );
    const rejected = parseTripPayload(
      await (await page.request.get(path)).json(),
    );
    expect(rejected.trip.expenses).toEqual(paid.trip.expenses);
    expect(rejected.trip.settlementPayments).toEqual(
      paid.trip.settlementPayments,
    );
    await expectNoOverflow(page);
  });
}
