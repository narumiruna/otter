import AxeBuilder from "@axe-core/playwright";
import {
  calculateBalances,
  calculateSettlements,
  type Trip,
} from "@narumitw/otter-core/settlement";
import { expect, test } from "@playwright/test";
import type { TripPayload } from "../../src/client/client-support.js";
import { expectNoOverflow } from "./layout-assertions.js";

for (const colorScheme of ["light", "dark"] as const) {
  test(`${colorScheme} empty overview prioritizes people, then the first expense`, async ({
    page,
  }, testInfo) => {
    const trip: Trip = {
      id: "new-trip",
      name: "2026 大阪三重",
      baseCurrency: "JPY",
      createdAt: "2026-09-20T00:00:00.000Z",
      ownerId: "owner",
      participants: [{ id: "owner-person", name: "narumi" }],
      expenses: [],
    };
    const payload = (): TripPayload => ({
      trip,
      balances: calculateBalances(trip),
      settlements: calculateSettlements(trip),
      currentUserRole: "owner",
      collaborators: [],
      shareLinks: [],
    });
    await page.route("**/api/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === "/api/config") {
        await route.fulfill({ json: { devLoginCredentials: null } });
      } else if (path === "/api/me") {
        await route.fulfill({
          json: { user: { id: "owner", name: "narumi", username: "narumi" } },
        });
      } else if (path === "/api/trips") {
        await route.fulfill({
          json: {
            archivedTrips: [],
            trips: [
              {
                id: trip.id,
                name: trip.name,
                baseCurrency: trip.baseCurrency,
                expenseCount: 0,
                participantCount: trip.participants.length,
              },
            ],
          },
        });
      } else if (
        path === `/api/trips/${trip.id}/participants` &&
        route.request().method() === "POST"
      ) {
        trip.participants.push({
          id: "friend",
          name: route.request().postDataJSON().name,
        });
        await route.fulfill({ json: payload() });
      } else if (path === `/api/trips/${trip.id}`) {
        await route.fulfill({ json: payload() });
      } else {
        throw new Error(
          `Unexpected API request: ${route.request().method()} ${path}`,
        );
      }
    });
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/?trip=new-trip");
    const navigation = page.getByRole("navigation", { name: "群組工作區" });
    const onboarding = page.getByRole("region", { name: "先新增同行成員" });
    await expect(onboarding).toBeVisible();
    await expect(page.getByText("narumi", { exact: true })).toHaveCount(1);
    await expect(
      page.getByRole("region", { name: "群組帳目摘要" }),
    ).toHaveCount(0);
    await expect(page.getByText("目前已經打平")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "記一筆", exact: true }),
    ).toHaveCount(0);
    const bounds = await onboarding.boundingBox();
    expect(bounds).not.toBeNull();
    expect((bounds?.y ?? 0) + (bounds?.height ?? 0)).toBeLessThan(900);
    await page.screenshot({
      path: testInfo.outputPath("empty-desktop.png"),
      fullPage: true,
    });

    for (const width of [320, 375, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await expectNoOverflow(page);
      for (const button of await navigation.getByRole("button").all()) {
        const box = await button.boundingBox();
        expect(box?.width).toBeGreaterThanOrEqual(44);
        expect(box?.height).toBeGreaterThanOrEqual(44);
      }
      const accessibility = await new AxeBuilder({ page }).analyze();
      expect(
        accessibility.violations.filter(
          ({ impact }) => impact === "serious" || impact === "critical",
        ),
      ).toEqual([]);
    }
    await page.setViewportSize({ width: 375, height: 812 });
    await page.screenshot({
      path: testInfo.outputPath("empty-mobile.png"),
      fullPage: true,
    });
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    await expectNoOverflow(page);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "";
    });

    await page.getByRole("button", { name: "新增成員", exact: true }).click();
    await expect(page).toHaveURL(/view=people/);
    await expect(
      navigation.getByRole("button", { name: "記一筆", exact: true }),
    ).toHaveCount(0);
    await page.getByLabel("成員名稱").fill("Alice");
    await page.getByRole("button", { name: "新增成員", exact: true }).click();
    await expect(
      page.getByRole("list").getByText("Alice", { exact: true }),
    ).toBeVisible();
    await expect(
      navigation.getByRole("button", { name: "記一筆", exact: true }),
    ).toBeVisible();
    await navigation.getByRole("button", { name: "總覽", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "記錄第一筆共同支出" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "記一筆", exact: true }),
    ).toHaveCount(1);
    await page.getByRole("button", { name: "記一筆", exact: true }).click();
    await expect(page).toHaveURL(/mode=add-expense/);
    await expect(
      page.getByRole("button", { name: "記錄支出", exact: true }),
    ).toBeVisible();

    // Reload with recorded activity to check the compact results layout as well.
    trip.expenses.push({
      id: "lunch",
      description: "午餐",
      amountMinor: 1200,
      currency: "JPY",
      expenseDate: "2026-09-20",
      createdAt: "2026-09-20T00:00:00.000Z",
      paidById: "owner-person",
      participantIds: ["owner-person", "friend"],
    });
    await page.goto("/?trip=new-trip");
    await expect(
      page.getByRole("region", { name: "群組帳目摘要" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "記錄第一筆共同支出" }),
    ).toHaveCount(0);
    await expect(
      navigation.getByRole("button", { name: "記一筆", exact: true }),
    ).toBeVisible();
    for (const width of [320, 375, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await expectNoOverflow(page);
      const accessibility = await new AxeBuilder({ page }).analyze();
      expect(
        accessibility.violations.filter(
          ({ impact }) => impact === "serious" || impact === "critical",
        ),
      ).toEqual([]);
    }
    await page.screenshot({
      path: testInfo.outputPath("recorded-desktop.png"),
      fullPage: true,
    });
  });
}
