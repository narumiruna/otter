import { expect, test } from "@playwright/test";
import {
  accessible,
  exampleTrip,
  mockWorkspace,
} from "./interface-fixtures.js";
import { expectNoOverflow } from "./layout-assertions.js";

for (const role of ["owner", "editor"] as const) {
  for (const archived of [false, true]) {
    test(`${role} can clear browser defaults with archived=${archived} while offline`, async ({
      page,
      context,
    }) => {
      const trip = exampleTrip();
      if (archived) trip.archivedAt = "2026-10-10";
      await page.setViewportSize({ width: archived ? 390 : 1280, height: 844 });
      await mockWorkspace(page, trip, role);
      const key = `otter.personal.v1:owner:${trip.id}`;
      const defaults = {
        currency: "USD",
        participantIds: ["b"],
        splitMode: "equal",
        splitValues: {},
      };
      await page.addInitScript(
        ({ key, defaults }) => {
          localStorage.setItem(
            key,
            JSON.stringify({ version: 1, participantId: "b", defaults }),
          );
          localStorage.setItem("otter.personal.v1:other:untouched", "keep");
          localStorage.setItem("unrelated", "keep");
        },
        { key, defaults },
      );
      const mutations: string[] = [];
      page.on("request", (request) => {
        if (request.method() !== "GET" && request.url().includes("/api/"))
          mutations.push(request.url());
      });
      await page.goto(`/?trip=${trip.id}`);
      await expect(
        page.getByRole("region", { name: "Group expense summary" }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          (key) => JSON.parse(localStorage.getItem(key) ?? "null"),
          key,
        ),
      ).toEqual({ version: 1, defaults });
      await expect(
        page.getByRole("button", { name: "Alex's account menu" }),
      ).toBeVisible();
      await context.setOffline(true);
      await page
        .getByRole("button", { name: "Group settings", exact: true })
        .click();
      // Mobile settings show all sections; only desktop uses section navigation.
      if ((page.viewportSize()?.width ?? 0) > 680) {
        await page
          .getByRole("link", {
            name: "Expense defaults in this browser",
            exact: true,
          })
          .click();
      }
      const settings = page.getByRole("region", {
        name: "Expense defaults in this browser",
      });
      await settings
        .getByRole("button", { name: "Clear expense defaults for this group" })
        .click();
      await expect(settings.getByRole("status")).toHaveText(
        "Expense defaults cleared for this group.",
      );
      expect(
        await page.evaluate((key) => localStorage.getItem(key), key),
      ).toBeNull();
      expect(
        await page.evaluate(() => [
          localStorage.getItem("otter.personal.v1:other:untouched"),
          localStorage.getItem("unrelated"),
        ]),
      ).toEqual(["keep", "keep"]);
      expect(mutations).toEqual([]);
      await accessible(page);
      await expectNoOverflow(page);
    });
  }
}
