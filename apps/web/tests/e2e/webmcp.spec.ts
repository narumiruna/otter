import type { TripPayload } from "@narumitw/otter-contracts";
import { expect, test } from "@playwright/test";

// Chrome 153 exposes document.modelContext with the testing flag enabled.
// Its executeTool currently accepts JSON text rather than the documented object.
test.use({
  launchOptions: {
    args: ["--enable-features=WebMCP,WebMCPTesting", "--enable-webmcp-testing"],
  },
});

async function browserTools(page: import("@playwright/test").Page) {
  return page.evaluate(async () => {
    const context = Reflect.get(document, "modelContext") as
      | {
          getTools: () => Promise<{ name: string }[]>;
        }
      | undefined;
    if (!context) return null;
    return (await context.getTools()).map((tool) => tool.name);
  });
}

async function runTool(page: import("@playwright/test").Page, name: string) {
  return page.evaluate(async (toolName) => {
    const context = Reflect.get(document, "modelContext") as {
      getTools: () => Promise<{ name: string }[]>;
      executeTool: (tool: { name: string }, input: string) => Promise<string>;
    };
    const tool = (await context.getTools()).find(
      (item) => item.name === toolName,
    );
    if (!tool) throw new Error(`Tool not found: ${toolName}`);
    return JSON.parse(await context.executeTool(tool, "{}"));
  }, name);
}

test("WebMCP reads only the selected group and unregisters on switch and logout", async ({
  page,
}) => {
  await page.goto("/");
  await expect(browserTools(page)).resolves.toEqual([]);
  await page
    .locator("#login-form")
    .getByRole("button", { name: "登入", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "東京賞櫻五日" }),
  ).toBeVisible();
  await expect
    .poll(() => browserTools(page))
    .toEqual([
      expect.stringMatching(/^trip_balances_\d+$/),
      expect.stringMatching(/^trip_settlements_\d+$/),
    ]);
  const names = await browserTools(page);
  if (!names) throw new Error("WebMCP is not available");

  const original = await page.evaluate(async () => {
    const context = Reflect.get(document, "modelContext") as {
      getTools: () => Promise<{ name: string }[]>;
    };
    Reflect.set(window, "oldWebMcpTool", (await context.getTools())[0]);
    return window.location.search;
  });
  expect(original).toContain("trip=trip_dev_tokyo_2026");
  const currentTrip = new URLSearchParams(original).get("trip");
  const payload = await page.evaluate(
    async (tripId) =>
      (await fetch(`/api/trips/${tripId}`)).json() as Promise<TripPayload>,
    currentTrip,
  );
  const balances = await runTool(page, names[0]);
  const settlements = await runTool(page, names[1]);
  expect(balances).toMatchObject({
    trip: payload.trip.name,
    currency: payload.trip.baseCurrency,
    unit: "minor",
    total: payload.balances.length,
  });
  expect(balances.balances).toEqual(
    payload.balances.map(({ name, amountMinor, currency }) => ({
      name,
      amountMinor,
      currency,
    })),
  );
  expect(settlements.settlements).toEqual(
    payload.settlements.map(({ fromName, toName, amountMinor, currency }) => ({
      from: fromName,
      to: toName,
      amountMinor,
      currency,
    })),
  );
  expect(settlements.total).toBe(payload.settlements.length);
  await expect(page.getByRole("heading", { name: "餘額" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "待結清" })).toBeVisible();

  await page.getByRole("button", { name: /紐約出差延長玩/ }).click();
  await expect(
    page.getByRole("heading", { name: "紐約出差延長玩" }),
  ).toBeVisible();
  await expect
    .poll(() => browserTools(page))
    .toEqual([
      expect.stringMatching(/^trip_balances_\d+$/),
      expect.stringMatching(/^trip_settlements_\d+$/),
    ]);
  const newNames = await browserTools(page);
  if (!newNames) throw new Error("WebMCP is not available");
  expect(newNames).not.toEqual(names);
  expect((await runTool(page, newNames[0])).trip).toBe("紐約出差延長玩");
  expect(
    await page.evaluate(async () => {
      const context = Reflect.get(document, "modelContext") as {
        executeTool: (tool: { name: string }, input: string) => Promise<string>;
      };
      try {
        await context.executeTool(Reflect.get(window, "oldWebMcpTool"), "{}");
        return false;
      } catch {
        return true;
      }
    }),
  ).toBe(true);

  const link = await page.evaluate(async () => {
    const response = await fetch("/api/trips/trip_dev_tokyo_2026/share-links", {
      method: "POST",
    });
    const result = await response.json();
    return result.shareLinks.find((entry: { url?: string }) => entry.url);
  });
  if (!link?.url) throw new Error("Share link was not created");
  await page.goto(link.url);
  await expect(page.getByText("唯讀分享", { exact: true })).toBeVisible();
  await expect.poll(() => browserTools(page)).toEqual([]);
  await page.evaluate(async ({ id }) => {
    await fetch(`/api/trips/trip_dev_tokyo_2026/share-links/${id}`, {
      method: "DELETE",
    });
  }, link);

  await page.goto("/device");
  await expect.poll(() => browserTools(page)).toEqual([]);
  await page.goto("/?trip=trip_dev_newyork_2026");
  await expect.poll(async () => (await browserTools(page))?.length).toBe(2);
  await page.getByRole("button", { name: /Admin.*帳號選單/ }).click();
  await page.getByRole("menuitem", { name: "登出" }).click();
  await expect(page.locator("#login-form")).toBeVisible();
  await expect.poll(() => browserTools(page)).toEqual([]);
});
