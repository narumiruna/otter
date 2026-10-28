import { expect, test } from "@playwright/test";
import { languageOptions } from "../../src/client/i18n/locales.js";
import { translations } from "../../src/client/i18n/messages.js";
import {
  accessible,
  exampleTrip,
  mockWorkspace,
} from "./interface-fixtures.js";
import { expectNoOverflow } from "./layout-assertions.js";

test("account actions remain visible at 200% text size on a small screen", async ({
  page,
}) => {
  const trip = exampleTrip();
  const messages = translations.pt;
  await page.setViewportSize({ width: 320, height: 568 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockWorkspace(page, trip, "owner", "pt");
  await page.goto(`/?trip=${trip.id}&view=expenses`);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  const trigger = page.getByRole("button", {
    name: messages.nameSAccountMenu({ name: "Alex" }),
  });
  await expect(page.locator(".app-version")).toBeInViewport({ ratio: 1 });
  expect(
    await page
      .locator(".app-header")
      .evaluate((element) => element.scrollWidth <= element.clientWidth),
  ).toBe(true);
  await trigger.click();
  const menu = page.getByRole("menu");
  await expect(menu.getByRole("menuitem")).toHaveCount(3);
  await expect(
    menu.getByRole("menuitem", { name: messages.signOut, exact: true }),
  ).toBeInViewport({ ratio: 1 });
  const menuBounds = await menu.boundingBox();
  expect(menuBounds).not.toBeNull();
  expect(menuBounds?.x).toBeGreaterThanOrEqual(0);
  expect((menuBounds?.x ?? 0) + (menuBounds?.width ?? 0)).toBeLessThanOrEqual(
    320,
  );
  expect(
    await menu.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  await menu
    .getByRole("menuitem", {
      name: `${messages.language} Português`,
      exact: true,
    })
    .click();
  const dialog = page.getByRole("dialog", { name: messages.language });
  await expect(
    dialog.getByRole("button", { name: "Português", exact: true }),
  ).toBeInViewport({ ratio: 1 });
  const cancel = dialog.getByRole("button", {
    name: messages.cancel,
    exact: true,
  });
  await expect(cancel).toBeInViewport({ ratio: 1 });
  expect(
    await dialog.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  await accessible(page);
  await cancel.click();
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page.locator("html")).toHaveAttribute("lang", "pt");
});

for (const colorScheme of ["light", "dark"] as const) {
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 375, height: 700 },
    { width: 1280, height: 900 },
  ]) {
    test(`${colorScheme} account menu and language dialog at ${viewport.width}×${viewport.height}`, async ({
      page,
    }, testInfo) => {
      const trip = exampleTrip();
      const messages = translations.nl;
      await page.setViewportSize(viewport);
      await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
      // The last language must be visible and focused when the dialog opens.
      await mockWorkspace(page, trip, "owner", "nl");
      await page.goto(`/?trip=${trip.id}&view=expenses`);
      const trigger = page.getByRole("button", {
        name: messages.nameSAccountMenu({ name: "Alex" }),
        exact: true,
        includeHidden: true,
      });
      await trigger.focus();
      await page.keyboard.press("ArrowDown");
      const menu = page.getByRole("menu", {
        name: messages.nameSAccountMenu({ name: "Alex" }),
        exact: true,
      });
      const items = menu.getByRole("menuitem");
      await expect(items).toHaveCount(3);
      await expect(items.nth(0)).toHaveAccessibleName(messages.accountSettings);
      await expect(items.nth(1)).toHaveAccessibleName(
        `${messages.language} Nederlands`,
      );
      await expect(items.nth(2)).toHaveAccessibleName(messages.signOut);
      await expect(items.nth(0)).toBeFocused();
      const signOut = menu.getByRole("menuitem", {
        name: messages.signOut,
        exact: true,
      });
      // Check before End or click can scroll a clipped menu item into view.
      await expect(signOut).toBeInViewport({ ratio: 1 });
      expect(
        await signOut.evaluate((element) => {
          let ancestor: Element | null = element;
          while (ancestor && ancestor !== document.body) {
            if (ancestor.scrollTop !== 0) return false;
            ancestor = ancestor.parentElement;
          }
          return true;
        }),
      ).toBe(true);
      await expectNoOverflow(page);
      if (viewport.width === 375) {
        await page.screenshot({
          path: testInfo.outputPath(`account-menu-${colorScheme}.png`),
        });
      }
      await accessible(page);
      await page.keyboard.press("End");
      await expect(signOut).toBeFocused();
      await page.keyboard.press("ArrowUp");
      await expect(items.nth(1)).toBeFocused();
      await accessible(page);
      await page.keyboard.press("Enter");

      const dialog = page.getByRole("dialog", {
        name: messages.language,
        exact: true,
      });
      await expect(dialog).toBeVisible();
      await expect(menu).toHaveCount(0);
      await expect(trigger).toHaveAttribute("aria-expanded", "false");
      await expect(dialog.locator("button[lang]")).toHaveCount(
        languageOptions.length,
      );
      for (const { locale, label } of languageOptions) {
        const button = dialog.getByRole("button", {
          name: label,
          exact: true,
        });
        await expect(button).toHaveJSProperty("tagName", "BUTTON");
        await expect(button).toHaveAttribute("lang", locale);
        await expect(button).toHaveAttribute(
          "aria-pressed",
          String(locale === "nl"),
        );
      }
      const selected = dialog.getByRole("button", {
        name: "Nederlands",
        exact: true,
      });
      await expect(selected).toBeFocused();
      await expect(selected).toBeInViewport({ ratio: 1 });
      if (viewport.width <= 375) {
        // The language list, not the page, scrolls to the current language.
        await expect
          .poll(() =>
            selected.evaluate((element) => {
              let ancestor = element.parentElement;
              while (ancestor && ancestor.getAttribute("role") !== "dialog") {
                if (
                  /auto|scroll/.test(getComputedStyle(ancestor).overflowY) &&
                  ancestor.scrollHeight > ancestor.clientHeight
                ) {
                  return ancestor.scrollTop > 0;
                }
                ancestor = ancestor.parentElement;
              }
              return false;
            }),
          )
          .toBe(true);
      }
      const cancel = dialog.getByRole("button", {
        name: messages.cancel,
        exact: true,
      });
      await expect(cancel).toBeInViewport({ ratio: 1 });
      await expectNoOverflow(page);
      if (viewport.width === 375) {
        await page.screenshot({
          path: testInfo.outputPath(`language-dialog-${colorScheme}.png`),
        });
      }
      await accessible(page);

      // Tab from the last language to Cancel without changing the language.
      await page.keyboard.press("Tab");
      await expect(cancel).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(dialog).toHaveCount(0);
      await expect(trigger).toBeFocused();
      await expect(page.locator("html")).toHaveAttribute("lang", "nl");
      expect(
        await page.evaluate(() => localStorage.getItem("otter.locale")),
      ).toBe("nl");

      await page.keyboard.press("ArrowDown");
      await expect(menu).toBeVisible();
      await page.keyboard.press("Home");
      await expect(items.nth(0)).toBeFocused();
      await page.keyboard.press("ArrowDown");
      await expect(items.nth(1)).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(dialog).toBeVisible();
      await expect(selected).toBeFocused();
      await expect(selected).toBeInViewport({ ratio: 1 });
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
      await expect(trigger).toBeFocused();
      await expect(page.locator("html")).toHaveAttribute("lang", "nl");
      expect(
        await page.evaluate(() => localStorage.getItem("otter.locale")),
      ).toBe("nl");

      await page.keyboard.press("ArrowDown");
      await expect(menu).toBeVisible();
      await page.keyboard.press("Home");
      await expect(items.nth(0)).toBeFocused();
      await page.keyboard.press("ArrowDown");
      await expect(items.nth(1)).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(dialog).toBeVisible();
      await dialog
        .getByRole("button", { name: "English", exact: true })
        .click();
      await expect(dialog).toHaveCount(0);
      const englishTrigger = page.getByRole("button", {
        name: translations.en.nameSAccountMenu({ name: "Alex" }),
        exact: true,
      });
      await expect(englishTrigger).toBeFocused();
      await expect(page.locator("html")).toHaveAttribute("lang", "en");
      // mockWorkspace seeds storage on each load, so check the saved value here.
      await expect
        .poll(() => page.evaluate(() => localStorage.getItem("otter.locale")))
        .toBe("en");
      await englishTrigger.click();
      await page
        .getByRole("menuitem", {
          name: `${translations.en.language} English`,
          exact: true,
        })
        .click();
      const englishDialog = page.getByRole("dialog", {
        name: translations.en.language,
        exact: true,
      });
      const english = englishDialog.getByRole("button", {
        name: "English",
        exact: true,
      });
      await expect(english).toHaveAttribute("aria-pressed", "true");
      await expect(english).toBeFocused();
      await expect(english).toBeInViewport({ ratio: 1 });
      await expect(
        englishDialog.getByRole("button", { name: "Nederlands", exact: true }),
      ).toHaveAttribute("aria-pressed", "false");
      await page.keyboard.press("Escape");
      await expect(englishDialog).toHaveCount(0);
      await expect(englishTrigger).toBeFocused();
      await expectNoOverflow(page);
      await accessible(page);
    });
  }
}
