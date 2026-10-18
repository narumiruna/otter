import { expect, test } from "@playwright/test";
import { languageOptions } from "../../src/client/i18n/locales.js";
import { translations } from "../../src/client/i18n/messages.js";
import {
  accessible,
  exampleTrip,
  mockWorkspace,
} from "./interface-fixtures.js";
import { expectNoOverflow } from "./layout-assertions.js";

const addedLanguages = languageOptions.filter(
  ({ locale }) => !["zh-TW", "en", "ja", "ko"].includes(locale),
);

for (const { locale, label } of addedLanguages) {
  test.describe(locale, () => {
    test.use({ locale, reducedMotion: "reduce" });
    const messages = translations[locale];
    const widths = ["de", "pl", "hi", "th"].includes(locale)
      ? [320, 375, 1280]
      : [375, 1280];

    test("detects, selects, validates, and persists the authentication language", async ({
      page,
    }) => {
      await page.route("**/api/**", async (route) => {
        const path = new URL(route.request().url()).pathname;
        if (path === "/api/config")
          await route.fulfill({ json: { devLoginCredentials: null } });
        else if (path === "/api/me")
          await route.fulfill({ json: { user: null } });
        else if (path === "/api/auth/login") {
          expect(route.request().headers()["accept-language"]).toBe(locale);
          await route.fulfill({
            status: 401,
            json: { error: "Username 或密碼錯誤" },
          });
        } else throw new Error(`Unexpected request: ${path}`);
      });
      await page.goto("/");
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      const selector = page.locator("#auth-language");
      await expect(selector.locator("option")).toHaveCount(18);
      for (const { locale: option, label } of languageOptions)
        await expect(selector.locator(`option[value="${option}"]`)).toHaveText(
          label,
        );
      await page
        .getByLabel(messages.username, { exact: true })
        .fill("draft-user");
      await page
        .getByLabel(messages.password, { exact: true })
        .fill("draft-password");
      await selector.selectOption("en");
      await selector.selectOption(locale);
      await expect(
        page.getByLabel(messages.username, { exact: true }),
      ).toHaveValue("draft-user");
      await expect(
        page.getByLabel(messages.password, { exact: true }),
      ).toHaveValue("draft-password");
      await page
        .locator("#login-form")
        .getByRole("button", { name: messages.signIn, exact: true })
        .click();
      await expect(page.getByRole("alert")).toHaveText(
        messages.incorrectUsernameOrPassword,
      );
      for (const width of widths) {
        await page.setViewportSize({ width, height: 900 });
        await expectNoOverflow(page);
        await accessible(page);
      }
      await selector.selectOption("en");
      await expect(page.getByRole("alert")).toHaveCount(0);
      await selector.selectOption(locale);
      await page
        .getByRole("button", { name: messages.createAccount, exact: true })
        .click();
      await expect(
        page.getByRole("heading", {
          name: messages.createAccount,
          exact: true,
        }),
      ).toBeVisible();
      for (const width of widths) {
        await page.setViewportSize({ width, height: 900 });
        await expectNoOverflow(page);
      }
      await page.reload();
      await expect(selector).toHaveValue(locale);
      await expect(
        page.getByRole("heading", { name: messages.signIn, exact: true }),
      ).toBeVisible();
    });

    test("keeps the localized expense workspace accessible without writes", async ({
      page,
    }, testInfo) => {
      const trip = exampleTrip();
      await mockWorkspace(page, trip, "owner", locale);
      const mutations: string[] = [];
      page.on("request", (request) => {
        if (request.url().includes("/api/") && request.method() !== "GET")
          mutations.push(`${request.method()} ${request.url()}`);
      });
      await page.goto(`/?trip=${trip.id}`);
      const navigation = page.getByRole("navigation", {
        name: messages.groupWorkspace,
      });
      for (const width of widths) {
        await page.setViewportSize({ width, height: 900 });
        await navigation
          .getByRole("button", { name: messages.overview, exact: true })
          .click();
        await expect(
          page.getByRole("region", { name: messages.groupExpenseSummary }),
        ).toBeVisible();
        await expect(page.locator("#balances-heading")).toHaveText(
          messages.balances,
        );
        await expect(page.locator("#settlement-heading")).toHaveText(
          messages.settleUp,
        );
        await expect(
          page.getByRole("table", { name: messages.memberAccounts }),
        ).toHaveCount(0);
        await expect(navigation.getByRole("button")).toHaveCount(5);
        await expectNoOverflow(page);
        await accessible(page);
        await navigation
          .getByRole("button", { name: messages.spendingAnalysis, exact: true })
          .click();
        const analysis = page.getByRole("region", {
          name: messages.spendingAnalysis,
          exact: true,
        });
        await expect(analysis).toBeVisible();
        await expect(
          analysis.getByRole("table", { name: messages.memberAccounts }),
        ).toBeVisible();
        await expectNoOverflow(page);
        await accessible(page);
        await navigation
          .getByRole("button", { name: messages.people, exact: true })
          .click();
        await expect(page.locator("#people-heading")).toHaveText(
          messages.expenseParticipants,
        );
        await expect(
          page
            .locator(".people-identity strong")
            .filter({ hasText: /^Morgan$/ }),
        ).toBeVisible();
        await expectNoOverflow(page);
        await accessible(page);
        await navigation
          .getByRole("button", { name: messages.expenses, exact: true })
          .click();
        await expect(
          page.getByRole("button", {
            name: "Dinner at the market",
            exact: true,
          }),
        ).toBeVisible();
        await expectNoOverflow(page);
        await accessible(page);
        await navigation
          .getByRole("button", { name: messages.groupSettings, exact: true })
          .click();
        await expect(page.locator("#more-heading")).toHaveText(
          messages.groupSettings,
        );
        await expectNoOverflow(page);
        await accessible(page);
      }
      await page.setViewportSize({ width: 375, height: 700 });
      const accountTrigger = page.getByRole("button", {
        name: messages.nameSAccountMenu({ name: "Alex" }),
        exact: true,
      });
      await accountTrigger.click();
      const menu = page.getByRole("menu", {
        name: messages.nameSAccountMenu({ name: "Alex" }),
        exact: true,
      });
      await expect(menu.getByRole("menuitem")).toHaveCount(3);
      const languageEntry = menu.getByRole("menuitem", {
        name: `${messages.language} ${label}`,
        exact: true,
      });
      await expect(languageEntry).toBeVisible();
      await expect(
        menu.getByRole("menuitem", { name: messages.signOut, exact: true }),
      ).toBeInViewport({ ratio: 1 });
      await page.keyboard.press("End");
      await expect(
        page.getByRole("menuitem", { name: messages.signOut, exact: true }),
      ).toBeFocused();
      await expect(
        page.getByRole("menuitem", { name: messages.signOut, exact: true }),
      ).toBeInViewport();
      await page.keyboard.press("ArrowUp");
      await expect(languageEntry).toBeFocused();
      await page.keyboard.press("Enter");
      const languageDialog = page.getByRole("dialog", {
        name: messages.language,
        exact: true,
      });
      await expect(languageDialog).toBeVisible();
      await expect(menu).toHaveCount(0);
      for (const { locale: option, label: nativeLabel } of languageOptions) {
        const button = languageDialog.getByRole("button", {
          name: nativeLabel,
          exact: true,
        });
        await expect(button).toHaveAttribute("lang", option);
        await expect(button).toHaveAttribute(
          "aria-pressed",
          String(option === locale),
        );
      }
      const currentLanguage = languageDialog.getByRole("button", {
        name: label,
        exact: true,
      });
      await expect(currentLanguage).toBeFocused();
      await expect(currentLanguage).toBeInViewport({ ratio: 1 });
      await expectNoOverflow(page);
      await accessible(page);
      await languageDialog
        .getByRole("button", { name: messages.cancel, exact: true })
        .click();
      await expect(languageDialog).toHaveCount(0);
      await expect(accountTrigger).toBeFocused();
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Home");
      await expect(
        page.getByRole("menuitem", {
          name: messages.accountSettings,
          exact: true,
        }),
      ).toBeFocused();
      await expect(
        page.getByRole("menuitem", {
          name: messages.accountSettings,
          exact: true,
        }),
      ).toBeInViewport();
      await page.keyboard.press("Enter");
      await expect(page.locator("#account-settings-heading")).toHaveText(
        messages.accountSettings,
      );
      const selector = page.getByRole("combobox", {
        name: messages.language,
        exact: true,
      });
      await expect(selector).toHaveValue(locale);
      await selector.selectOption("en");
      await page
        .getByRole("combobox", { name: "Language", exact: true })
        .selectOption(locale);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expectNoOverflow(page);
      await accessible(page);
      if (["hi", "th", "vi"].includes(locale)) {
        await page.setViewportSize({ width: 375, height: 900 });
        for (const colorScheme of ["light", "dark"] as const) {
          await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
          const theme = page.locator(
            ".radix-themes[data-is-root-theme='true']",
          );
          await expect(theme).toHaveClass(new RegExp(colorScheme));
          const panelBackground = await theme.evaluate((element) => {
            const probe = document.createElement("span");
            probe.style.backgroundColor = getComputedStyle(
              element,
            ).getPropertyValue("--color-panel-solid");
            element.append(probe);
            const background = getComputedStyle(probe).backgroundColor;
            probe.remove();
            return background;
          });
          await expect(
            page.locator(".appearance-mode-option").last(),
          ).toHaveCSS("background-color", panelBackground);
          await expectNoOverflow(page);
          await accessible(page);
          await page.screenshot({
            path: testInfo.outputPath(`${locale}-${colorScheme}.png`),
            fullPage: true,
          });
        }
      }
      await page.reload();
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.locator("#account-settings-heading")).toHaveText(
        messages.accountSettings,
      );
      await page
        .getByRole("button", { name: messages.backToGroups, exact: true })
        .click();
      await expect(navigation).toBeVisible();
      expect(mutations).toEqual([]);
    });
  });
}

test("Tagalog browser preferences select the canonical Filipino catalog", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ baseURL, locale: "tl-PH" });
  try {
    const page = await context.newPage();
    await page.route("**/api/config", (route) =>
      route.fulfill({ json: { devLoginCredentials: null } }),
    );
    await page.route("**/api/me", (route) =>
      route.fulfill({ json: { user: null } }),
    );
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "fil");
    await expect(page.locator("#auth-language")).toHaveValue("fil");
  } finally {
    await context.close();
  }
});
