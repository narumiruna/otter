import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { expectNoOverflow } from "./layout-assertions.js";

for (const colorScheme of ["light", "dark"] as const) {
  for (const locale of ["en", "zh-TW"] as const) {
    test(`${locale} ${colorScheme} authentication layout stays usable`, async ({
      page,
    }) => {
      await page.addInitScript((language) => {
        localStorage.setItem("otter.locale", language);
      }, locale);
      await page.route("**/api/**", async (route) => {
        const path = new URL(route.request().url()).pathname;
        if (path === "/api/config") {
          await route.fulfill({ json: { devLoginCredentials: null } });
        } else if (path === "/api/me") {
          await route.fulfill({ json: { user: null } });
        } else {
          throw new Error(`Unexpected API request: ${path}`);
        }
      });
      await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
      await page.setViewportSize({ width: 1366, height: 768 });
      await page.goto("/");
      await expect(page.locator("#login-username")).toBeVisible();
      await expect(page.locator("#auth-language")).toHaveValue(locale);
      await page.evaluate(() => document.fonts.ready);
      const card = await page.locator(".auth-card").boundingBox();
      expect(card).not.toBeNull();
      expect((card?.y ?? 0) + (card?.height ?? 0)).toBeLessThan(768);
      await expect(page.locator(".auth-example")).toHaveCount(0);

      for (const width of [320, 375, 768, 1024, 1366]) {
        await page.setViewportSize({ width, height: 768 });
        await expectNoOverflow(page);
        const accessibility = await new AxeBuilder({ page }).analyze();
        expect(accessibility.violations).toEqual([]);
        for (const control of await page
          .locator(".auth-card input, .auth-card button, .auth-card select")
          .all()) {
          const bounds = await control.boundingBox();
          expect(bounds?.height).toBeGreaterThanOrEqual(44);
        }
      }
      await page.locator(".auth-switch").click();
      await expect(page.locator("#register-username")).toBeVisible();
      await expectNoOverflow(page);
      const accessibility = await new AxeBuilder({ page }).analyze();
      expect(accessibility.violations).toEqual([]);
      await page.setViewportSize({ width: 375, height: 812 });
      await page.evaluate(() => {
        document.documentElement.style.fontSize = "200%";
      });
      await expectNoOverflow(page);
    });
  }
}
