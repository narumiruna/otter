import { randomUUID } from "node:crypto";
import type { TripPayload } from "@narumitw/otter-contracts";
import { expect, test } from "@playwright/test";

test("row actions duplicate, edit, review a stale delete, and persist confirmed deletion", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    locale: "en",
    extraHTTPHeaders: { "X-Forwarded-For": "198.18.10.8" },
  });
  try {
    const suffix = randomUUID().slice(0, 8);
    expect(
      (
        await context.request.post("/api/auth/register", {
          data: {
            username: `row-${suffix}`,
            name: "Row Owner",
            password: "password123",
          },
        })
      ).status(),
    ).toBe(201);
    const created = await context.request.post("/api/trips", {
      data: { name: `Row actions ${suffix}`, baseCurrency: "TWD" },
    });
    expect(created.status()).toBe(201);
    const initial = (await created.json()) as TripPayload;
    const root = `/api/trips/${initial.trip.id}`;
    const originalData = {
      description: "Original dinner",
      amount: "300",
      currency: "TWD",
      expenseDate: "2020-01-01",
      paidById: initial.trip.participants[0].id,
      participantIds: [initial.trip.participants[0].id],
    };
    const added = await context.request.post(`${root}/expenses`, {
      data: originalData,
    });
    expect(added.status()).toBe(201);
    const original = ((await added.json()) as TripPayload).trip.expenses[0];
    const page = await context.newPage();
    await page.addInitScript(() =>
      window.localStorage.setItem("otter.locale", "en"),
    );
    await page.goto(`/?trip=${initial.trip.id}&view=expenses`);
    await page
      .getByRole("button", { name: "More actions for Original dinner" })
      .click();
    await page.getByRole("menuitem", { name: "Copy as new expense" }).click();
    await expect(
      page.getByRole("heading", { name: "Copy as new expense" }),
    ).toBeVisible();
    await expect(page.getByLabel("Date", { exact: true })).not.toHaveValue(
      "2020-01-01",
    );
    await page.getByLabel("Description", { exact: true }).fill("Copied dinner");
    const saved = page.waitForResponse(
      (response) =>
        response.url().endsWith(`${root}/expenses`) &&
        response.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: "Record expense", exact: true })
      .click();
    expect((await saved).status()).toBe(201);
    const copied = (await (
      await context.request.get(root)
    ).json()) as TripPayload;
    expect(copied.trip.expenses).toHaveLength(2);
    expect(
      copied.trip.expenses.find((expense) => expense.id === original.id),
    ).toEqual(original);
    const copy = copied.trip.expenses.find(
      (expense) => expense.description === "Copied dinner",
    );
    expect(copy).toBeDefined();

    await page
      .getByRole("button", { name: "More actions for Copied dinner" })
      .click();
    await page.getByRole("menuitem", { name: "Edit expense" }).click();
    await page.getByLabel("Description", { exact: true }).fill("Edited copy");
    await page
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "More actions for Edited copy" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "More actions for Edited copy" })
      .click();
    await page.getByRole("menuitem", { name: "Delete expense" }).click();
    const dialog = page.getByRole("dialog", { name: "Delete this expense?" });
    await expect(dialog).toBeVisible();
    const beforeConflict = (await (
      await context.request.get(root)
    ).json()) as TripPayload;
    const currentCopy = beforeConflict.trip.expenses.find(
      (expense) => expense.id === copy?.id,
    );
    expect(currentCopy).toBeDefined();
    const modified = await context.request.patch(
      `${root}/expenses/${copy?.id}`,
      {
        headers: { "If-Match": `"${currentCopy?.version}"` },
        data: {
          ...originalData,
          description: "Changed elsewhere",
          amount: "450",
        },
      },
    );
    expect(modified.status()).toBe(200);
    const stale = page.waitForResponse(
      (response) =>
        response.url().endsWith(`/expenses/${copy?.id}`) &&
        response.request().method() === "DELETE",
    );
    await dialog.getByRole("button", { name: "Delete “Edited copy”" }).click();
    expect((await stale).status()).toBe(412);
    await dialog.getByRole("button", { name: "Review latest expense" }).click();
    await expect(
      dialog.getByText("Changed elsewhere", { exact: true }),
    ).toBeVisible();
    await dialog
      .getByRole("button", {
        name: "Reviewed latest version; keep my draft and continue editing",
      })
      .click();
    const deleted = page.waitForResponse(
      (response) =>
        response.url().endsWith(`/expenses/${copy?.id}`) &&
        response.request().method() === "DELETE",
    );
    await dialog.getByRole("button", { name: "Delete “Edited copy”" }).click();
    expect((await deleted).status()).toBe(200);
    await expect(
      page.getByRole("button", { name: "More actions for Original dinner" }),
    ).toBeFocused();
    await page.reload();
    const final = (await (
      await context.request.get(root)
    ).json()) as TripPayload;
    expect(final.trip.expenses).toEqual([original]);
    await page
      .getByRole("button", { name: "More actions for Original dinner" })
      .click();
    await page.getByRole("menuitem", { name: "Delete expense" }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Delete “Original dinner”" })
      .click();
    await expect(
      page.getByRole("heading", { name: "No expenses yet" }),
    ).toBeVisible();
    await expect(page.locator("#expenses-heading")).toBeFocused();
    expect(
      ((await (await context.request.get(root)).json()) as TripPayload).trip
        .expenses,
    ).toHaveLength(0);
  } finally {
    await context.close();
  }
});
