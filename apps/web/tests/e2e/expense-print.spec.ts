import { expect, test } from "@playwright/test";
import { mockWorkspace } from "./interface-fixtures.js";

for (const colorScheme of ["light", "dark"] as const) {
  for (const width of [390, 1440]) {
    test(`${colorScheme} ${width}px print hides an open row menu`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.emulateMedia({ colorScheme });
      await mockWorkspace(page);
      await page.goto("/?trip=interface-trip&view=expenses");
      const trigger = page.getByRole("button", {
        name: "More actions for Dinner at the market",
      });
      await trigger.click();
      const menu = page.getByRole("menu");
      await expect(menu).toBeVisible();
      await expect(menu.getByRole("menuitem")).toHaveCount(4);
      // The menu is portaled outside the row and its action cell.
      await expect(page.locator(".expenses-page [role=menu]")).toHaveCount(0);
      await page.emulateMedia({ media: "print" });
      await expect(menu).toBeHidden();
      await expect(trigger).toBeHidden();
      await expect(
        page.getByRole("button", { name: "Dinner at the market", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", {
          name: "View amount and exchange rate for Dinner at the market",
        }),
      ).toBeVisible();
      await page.emulateMedia({ media: "screen" });
      await expect(trigger).toBeVisible();
      await expect(menu).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(menu).toBeHidden();
      await expect(trigger).toBeFocused();
    });
  }

  test(`${colorScheme} print group spans exclude the action column`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 844 });
    await page.emulateMedia({ colorScheme });
    await mockWorkspace(page);
    await page.goto("/?trip=interface-trip&view=expenses");
    for (const grouping of ["date", "payer", "none"]) {
      await page
        .getByRole("combobox", { name: "Group by" })
        .selectOption(grouping);
      const headers = page.getByRole("columnheader");
      const screenColumns = await headers.count();
      const groupHeaders = page.locator(".expense-group-row th");
      if (grouping === "none") {
        await expect(groupHeaders).toHaveCount(0);
      } else {
        expect(await groupHeaders.count()).toBeGreaterThan(0);
        for (const header of await groupHeaders.all()) {
          await expect(header).toHaveAttribute(
            "colspan",
            String(screenColumns),
          );
        }
      }
      await page.emulateMedia({ media: "print" });
      await expect(headers).toHaveCount(screenColumns - 1);
      for (const header of await groupHeaders.all()) {
        await expect(header).toHaveAttribute(
          "colspan",
          String(screenColumns - 1),
        );
      }
      // The last data cell must reach the table edge, with no anonymous column.
      const table = await page.locator(".expense-table").boundingBox();
      const amount = await page
        .locator(".expense-amount-cell")
        .first()
        .boundingBox();
      expect(table).not.toBeNull();
      expect(amount).not.toBeNull();
      if (table && amount) {
        expect(
          Math.abs(table.x + table.width - amount.x - amount.width),
        ).toBeLessThan(1);
      }
      await page.emulateMedia({ media: "screen" });
      await expect(headers).toHaveCount(screenColumns);
      for (const header of await groupHeaders.all()) {
        await expect(header).toHaveAttribute("colspan", String(screenColumns));
      }
    }
  });
}
