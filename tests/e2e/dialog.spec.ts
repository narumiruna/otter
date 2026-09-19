import { expect, test } from "@playwright/test";
import { expectNoOverflow } from "./layout-assertions.js";

for (const colorScheme of ["light", "dark"] as const) {
  test(`${colorScheme} create-group dialog retains theme styles outside the app root`, async ({
    page,
  }, testInfo) => {
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await page.route("**/api/config", (route) =>
      route.fulfill({ json: { devLoginCredentials: null } }),
    );
    await page.route("**/api/me", (route) =>
      route.fulfill({
        json: {
          user: { id: "dialog-user", name: "Test", email: "test@example.com" },
        },
      }),
    );
    await page.route("**/api/trips", (route) =>
      route.fulfill({ json: { trips: [], archivedTrips: [] } }),
    );
    await page.goto("/");
    const trigger = page.getByRole("button", { name: "建立群組", exact: true });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "建立群組", exact: true });
    await expect(dialog).toBeVisible();
    await expect(page.locator("#app [role=dialog]")).toHaveCount(0);
    const theme = page.locator(".radix-dialog-theme");
    await expect(theme).toHaveClass(new RegExp(colorScheme));
    await expect(theme).toHaveAttribute("data-accent-color", "green");
    await expect(theme).toHaveAttribute("data-gray-color", "sage");
    await expect(theme).toHaveAttribute("data-radius", "large");
    await expect(theme).toHaveCSS("display", "contents");

    for (const width of [375, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      const styles = await dialog.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          background: style.backgroundColor,
          padding: Number.parseFloat(style.paddingTop),
          gap: Number.parseFloat(style.rowGap),
          radius: Number.parseFloat(style.borderTopLeftRadius),
        };
      });
      expect(styles.background).not.toBe("rgba(0, 0, 0, 0)");
      expect(styles.padding).toBeGreaterThan(0);
      expect(styles.gap).toBeGreaterThan(0);
      expect(styles.radius).toBeGreaterThan(0);
      await expectNoOverflow(page);
      await page.screenshot({
        path: testInfo.outputPath(`dialog-${width}.png`),
      });
    }

    await expect(dialog.getByLabel("群組名稱")).toBeFocused();
    await dialog.getByLabel("群組名稱").fill("東京五日遊");
    const submit = dialog.getByRole("button", {
      name: "建立群組",
      exact: true,
    });
    await expect(submit).toBeEnabled();
    await expect(submit).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await dialog.getByRole("button", { name: "關閉", exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });
}
