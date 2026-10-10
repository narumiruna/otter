import { expect, test } from "@playwright/test";
import { accessible, mockWorkspace } from "./interface-fixtures.js";
import { expectNoOverflow } from "./layout-assertions.js";

for (const locale of ["en", "zh-TW"] as const) {
  for (const colorScheme of ["light", "dark"] as const) {
    test(`sign-in stays accessible and visible in ${locale} ${colorScheme}`, async ({
      page,
    }, testInfo) => {
      await page.route("**/api/**", (route) =>
        route.fulfill({
          json:
            new URL(route.request().url()).pathname === "/api/me"
              ? { user: null }
              : { devLoginCredentials: null },
        }),
      );
      await page.addInitScript((locale) => {
        localStorage.setItem("otter.locale", locale);
      }, locale);
      await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
      await page.goto("/");
      const submit = page.locator("#login-form button[type='submit']");
      await expect(submit).toBeVisible();
      await expect(page.locator(".auth-example")).toHaveCount(0);
      await expect(page.locator(".auth-card-eyebrow")).toHaveCount(0);
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 844 });
        await page.evaluate(() => window.scrollTo(0, 0));
        await expectNoOverflow(page);
        await expect(submit).toBeInViewport({ ratio: 1 });
        await accessible(page);
      }
      await page.screenshot({ path: testInfo.outputPath("auth-desktop.png") });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({ path: testInfo.outputPath("auth-mobile.png") });
      await page
        .getByRole("button", {
          name: locale === "en" ? "Create account" : "建立帳號",
          exact: true,
        })
        .click();
      await expect(page.locator("#register-form")).toBeVisible();
      await expectNoOverflow(page);
      await accessible(page);
    });
  }
}

for (const colorScheme of ["light", "dark"] as const) {
  test(`overview preserves total hierarchy and reflows in ${colorScheme}`, async ({
    page,
  }, testInfo) => {
    await mockWorkspace(page);
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await page.goto("/?trip=interface-trip");
    const summary = page.getByRole("region", { name: "Group expense summary" });
    await expect(summary).toBeVisible();
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      await expectNoOverflow(page);
      const sizes = await summary
        .locator(".summary-card-value")
        .evaluateAll((elements) =>
          elements.map((element) =>
            Number.parseFloat(getComputedStyle(element).fontSize),
          ),
        );
      expect(sizes[0]).toBeGreaterThan(sizes[1]);
      expect(sizes[0]).toBeGreaterThan(sizes[2]);
      await accessible(page);
    }
    await page.screenshot({
      path: testInfo.outputPath("overview-desktop.png"),
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: testInfo.outputPath("overview-mobile.png") });
  });
}
