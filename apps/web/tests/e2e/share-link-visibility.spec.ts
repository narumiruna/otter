import type { TripShareLink } from "@narumitw/otter-contracts";
import { expect, type Page, test } from "@playwright/test";
import {
  accessible,
  exampleTrip,
  mockWorkspace,
} from "./interface-fixtures.js";
import { expectNoOverflow } from "./layout-assertions.js";

async function openSharing(page: Page) {
  await page
    .getByRole("navigation", { name: "Group workspace" })
    .getByRole("button", { name: "Group settings", exact: true })
    .click();
  const sharing = page.locator("#sharing-settings > details");
  // Mobile uses a collapsed disclosure, while desktop opens it by default.
  if (!(await sharing.evaluate((element) => element.hasAttribute("open"))))
    await sharing.locator("summary").first().click();
  await expect(
    page.getByRole("heading", { name: "Share links", exact: true }),
  ).toBeVisible();
}

for (const width of [320, 1440]) {
  test(`share addresses remain visible after create, navigation and reload at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const trip = exampleTrip();
    await mockWorkspace(page, trip);
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async () => {
            throw new Error("Clipboard denied");
          },
        },
      });
    });
    let links: TripShareLink[] = [];
    let reads = 0;
    const metadata = () => links.map(({ url: _url, ...link }) => link);
    const payload = () => ({
      trip,
      balances: [],
      settlements: [],
      currentUserRole: "owner",
      shareLinks: metadata(),
    });
    await page.route(`**/api/trips/${trip.id}`, async (route) => {
      await route.fulfill({ json: payload() });
    });
    await page.route(`**/api/trips/${trip.id}/share-links**`, async (route) => {
      const method = route.request().method();
      if (method === "POST") {
        const created: TripShareLink = {
          id: `link-${links.length + 1}`,
          mode: route.request().postDataJSON().mode,
          createdAt: new Date().toISOString(),
          expiresAt: null,
          revokedAt: null,
          url: `https://otter.test/share/${String(links.length + 1).repeat(43)}`,
        };
        links.push(created);
        await route.fulfill({
          json: {
            ...payload(),
            shareLinks: metadata().map((link) =>
              link.id === created.id ? created : link,
            ),
          },
        });
      } else if (method === "DELETE") {
        const id = new URL(route.request().url()).pathname.split("/").at(-1);
        links = links.map((link) =>
          link.id === id
            ? { ...link, revokedAt: new Date().toISOString(), url: undefined }
            : link,
        );
        await route.fulfill({ json: payload() });
      } else {
        reads++;
        await route.fulfill({ json: { shareLinks: links } });
      }
    });
    await page.goto(`/?trip=${trip.id}`);
    await openSharing(page);
    for (const [index, mode] of ["readonly", "anyone-edit"].entries()) {
      await page
        .getByRole("combobox", { name: /^Link permission/ })
        .selectOption(mode);
      await page
        .getByRole("button", { name: "Create share link", exact: true })
        .click();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Create share link", exact: true })
        .click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(
        page.getByLabel("Share link address", { exact: true }),
      ).toHaveCount(index + 1);
      await expect(page.getByRole("alert")).toContainText(
        "blocked automatic copying",
      );
    }
    const addresses = page.getByRole("textbox", {
      name: "Share link address",
      exact: true,
    });
    for (const [index, link] of links.entries()) {
      await expect(addresses.nth(index)).toBeVisible();
      await expect(addresses.nth(index)).toHaveValue(link.url ?? "");
      await addresses.nth(index).click();
      expect(
        await addresses
          .nth(index)
          .evaluate((input: HTMLInputElement) => input.selectionEnd),
      ).toBe(link.url?.length);
      const row = page.locator(".share-link-row").nth(index);
      await expect(
        row.getByRole("link", { name: "Open link", exact: true }),
      ).toHaveAttribute("href", link.url ?? "");
      await row.getByRole("button", { name: "Copy", exact: true }).click();
      await expect(page.getByRole("alert")).toContainText("blocked copying");
      for (const control of await row.locator("button, a, input").all()) {
        const bounds = await control.boundingBox();
        expect(bounds?.height).toBeGreaterThanOrEqual(44);
        expect(bounds?.width).toBeGreaterThanOrEqual(44);
      }
    }
    await expectNoOverflow(page);
    await accessible(page);
    await page
      .getByRole("navigation", { name: "Group workspace" })
      .getByRole("button", { name: "Expenses", exact: true })
      .click();
    await openSharing(page);
    await expect(addresses).toHaveCount(2);
    await page.reload();
    await openSharing(page);
    await expect(addresses).toHaveCount(2);
    for (const [index, link] of links.entries()) {
      await expect(addresses.nth(index)).toHaveValue(link.url ?? "");
      await expect(addresses.nth(index)).toBeVisible();
    }
    expect(reads).toBeGreaterThanOrEqual(3);
    await expectNoOverflow(page);
    for (const colorScheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme });
      const theme = page.locator(".radix-themes[data-is-root-theme='true']");
      await expect(theme).toHaveClass(new RegExp(colorScheme));
      const foreground = await theme.evaluate((element) => {
        const probe = document.createElement("span");
        probe.style.color =
          getComputedStyle(element).getPropertyValue("--gray-12");
        element.append(probe);
        const color = getComputedStyle(probe).color;
        probe.remove();
        return color;
      });
      // Wait for inherited colors before Axe disables CSS transitions.
      await expect(page.locator(".trip-heading h2")).toHaveCSS(
        "color",
        foreground,
      );
      await expect(page.locator("#more-heading")).toHaveCSS(
        "color",
        foreground,
      );
      await expect(addresses.first()).toBeVisible();
      await accessible(page);
      await page.screenshot({
        path: testInfo.outputPath(`share-links-${width}-${colorScheme}.png`),
        fullPage: true,
        animations: "disabled",
      });
    }
    await page
      .locator(".share-link-row")
      .first()
      .getByRole("button", { name: "Revoke", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Revoke link", exact: true })
      .click();
    await expect(addresses).toHaveCount(1);
    await expect(
      page
        .locator(".share-link-row")
        .first()
        .getByRole("link", { name: "Open link", exact: true }),
    ).toHaveCount(0);
    await expect(addresses).toHaveValue(links[1]?.url ?? "");
  });
}
