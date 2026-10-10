import { expect, test } from "@playwright/test";
import { accessible } from "./interface-fixtures.js";
import { expectNoOverflow } from "./layout-assertions.js";

for (const colorScheme of ["light", "dark"] as const) {
  test(`${colorScheme} sign-in layout supports keyboard, validation and languages`, async ({
    page,
  }, testInfo) => {
    await page.route("**/api/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === "/api/config") {
        await route.fulfill({ json: { devLoginCredentials: null } });
      } else if (path === "/api/me") {
        await route.fulfill({ json: { user: null } });
      } else {
        throw new Error(`Unexpected request: ${path}`);
      }
    });
    await page.addInitScript(() => {
      window.localStorage.setItem("otter.locale", "en");
    });
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(page.locator(".skip-link")).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();
    await accessible(page);
    await page.locator("#main-content").blur();
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({
      path: testInfo.outputPath("auth-desktop.png"),
      fullPage: true,
    });

    for (const width of [320, 375, 768, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await expectNoOverflow(page);
    }
    await page.setViewportSize({ width: 375, height: 812 });
    await page.screenshot({
      path: testInfo.outputPath("auth-mobile.png"),
      fullPage: true,
    });
    await page.locator("#login-form button[type=submit]").click();
    await expect(page.locator("#login-username")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expect(page.locator("#login-password")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await page
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    await expect(page.locator("#register-form")).toBeVisible();
    await accessible(page);

    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    await page.setViewportSize({ width: 320, height: 812 });
    for (const locale of ["en", "zh-TW", "ja", "ko"]) {
      await page.locator("#auth-language").selectOption(locale);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expectNoOverflow(page);
      await accessible(page);
    }
  });
}
