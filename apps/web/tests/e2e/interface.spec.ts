import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { expectNoOverflow } from "./layout-assertions.js";

async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page })
    .exclude("[data-vite-dev-id]")
    .analyze();
  expect(
    results.violations.filter(
      ({ impact }) => impact === "serious" || impact === "critical",
    ),
  ).toEqual([]);
}

for (const colorScheme of ["light", "dark"] as const) {
  test(`${colorScheme} authentication reflows and keeps forms accessible`, async ({
    page,
  }, testInfo) => {
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "登入", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("img", { name: /分帳示意/ })).toBeVisible();
    await expect(
      page.getByText("WELCOME BACK", { exact: true }),
    ).toHaveAttribute("lang", "en");
    await expectAccessible(page);
    await page.screenshot({
      path: testInfo.outputPath("auth-desktop.png"),
      fullPage: true,
    });

    for (const width of [320, 375, 768, 1440]) {
      await page.setViewportSize({ height: 900, width });
      await expectNoOverflow(page);
    }
    await page.setViewportSize({ height: 812, width: 375 });
    await page.screenshot({
      path: testInfo.outputPath("auth-mobile.png"),
      fullPage: true,
    });
    await page.getByRole("button", { name: "建立帳號" }).click();
    const registration = page.locator("#register-form");
    await expect(registration.getByLabel("使用者名稱")).toBeVisible();
    await expect(registration.getByLabel("密碼")).toBeVisible();
    await expect(registration.getByLabel("名稱")).toHaveCount(0);
    await expect(
      page.getByText("START A NEW JOURNEY", { exact: true }),
    ).toHaveAttribute("lang", "en");
    await expectAccessible(page);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    await expectNoOverflow(page);
    await page.getByRole("button", { name: "返回登入" }).click();
    await expect(
      page.getByRole("heading", { name: "登入", exact: true }),
    ).toBeVisible();
    await page.getByRole("combobox", { name: "語言" }).selectOption("en");
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await page.reload();
    await expect(page.getByRole("combobox", { name: "Language" })).toHaveValue(
      "en",
    );
    await expect(page.getByLabel("Username")).toBeVisible();
  });

  test(`${colorScheme} summary and mobile navigation remain readable and operable`, async ({
    page,
  }, testInfo) => {
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await page.goto("/");
    await page
      .locator("#login-form")
      .getByRole("button", { name: "登入", exact: true })
      .click();
    const summary = page.getByRole("region", { name: "群組帳目摘要" });
    await expect(summary).toBeVisible();
    await expect(
      page.getByRole("complementary", { name: "群組切換" }),
    ).toBeVisible();
    await expect(summary.getByText("$47,250")).toBeVisible();
    await expectAccessible(page);
    await page.setViewportSize({ height: 1080, width: 1440 });
    await page.screenshot({
      path: testInfo.outputPath("overview-desktop.png"),
      fullPage: true,
    });
    await page.setViewportSize({ height: 812, width: 375 });
    await expectNoOverflow(page);
    const navigation = page.getByRole("navigation", { name: "群組工作區" });
    for (const button of await navigation.getByRole("button").all()) {
      const bounds = await button.boundingBox();
      expect(bounds?.height).toBeGreaterThanOrEqual(44);
      expect(bounds?.width).toBeGreaterThanOrEqual(44);
    }
    await page.screenshot({
      path: testInfo.outputPath("overview-mobile.png"),
      fullPage: true,
    });
    await navigation.getByRole("button", { name: "支出", exact: true }).click();
    await page.getByRole("textbox", { name: "搜尋描述" }).fill("藥妝");
    await expect(page.getByText("顯示 1 / 8 筆支出")).toBeVisible();
    await expectAccessible(page);
    await page.screenshot({
      path: testInfo.outputPath("expenses-mobile.png"),
      fullPage: true,
    });
    await page.emulateMedia({ media: "print" });
    await expect(navigation).toBeHidden();
    await expect(page.locator(".radix-themes")).toHaveCSS(
      "background-color",
      "rgb(255, 255, 255)",
    );
    await expect(
      page.getByRole("heading", { name: "支出", exact: true }),
    ).toHaveCSS("color", "rgb(0, 0, 0)");
  });
}
