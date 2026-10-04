import type { TripPayload } from "@narumitw/otter-contracts";
import { expect, test } from "@playwright/test";

test("owner duplicates a group into an independent empty workspace", async ({
  page,
}) => {
  await page.setExtraHTTPHeaders({ "X-Forwarded-For": "198.51.100.224" });
  await page.goto("/");
  await page
    .locator("#login-form")
    .getByRole("button", { name: "登入", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "東京賞櫻五日" }),
  ).toBeVisible();

  const sourceResponse = await page.request.get(
    "/api/trips/trip_dev_tokyo_2026",
  );
  expect(sourceResponse.ok()).toBe(true);
  const source = ((await sourceResponse.json()) as TripPayload).trip;
  expect(source.expenses.length).toBeGreaterThan(0);

  await page.getByRole("button", { name: "群組設定" }).click();
  await page.getByRole("button", { name: "複製群組" }).click();
  const dialog = page.getByRole("dialog", { name: "複製這個群組？" });
  await expect(dialog).toContainText(
    "支出、結清紀錄、協作者與分享連結不會複製",
  );
  await dialog.getByRole("button", { name: "複製群組" }).click();

  await expect(
    page.getByRole("heading", {
      name: /^東京賞櫻五日 \(copy(?: \d+)?\)$/,
    }),
  ).toBeVisible();
  const copiedId = new URL(page.url()).searchParams.get("trip");
  expect(copiedId).toBeTruthy();
  expect(copiedId).not.toBe(source.id);
  try {
    await expect(
      page.locator(".trip-switcher-item[aria-current='true']"),
    ).toContainText("東京賞櫻五日 (copy");
    const copiedResponse = await page.request.get(`/api/trips/${copiedId}`);
    expect(copiedResponse.ok()).toBe(true);
    const copied = ((await copiedResponse.json()) as TripPayload).trip;
    expect(copied.expenses).toEqual([]);
    expect(copied.settlementPayments).toEqual([]);
    expect(copied.baseCurrency).toBe(source.baseCurrency);
    expect(copied.participants.map((person) => person.name)).toEqual(
      source.participants.map((person) => person.name),
    );
    expect(
      copied.participants.some((person) =>
        source.participants.some((original) => original.id === person.id),
      ),
    ).toBe(false);
    await page.getByRole("button", { name: "支出", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "還沒有支出" }),
    ).toBeVisible();
    await page.locator('.trip-switcher-item[title="東京賞櫻五日"]').click();
    await expect(
      page.getByRole("heading", { name: "東京賞櫻五日" }),
    ).toBeVisible();
  } finally {
    // Avoid adding another fixture group each time this browser test runs.
    if (copiedId && copiedId !== source.id) {
      const deleted = await page.request.delete(`/api/trips/${copiedId}`);
      expect(deleted.ok()).toBe(true);
    }
  }
});
