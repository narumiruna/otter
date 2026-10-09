import { expect, test } from "@playwright/test";
import {
  accessible,
  exampleTrip,
  mockWorkspace,
} from "./interface-fixtures.js";
import { expectNoOverflow } from "./layout-assertions.js";

for (const width of [1440, 390]) {
  test(`collapsed split errors remain visible at ${width}px without mutations`, async ({
    page,
  }) => {
    await mockWorkspace(page);
    await page.setViewportSize({ width, height: 1086 });
    let mutations = 0;
    page.on("request", (request) => {
      if (request.method() !== "GET" && request.url().includes("/expenses"))
        mutations += 1;
    });
    await page.goto("/?trip=interface-trip&mode=add-expense");
    const composer = page.getByRole("region", {
      name: "Add expense",
      exact: true,
    });
    await composer
      .getByRole("textbox", { name: "Amount", exact: true })
      .fill("1000");
    await composer
      .getByRole("combobox", { name: "Split method" })
      .selectOption("amount");
    for (const id of ["a", "b", "c", "d"]) {
      await composer.locator(`input[name="splitValues.${id}"]`).fill("250");
    }
    const save = composer.getByRole("button", { name: "Record expense" });
    await expect(save).toBeEnabled();
    const split = composer.locator(".expense-split-section");
    await split.locator("summary").click();
    await composer
      .getByRole("textbox", { name: "Amount", exact: true })
      .fill("1200");
    const footer = composer.locator(".expense-composer-footer");
    const error = "Split amounts must add up to the expense amount";
    await expect(footer.getByText(error, { exact: true })).toBeVisible();
    await expect(save).toBeDisabled();
    await expect(save).toHaveAccessibleDescription(error);
    await expect(footer.getByText("Total", { exact: true })).toHaveCount(0);
    await expect(composer.locator('[aria-live="polite"]')).toHaveCount(1);
    await expect(composer.locator('[aria-live="polite"]')).toContainText(error);
    await expect(split).not.toHaveAttribute("open");
    await save.scrollIntoViewIfNeeded();
    await accessible(page);
    await expectNoOverflow(page);
    await composer
      .getByRole("textbox", { name: "Amount", exact: true })
      .fill("1000");
    await expect(save).toBeEnabled();
    await expect(footer.getByText(error, { exact: true })).toHaveCount(0);
    await expect(split).not.toHaveAttribute("open");
    expect(mutations).toBe(0);
  });
}

test("localized compact preview retains total, people and shares without mutations", async ({
  page,
}) => {
  const trip = exampleTrip();
  trip.baseCurrency = "TWD";
  await mockWorkspace(page, trip, "owner", "zh-TW");
  let mutations = 0;
  page.on("request", (request) => {
    if (request.method() !== "GET" && request.url().includes("/expenses"))
      mutations += 1;
  });
  await page.goto("/?trip=interface-trip&mode=add-expense");
  await page.getByLabel("金額", { exact: true }).fill("1000");
  const preview = page.locator(".expense-split-preview");
  await expect(preview).toContainText("總支出 $1,000");
  await expect(preview).toContainText("4 人");
  await expect(preview.locator(".expense-share").first()).toContainText("$250");
  expect(mutations).toBe(0);
});

test("mobile expense actions stay reachable while scrolling expanded sections", async ({
  page,
}) => {
  await mockWorkspace(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?trip=interface-trip&mode=add-expense");
  const composer = page.getByRole("region", {
    name: "Add expense",
    exact: true,
  });
  const footer = composer.locator(".expense-composer-footer");
  await expect(footer).toHaveCSS("position", "sticky");
  const assertActionsReachable = async () => {
    for (const name of ["Cancel", "Record expense"]) {
      const action = composer.getByRole("button", { name });
      const box = await action.boundingBox();
      if (!box) throw new Error("Missing expense action");
      expect(box.y).toBeGreaterThanOrEqual(64);
      expect(box.y + box.height).toBeLessThanOrEqual(844);
      expect(
        await action.evaluate((element) => {
          const r = element.getBoundingClientRect();
          const hit = document.elementFromPoint(
            r.x + r.width / 2,
            r.y + r.height / 2,
          );
          return hit === element || element.contains(hit);
        }),
      ).toBe(true);
    }
  };
  await assertActionsReachable();
  await composer.getByLabel("Amount", { exact: true }).fill("1000");
  await composer.getByLabel("Split method").scrollIntoViewIfNeeded();
  await assertActionsReachable();
  const photo = composer.getByLabel("Take photo");
  await photo.scrollIntoViewIfNeeded();
  const label = await photo.evaluate((element) => {
    const label = element.closest("label");
    if (!label) throw new Error("Missing photo label");
    return label.getBoundingClientRect().bottom;
  });
  const bar = await footer.boundingBox();
  if (!bar) throw new Error("Missing expense footer");
  expect(label).toBeLessThanOrEqual(bar.y);
  await assertActionsReachable();
  await expectNoOverflow(page);
});

test("desktop expense footer leaves independently scrolling sidebar actions clear", async ({
  page,
}) => {
  const trip = exampleTrip();
  await mockWorkspace(page, trip);
  await page.route("**/api/trips", async (route) => {
    await route.fulfill({
      json: {
        archivedTrips: [],
        trips: Array.from({ length: 24 }, (_, i) => ({
          id: i === 0 ? trip.id : `extra-${i}`,
          name: `Group ${i + 1}`,
          baseCurrency: trip.baseCurrency,
          createdAt: trip.createdAt,
          ownerId: trip.ownerId,
          participantCount: 4,
          expenseCount: 1,
        })),
      },
    });
  });
  await page.setViewportSize({ width: 1440, height: 800 });
  await page.goto("/?trip=interface-trip&mode=add-expense");
  const sidebar = page.locator(".workspace-sidebar");
  await expect(sidebar.locator(".trip-switcher-item")).toHaveCount(24);
  await sidebar.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  const create = sidebar.getByRole("button", {
    name: "Create group",
    exact: true,
  });
  const button = await create.boundingBox();
  const footer = await page.locator(".expense-composer-footer").boundingBox();
  if (!button || !footer) throw new Error("Missing sidebar action or footer");
  expect(button.y + button.height).toBeLessThanOrEqual(footer.y);
  expect(
    await create.evaluate((element) => {
      const r = element.getBoundingClientRect();
      return element.contains(
        document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2),
      );
    }),
  ).toBe(true);
  await create.click();
  await expect(
    page.getByRole("dialog", { name: "Create group" }),
  ).toBeVisible();
});

test("collapsed oversized receipt stays explained without submitting", async ({
  page,
}) => {
  await mockWorkspace(page);
  await page.setViewportSize({ width: 390, height: 844 });
  let mutations = 0;
  page.on("request", (request) => {
    if (request.method() !== "GET" && request.url().includes("/expenses"))
      mutations += 1;
  });
  await page.goto("/?trip=interface-trip&mode=add-expense");
  const composer = page.getByRole("region", {
    name: "Add expense",
    exact: true,
  });
  await composer.getByLabel("Description").fill("Dinner");
  await composer.getByLabel("Amount", { exact: true }).fill("1000");
  await composer.getByLabel("Upload photo").setInputFiles({
    name: "big.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
  });
  const receipt = composer.locator(".expense-receipt-section");
  await receipt.locator("summary").click();
  const footer = composer.locator(".expense-composer-footer");
  await expect(
    footer.getByText("Photos must be 5 MB or smaller"),
  ).toBeVisible();
  const save = composer.getByRole("button", { name: "Record expense" });
  await expect(save).toBeDisabled();
  await expect(save).toHaveAccessibleDescription(
    "Photos must be 5 MB or smaller",
  );
  await expect(composer.locator('[aria-live="polite"]')).toHaveCount(1);
  await receipt.locator("summary").click();
  await composer.getByRole("button", { name: "Remove photo" }).click();
  await receipt.locator("summary").click();
  await expect(save).toBeEnabled();
  await expect(footer.getByText("Photos must be 5 MB or smaller")).toHaveCount(
    0,
  );
  expect(mutations).toBe(0);
  await accessible(page);
});

for (const editor of ["existing", "queued"] as const) {
  test(`clean ${editor} mobile editor keeps actions clear of navigation`, async ({
    page,
    context,
  }) => {
    await mockWorkspace(page);
    await page.setViewportSize({ width: 390, height: 844 });
    let mutations = 0;
    page.on("request", (request) => {
      if (request.method() !== "GET" && request.url().includes("/expenses"))
        mutations += 1;
    });
    if (editor === "existing") {
      await page.goto("/?trip=interface-trip&view=expenses");
      await page
        .locator(".expense-mobile-row")
        .getByRole("button", { name: "Dinner at the market", exact: true })
        .click();
    } else {
      await page.goto("/?trip=interface-trip&mode=add-expense");
      await context.setOffline(true);
      await page.getByLabel("Description").fill("Queued lunch");
      await page.getByLabel("Amount", { exact: true }).fill("1000");
      await page.getByRole("button", { name: "Save on this device" }).click();
      await page.getByRole("button", { name: "Edit draft" }).click();
    }
    const composer = page.locator(".expense-composer");
    await expect(composer).toBeVisible();
    await expect(page.locator(".workspace-nav")).toHaveCount(0);
    await composer.getByLabel("Description").scrollIntoViewIfNeeded();
    const save = composer.getByRole("button", {
      name: editor === "existing" ? "Save changes" : "Save on this device",
    });
    await expect(save).toBeEnabled();
    for (const action of [
      save,
      composer.getByRole("button", { name: "Cancel", exact: true }),
    ]) {
      const box = await action.boundingBox();
      if (!box) throw new Error("Missing editor action");
      expect(box.y + box.height).toBeLessThanOrEqual(844);
      expect(
        await action.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          return element.contains(
            document.elementFromPoint(
              rect.x + rect.width / 2,
              rect.y + rect.height / 2,
            ),
          );
        }),
      ).toBe(true);
    }
    await composer.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(composer).toHaveCount(0);
    await expect(page.locator(".workspace-nav")).toBeVisible();
    expect(mutations).toBe(0);
    await expectNoOverflow(page);
  });
}

test("collapsed valid receipt explains disconnection in the mobile footer", async ({
  page,
  context,
}) => {
  await mockWorkspace(page);
  await page.setViewportSize({ width: 390, height: 844 });
  let mutations = 0;
  page.on("request", (request) => {
    if (request.method() !== "GET" && request.url().includes("/expenses"))
      mutations += 1;
  });
  await page.goto("/?trip=interface-trip&mode=add-expense");
  const composer = page.locator(".expense-composer");
  await composer.getByLabel("Description").fill("Dinner");
  await composer.getByLabel("Amount", { exact: true }).fill("1000");
  await composer.getByLabel("Upload photo").setInputFiles({
    name: "photo.png",
    mimeType: "image/png",
    buffer: Buffer.from("photo"),
  });
  const receipt = composer.locator(".expense-receipt-section");
  await receipt.locator("summary").click();
  await context.setOffline(true);
  const footer = composer.locator(".expense-composer-footer");
  const message =
    "Photos require a connection; offline drafts do not store photos. Remove the photo or reconnect first.";
  await expect(footer.getByText(message, { exact: true })).toBeVisible();
  const save = composer.getByRole("button", { name: "Save on this device" });
  await expect(save).toBeDisabled();
  await expect(save).toHaveAccessibleDescription(message);
  await expect(receipt).not.toHaveAttribute("open");
  await expect(composer.locator('[aria-live="polite"]')).toHaveCount(1);
  await context.setOffline(false);
  await expect(
    composer.getByRole("button", { name: "Record expense" }),
  ).toBeEnabled();
  await expect(footer.getByText(message, { exact: true })).toHaveCount(0);
  await expect(receipt).not.toHaveAttribute("open");
  expect(mutations).toBe(0);
  await expectNoOverflow(page);
});
