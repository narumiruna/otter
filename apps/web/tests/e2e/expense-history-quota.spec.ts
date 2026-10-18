import { expect, test } from "@playwright/test";
import { exampleTrip, mockWorkspace } from "./interface-fixtures.js";

const listUrl = "/?trip=interface-trip&view=expenses";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const recentWrites: number[] = [];
    let writes = 0;
    let blocked = 0;
    const record = (state: unknown, replace: boolean) => {
      const now = Date.now();
      while (recentWrites.length && now - recentWrites[0] >= 10_000)
        recentWrites.shift();
      const metadata: unknown =
        typeof state === "object" && state !== null
          ? Reflect.get(state, "otterWorkspaceHistory")
          : undefined;
      const hasPage =
        typeof metadata === "object" &&
        metadata !== null &&
        Reflect.has(metadata, "page");
      if (
        recentWrites.length >= 100 ||
        (replace &&
          hasPage &&
          document.documentElement.dataset.rejectHistoryMetadata === "true")
      ) {
        document.documentElement.dataset.historyBlocked = String(++blocked);
        throw new DOMException("History quota", "SecurityError");
      }
      recentWrites.push(now);
      document.documentElement.dataset.historyWrites = String(++writes);
    };
    const replace = history.replaceState.bind(history);
    history.replaceState = (
      state: unknown,
      unused: string,
      url?: string | URL | null,
    ) => {
      record(state, true);
      replace(state, unused, url);
    };
    const push = history.pushState.bind(history);
    history.pushState = (
      state: unknown,
      unused: string,
      url?: string | URL | null,
    ) => {
      record(state, false);
      push(state, unused, url);
    };
  });
  const trip = exampleTrip();
  const original = trip.expenses[0];
  trip.expenses = Array.from({ length: 80 }, (_, index) => ({
    ...original,
    id: `expense-${index}`,
    version: 1,
    description: `Expense ${index}`,
  }));
  await mockWorkspace(page, trip);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(listUrl);
  await expect(
    page.getByRole("region", { name: "Expenses", exact: true }),
  ).toBeVisible();
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
});

test("a scroll burst leaves history quota for edit and return", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.clock.install();
  await page.evaluate(() => {
    window.scrollTo({ top: 900, behavior: "instant" });
    for (let count = 0; count < 1000; count++)
      window.dispatchEvent(new Event("scroll"));
  });
  await page.clock.runFor(1000);
  const writes = await page.locator("html").getAttribute("data-history-writes");
  expect(Number(writes)).toBeLessThan(10);
  await page.getByRole("button", { name: "Expense 4", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Edit expense", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Back to expense list", exact: true })
    .click();
  await expect(page).toHaveURL(listUrl);
  expect(
    await page.locator("html").getAttribute("data-history-blocked"),
  ).toBeNull();
  expect(errors).toEqual([]);
});

test("a rejected metadata write does not block edit, cancel, or scroll restoration", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const row = page.getByRole("button", { name: "Expense 4", exact: true });
  await row.scrollIntoViewIfNeeded();
  const scrollY = await page.evaluate(() => window.scrollY);
  await page.evaluate(() => {
    document.documentElement.dataset.rejectHistoryMetadata = "true";
    window.dispatchEvent(new Event("scroll"));
  });
  await row.click();
  const editor = page.getByRole("region", {
    name: "Edit expense",
    exact: true,
  });
  await expect(editor).toBeVisible();
  await editor.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page).toHaveURL(listUrl);
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeCloseTo(scrollY, 0);
  await expect
    .poll(async () =>
      Number(await page.locator("html").getAttribute("data-history-blocked")),
    )
    .toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
