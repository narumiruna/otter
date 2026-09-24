import AxeBuilder from "@axe-core/playwright";
import {
  calculateBalances,
  calculateSettlements,
  type Trip,
} from "@narumitw/otter-core/settlement";
import { expect, test } from "@playwright/test";
import { expectNoOverflow } from "./layout-assertions.js";

for (const colorScheme of ["light", "dark"] as const) {
  test(`${colorScheme} expenses reflow with long group names and clear empty states`, async ({
    page,
  }, testInfo) => {
    const trip: Trip = {
      id: "hokkaido",
      name: "2026 北海道夏日自駕八日｜完整範例 Hokkaido summer road trip",
      baseCurrency: "JPY",
      createdAt: "2026-09-20T00:00:00.000Z",
      ownerId: "owner",
      participants: [
        { id: "owner-person", name: "narumi" },
        { id: "friend", name: "Alice" },
      ],
      expenses: [],
    };
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
                expenseCount: trip.expenses.length,
                participantCount: trip.participants.length,
              },
            ],
          },
        });
      } else if (path === `/api/trips/${trip.id}`) {
        await route.fulfill({
          json: {
            trip,
            balances: calculateBalances(trip),
            settlements: calculateSettlements(trip),
            exchangeRateInfo: {
              fetchedAt: "2026-09-20T00:00:00.000Z",
              provider: "BANK_OF_TAIWAN",
              rateType: "spotMid",
              source: "bank",
            },
            currentUserRole: "owner",
            collaborators: [],
            shareLinks: [],
          },
        });
      } else if (path === "/api/passkeys") {
        await route.fulfill({ json: { passkeys: [] } });
      } else if (path === "/api/auth/tokens") {
        await route.fulfill({ json: { tokens: [] } });
      } else {
        throw new Error(`Unexpected request: ${path}`);
      }
    });
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await page.goto("/?trip=hokkaido&view=expenses");
    const expenses = page.getByRole("region", { name: "支出", exact: true });
    await expect(
      expenses.getByRole("heading", { name: "還沒有支出" }),
    ).toBeVisible();
    await expect(expenses.getByRole("textbox")).toHaveCount(0);
    // Deleted expenses remain discoverable even when the current ledger is empty.
    await expect(
      expenses.getByRole("button", { name: "修改紀錄", exact: true }),
    ).toHaveCount(1);
    await expect(expenses.getByRole("button")).toHaveCount(2);

    for (const width of [320, 375, 768, 901, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await expectNoOverflow(page);
      if (width > 900) {
        const sidebar = page.getByRole("complementary", { name: "群組切換" });
        await expect(
          sidebar.getByRole("button").filter({ hasText: trip.name }),
        ).toBeVisible();
        expect(
          await sidebar.evaluate(
            (element) => element.scrollWidth <= element.clientWidth,
          ),
        ).toBe(true);
      }
      const results = await new AxeBuilder({ page }).analyze();
      expect(
        results.violations.filter(
          ({ impact }) => impact === "serious" || impact === "critical",
        ),
      ).toEqual([]);
    }
    await page.screenshot({
      path: testInfo.outputPath("expenses-desktop.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 375, height: 812 });
    await page.screenshot({
      path: testInfo.outputPath("expenses-mobile.png"),
      fullPage: true,
    });
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    await expectNoOverflow(page);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "";
    });
    await expenses.getByRole("button", { name: "記錄第一筆支出" }).click();
    await expect(page).toHaveURL(/mode=add-expense/);

    const moreDetails = page.locator(".expense-more-details > summary");
    await page.setViewportSize({ width: 320, height: 812 });
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    await expect(moreDetails).toContainText("更多資料");
    expect(
      await moreDetails.evaluate(
        (summary) => summary.scrollWidth <= summary.clientWidth,
      ),
    ).toBe(true);
    await page.evaluate(() =>
      window.localStorage.setItem("otter.locale", "en"),
    );
    await page.reload();
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    await expect(moreDetails).toContainText("More details");
    expect(
      await moreDetails.evaluate(
        (summary) => summary.scrollWidth <= summary.clientWidth,
      ),
    ).toBe(true);
    await page.evaluate(() =>
      window.localStorage.setItem("otter.locale", "zh-TW"),
    );
    await page.reload();

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
    trip.participants[0].name = "WWWWWWWWWWWWWWWWWWWW";
    await page.goto("/?trip=hokkaido&view=expenses");
    await expect(expenses.getByText("午餐", { exact: true })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "分組方式" })).toHaveValue(
      "date",
    );
    await expect(
      expenses.getByRole("heading", { name: "2026-09-20" }),
    ).toBeVisible();
    await expect(expenses.getByText("1 筆 · 合計 ¥1,200")).toBeVisible();
    expect(await expenses.getByRole("columnheader").allTextContents()).toEqual([
      "支出名稱",
      "付款人",
      "分類",
      "金額",
    ]);

    await expenses.getByRole("button", { name: "欄位" }).click();
    await page.getByRole("checkbox", { name: "付款人" }).uncheck();
    await page.getByRole("checkbox", { name: "分攤對象" }).check();
    await page.keyboard.press("Escape");
    await expect(
      expenses.getByRole("columnheader", { name: "分攤對象" }),
    ).toBeVisible();
    await expect(
      expenses.getByRole("columnheader", { name: "付款人" }),
    ).toHaveCount(0);
    const splitCell = expenses.locator(".expense-participants-cell");
    await expect(
      splitCell.locator(".expense-participant-label-value"),
    ).toHaveText("2 人");
    expect(
      await splitCell.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);

    await page.reload();
    await expect(
      expenses.getByRole("columnheader", { name: "分攤對象" }),
    ).toBeVisible();
    await expect(
      expenses.getByRole("button", { name: "「午餐」的更多操作" }),
    ).toHaveCount(0);
    await expenses.getByRole("button", { name: "午餐", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "編輯支出", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "收據", exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("上傳收據")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "刪除", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "取消", exact: true })
      .first()
      .click();

    await page.getByRole("textbox", { name: "搜尋描述" }).fill("missing");
    await expect(
      expenses.getByRole("heading", { name: "沒有符合條件的支出" }),
    ).toBeVisible();
    await expenses
      .getByRole("button", { name: "清除篩選", exact: true })
      .click();
    await expect(expenses.getByText("午餐", { exact: true })).toBeVisible();
    await expectNoOverflow(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({
      path: testInfo.outputPath("expenses-recorded-desktop.png"),
      fullPage: true,
    });
    const accountMenuTrigger = page.getByRole("button", {
      name: "narumi 的帳號選單",
    });
    const accountMenuTriggerBounds = await accountMenuTrigger.boundingBox();
    await accountMenuTrigger.click();
    const accountMenu = page.getByRole("menu", {
      name: "narumi 的帳號選單",
    });
    await expect(accountMenu).toBeVisible();
    const accountMenuBounds = await accountMenu.boundingBox();
    expect(accountMenuBounds?.width).toBeCloseTo(280, 0);
    expect(accountMenuBounds?.height).toBeLessThanOrEqual(320);
    // Radix positions its portal on a later frame after it becomes visible.
    await expect
      .poll(async () => (await accountMenu.boundingBox())?.x)
      .toBeCloseTo(
        (accountMenuTriggerBounds?.x ?? 0) +
          (accountMenuTriggerBounds?.width ?? 0) -
          (accountMenuBounds?.width ?? 0),
        0,
      );
    await expect
      .poll(async () => (await accountMenu.boundingBox())?.y)
      .toBeCloseTo(
        (accountMenuTriggerBounds?.y ?? 0) +
          (accountMenuTriggerBounds?.height ?? 0) +
          8,
        0,
      );
    await page.getByRole("menuitem", { name: "帳號設定" }).click();
    await page.getByRole("combobox", { name: "語言" }).selectOption("en");
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(
      page.getByRole("region", { name: "Expenses", exact: true }),
    ).toBeVisible();
    const accountTrigger = page.getByRole("button", {
      name: "narumi's account menu",
    });
    const accountName = accountTrigger.locator(".account-menu-trigger-name");
    for (const width of [320, 375, 901]) {
      await page.setViewportSize({ width, height: 900 });
      await expectNoOverflow(page);
      if (width <= 680) await expect(accountName).toBeHidden();
      else await expect(accountName).toBeVisible();
      const accountBounds = await accountTrigger.boundingBox();
      expect(accountBounds?.height).toBeGreaterThanOrEqual(44);
      for (const button of await page.locator(".workspace-nav button").all()) {
        const bounds = await button.boundingBox();
        expect(bounds?.width).toBeGreaterThanOrEqual(44);
        expect(bounds?.height).toBeGreaterThanOrEqual(44);
      }
    }
  });
}
