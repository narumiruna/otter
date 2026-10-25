import { expect, type Locator, type Page, test } from "@playwright/test";
import { translations } from "../../src/client/i18n/messages.js";
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
  // This old-payload fixture needs an explicit book for its JPY-base snapshots.
  trip.exchangeRates = { TWD: 1, JPY: 0.22, USD: 32 };
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
  // Keep the form clean so navigation stays enabled while the footer is tall.
  await page.locator(".expense-total small").evaluate((element) => {
    element.textContent = "A longer translated participant summary "
      .repeat(20)
      .trim();
  });
  await expectMeasuredFooter(page);
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

async function expectMeasuredFooter(page: Page) {
  await expect
    .poll(() =>
      page.locator(".expense-composer-footer").evaluate((footer) => {
        const shell = footer.closest<HTMLElement>(".app-shell");
        const height = footer.getBoundingClientRect().height;
        return (
          !!shell?.hasAttribute("data-expense-footer") &&
          Math.abs(
            Number.parseFloat(
              shell.style.getPropertyValue("--expense-footer-height"),
            ) - height,
          ) < 1 &&
          Math.abs(
            Number.parseFloat(
              document.documentElement.style.getPropertyValue(
                "--expense-footer-height",
              ),
            ) - height,
          ) < 1
        );
      }),
    )
    .toBe(true);
}

async function expectHitTarget(action: Locator) {
  await expect(action).toBeInViewport({ ratio: 0.99 });
  await expect
    .poll(() =>
      action.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return element.contains(
          document.elementFromPoint(
            rect.x + rect.width / 2,
            rect.y + rect.height / 2,
          ),
        );
      }),
    )
    .toBe(true);
}

for (const width of [320, 390, 680, 681, 900, 901, 1440, 1920, 2560]) {
  test(`footer positioning, chrome edges and expanded controls at ${width}px`, async ({
    page,
  }) => {
    await mockWorkspace(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/?trip=interface-trip&mode=add-expense");
    const footer = page.locator(".expense-composer-footer");
    await expect(footer).toHaveCSS(
      "position",
      width <= 680 ? "sticky" : width <= 900 ? "static" : "fixed",
    );
    await expectMeasuredFooter(page);
    await expectNoOverflow(page);
    await expect(
      footer.locator(".expense-composer-footer-inner > .expense-total"),
    ).toHaveCount(1);
    const save = footer.locator('button[type="submit"]');
    await expect(save).toHaveAccessibleName("Record expense");
    await expect(footer.locator('[aria-live="polite"]')).toHaveCount(1);
    expect(
      await save.evaluate((element) => element.closest("form") !== null),
    ).toBe(true);

    if (width >= 901) {
      const geometry = await page.evaluate(() => {
        const header = document.querySelector(".app-header");
        const footer = document.querySelector(".expense-composer-footer");
        const inner = document.querySelector(".expense-composer-footer-inner");
        const cancel = inner?.querySelector('button[type="button"]');
        const save = inner?.querySelector('button[type="submit"]');
        if (!header || !footer || !cancel || !save)
          throw new Error("Missing chrome");
        const h = header.getBoundingClientRect();
        const f = footer.getBoundingClientRect();
        return {
          left: Math.abs(h.left - f.left),
          right: Math.abs(h.right - f.right),
          cancelGutter: cancel.getBoundingClientRect().left - h.left,
          saveGutter: h.right - save.getBoundingClientRect().right,
        };
      });
      expect(geometry.left).toBeLessThanOrEqual(1);
      expect(geometry.right).toBeLessThanOrEqual(1);
      expect(Math.abs(geometry.cancelGutter - 32)).toBeLessThanOrEqual(1);
      expect(Math.abs(geometry.saveGutter - 32)).toBeLessThanOrEqual(1);
    }

    // A short form and an expanded form must both retain reachable actions.
    await page.locator(".expense-composer details").evaluateAll((sections) => {
      for (const section of sections) section.removeAttribute("open");
    });
    await save.scrollIntoViewIfNeeded();
    await expectHitTarget(save);
    await page.locator(".expense-composer details").evaluateAll((sections) => {
      for (const section of sections) section.setAttribute("open", "");
    });
    const lastControl = page.getByLabel("Take photo").locator("..");
    await lastControl.evaluate((element) =>
      element.scrollIntoView({ block: "end" }),
    );
    await expectHitTarget(lastControl);
    const lastBox = await lastControl.boundingBox();
    const footerBox = await footer.boundingBox();
    if (!lastBox || !footerBox)
      throw new Error("Missing last control or footer");
    expect(lastBox.y + lastBox.height).toBeLessThanOrEqual(footerBox.y + 1);
    await save.scrollIntoViewIfNeeded();
    for (const action of await footer.getByRole("button").all())
      await expectHitTarget(action);
    await expectNoOverflow(page);
    await accessible(page);
  });
}

for (const width of [390, 1440]) {
  for (const locale of ["en", "zh-TW", "de"] as const) {
    for (const colorScheme of ["light", "dark"] as const) {
      test(`${locale} ${colorScheme} footer remeasures long errors at ${width}px`, async ({
        page,
      }) => {
        await mockWorkspace(page, exampleTrip(), "owner", locale);
        await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
        await page.setViewportSize({
          width,
          height: width === 390 ? 844 : 480,
        });
        await page.goto("/?trip=interface-trip&mode=add-expense");
        const footer = page.locator(".expense-composer-footer");
        await expectMeasuredFooter(page);
        const before = (await footer.boundingBox())?.height ?? 0;
        await page.locator('input[name="amount"]').fill("1000");
        await page.locator('select[name="splitMode"]').selectOption("amount");
        await expect(footer.locator(".expense-validation-error")).toBeVisible();
        // Stress text expansion without adding a test-only product locale.
        await footer
          .locator(".expense-validation-error")
          .evaluate((element, width) => {
            element.textContent = `${element.textContent} `
              .repeat(width === 390 ? 6 : 20)
              .trim();
          }, width);
        await expectMeasuredFooter(page);
        await expect
          .poll(async () => (await footer.boundingBox())?.height ?? 0)
          .toBeGreaterThan(before);
        const save = footer.locator('button[type="submit"]');
        await expect(save).toBeDisabled();
        const error = await footer
          .locator(".expense-validation-error")
          .innerText();
        await expect(save).toHaveAccessibleDescription(error);
        await expect(footer.locator('[aria-live="polite"]')).toHaveCount(1);
        await expectHitTarget(save);
        const clearance = await page.evaluate(() => ({
          shell: Number.parseFloat(
            getComputedStyle(
              document.querySelector(".app-shell") ?? document.body,
            ).paddingBottom,
          ),
          scroll: Number.parseFloat(
            getComputedStyle(document.documentElement).scrollPaddingBottom,
          ),
          footer:
            document
              .querySelector(".expense-composer-footer")
              ?.getBoundingClientRect().height ?? 0,
        }));
        expect(clearance.shell).toBeCloseTo(
          width === 390 ? 16 : clearance.footer + 16,
          0,
        );
        expect(clearance.scroll).toBeCloseTo(clearance.footer + 16, 0);
        const tags = page.locator('input[name="tags"]');
        await tags.focus();
        await expect(tags).toBeFocused();
        await expectHitTarget(tags);
        const tagsBox = await tags.boundingBox();
        const footerBox = await footer.boundingBox();
        if (!tagsBox || !footerBox)
          throw new Error("Missing final text field or footer");
        expect(tagsBox.y + tagsBox.height).toBeLessThanOrEqual(footerBox.y + 1);
        const lastControl = page
          .getByLabel(translations[locale].takeReceiptPhoto)
          .locator("..");
        await lastControl.evaluate((element) =>
          element.scrollIntoView({ block: "end" }),
        );
        await expectHitTarget(lastControl);
        const control = await lastControl.boundingBox();
        const bar = await footer.boundingBox();
        if (!control || !bar) throw new Error("Missing footer or control");
        expect(control.y + control.height).toBeLessThanOrEqual(bar.y + 1);
        await accessible(page);
        await expectNoOverflow(page);
      });
    }
  }
}

for (const width of [390, 1440]) {
  test(`200% text, safe area and print at ${width}px`, async ({
    page,
    context,
  }) => {
    await mockWorkspace(page);
    await page.setViewportSize({ width, height: 900 });
    const session = await context.newCDPSession(page);
    await session.send("Emulation.setSafeAreaInsetsOverride", {
      insets: { bottom: 34 },
    });
    await page.goto("/?trip=interface-trip&mode=add-expense");
    const footer = page.locator(".expense-composer-footer");
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    await expectMeasuredFooter(page);
    await expectNoOverflow(page);
    const lastControl = page.getByLabel("Take photo").locator("..");
    await lastControl.evaluate((element) =>
      element.scrollIntoView({ block: "end", behavior: "instant" }),
    );
    await expectHitTarget(lastControl);
    const controlBox = await lastControl.boundingBox();
    const footerBox = await footer.boundingBox();
    if (!controlBox || !footerBox)
      throw new Error("Missing scaled control or footer");
    expect(controlBox.y + controlBox.height).toBeLessThanOrEqual(
      footerBox.y + 1,
    );
    const save = footer.locator('button[type="submit"]');
    await save.scrollIntoViewIfNeeded();
    await expectHitTarget(save);
    if (width <= 680) {
      await expect(page.locator(".expense-composer-footer-inner")).toHaveCSS(
        "padding-bottom",
        "34px",
      );
      // Sticky occupies its own flow space; the shell must not get a second placeholder.
      await expect(page.locator(".app-shell")).toHaveCSS(
        "padding-bottom",
        "16px",
      );
    }
    await page.emulateMedia({ media: "print" });
    await expect(footer).toBeHidden();
    await expect(page.locator(".app-shell")).toHaveCSS("padding-bottom", "0px");
    await page.emulateMedia({ media: "screen" });
    await expectMeasuredFooter(page);
    await expectHitTarget(save);
  });
}

test("200% browser-zoom-equivalent viewport keeps footer actions reachable", async ({
  browser,
}) => {
  // 1440x900 physical pixels at 200% zoom produce a 720x450 CSS viewport.
  const context = await browser.newContext({
    viewport: { width: 720, height: 450 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  try {
    await mockWorkspace(page);
    await page.goto("/?trip=interface-trip&mode=add-expense");
    const lastControl = page.getByLabel("Take photo").locator("..");
    await lastControl.evaluate((element) =>
      element.scrollIntoView({ block: "center", behavior: "instant" }),
    );
    await expectHitTarget(lastControl);
    const save = page.locator('.expense-composer-footer button[type="submit"]');
    await save.scrollIntoViewIfNeeded();
    await expectHitTarget(save);
    await expectMeasuredFooter(page);
    await expectNoOverflow(page);
    await accessible(page);
  } finally {
    await context.close();
  }
});

test("hidden account settings release measured clearance and restore the mounted draft", async ({
  page,
}) => {
  await mockWorkspace(page);
  await page.setViewportSize({ width: 1440, height: 800 });
  await page.goto("/?trip=interface-trip&mode=add-expense");
  await page.getByLabel("Description").fill("Preserved draft");
  await expectMeasuredFooter(page);
  await page.getByRole("button", { name: "Alex's account menu" }).click();
  await page
    .getByRole("menuitem", { name: "Account settings", exact: true })
    .click();
  await expect(page.locator(".expense-composer")).toBeHidden();
  await expect
    .poll(() => page.locator(".app-shell").getAttribute("data-expense-footer"))
    .toBeNull();
  await expect
    .poll(() =>
      page
        .locator("html")
        .evaluate((element) =>
          element.style.getPropertyValue("--expense-footer-height"),
        ),
    )
    .toBe("");
  await expect(page.locator(".app-shell")).toHaveCSS("padding-bottom", "32px");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByLabel("Description")).toHaveValue("Preserved draft");
  await expectMeasuredFooter(page);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Discard draft", exact: true })
    .click();
  await expect(page.locator(".expense-composer")).toHaveCount(0);
  await expect(page.locator(".app-shell")).not.toHaveAttribute(
    "data-expense-footer",
  );
  expect(
    await page
      .locator("html")
      .evaluate((element) =>
        element.style.getPropertyValue("--expense-footer-height"),
      ),
  ).toBe("");
});
