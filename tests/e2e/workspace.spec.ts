import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

async function overflowingElements(page: Page) {
  return page.locator("body *").evaluateAll((elements) =>
    elements
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.right > window.innerWidth + 1 || rect.left < -1;
      })
      .slice(0, 12)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          className: element.getAttribute("class") ?? "",
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          tag: element.tagName,
          text: element.textContent?.trim().slice(0, 80) ?? "",
          width: Math.round(rect.width),
        };
      }),
  );
}

async function login(page: Page, groupName: string | RegExp = "東京賞櫻五日") {
  await page.goto("/");
  await page
    .locator("#login-form")
    .getByRole("button", { name: "登入" })
    .click();
  await expect(page.getByRole("heading", { name: groupName })).toBeVisible();
}

test("goal-first workspace navigation and expense preview are safe", async ({
  page,
}) => {
  let expenseMutations = 0;
  page.on("request", (request) => {
    if (
      request.method() !== "GET" &&
      /\/api\/trips\/[^/]+\/expenses(?:\/[^/]+)?$/.test(request.url())
    )
      expenseMutations += 1;
  });
  await login(page);

  const settlement = page.getByRole("heading", { name: "待結清" });
  const analysis = page.locator("summary").filter({ hasText: "花費分析" });
  await expect(analysis).toBeVisible();
  const settlementBox = await settlement.boundingBox();
  const analysisBox = await analysis.boundingBox();
  expect(settlementBox?.y ?? Number.POSITIVE_INFINITY).toBeLessThan(
    analysisBox?.y ?? Number.NEGATIVE_INFINITY,
  );

  await page.getByRole("button", { name: "記一筆" }).click();
  await expect(page).toHaveURL(/mode=add-expense/);
  await page.getByLabel("金額", { exact: true }).fill("1000");
  await expect(page.getByText("Admin 支付 $1,000")).toBeVisible();
  await expect(page.getByText("$250").first()).toBeVisible();
  expect(expenseMutations).toBe(0);

  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("捨棄草稿");
    await dialog.dismiss();
  });
  await page.goBack();
  await expect(page).toHaveURL(/mode=add-expense/);

  await page.getByRole("button", { name: "取消" }).first().click();
  const discard = page.getByRole("dialog", { name: "要捨棄這份草稿嗎？" });
  await expect(discard).toBeVisible();
  await discard.getByRole("button", { name: "取消" }).click();
  await expect(page.getByRole("heading", { name: "新增支出" })).toBeVisible();
  expect(expenseMutations).toBe(0);
  await page.getByRole("button", { name: "取消" }).first().click();
  await page.getByRole("button", { name: "捨棄草稿" }).click();
  await expect(page).not.toHaveURL(/mode=add-expense/);
  expect(expenseMutations).toBe(0);

  await page.getByRole("button", { name: "支出", exact: true }).click();
  await expect(page).toHaveURL(/view=expenses/);
  const search = page.getByPlaceholder("搜尋支出描述");
  await search.fill("藥妝");
  await expect(page.getByText("顯示 1 / 8 筆支出")).toBeVisible();
  await page.getByRole("button", { name: "總覽" }).click();
  await page.goBack();
  await expect(search).toHaveValue("藥妝");
});

test("failed group switch keeps the previous valid group", async ({ page }) => {
  await login(page);
  await page.route(/\/api\/trips\/trip_dev_newyork_2026$/, (route) =>
    route.fulfill({
      body: JSON.stringify({ error: "測試用載入失敗" }),
      contentType: "application/json",
      status: 500,
    }),
  );
  await page.getByRole("button", { name: /紐約出差延長玩/ }).click();
  await expect(page.getByRole("alert")).toContainText("測試用載入失敗");
  await expect(
    page.getByRole("heading", { name: "東京賞櫻五日" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/trip=trip_dev_tokyo_2026/);
});

test("Back restores the previous view scroll position", async ({ page }) => {
  await login(page);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await page.evaluate(() => window.scrollTo({ behavior: "instant", top: 900 }));
  const previousScroll = await page.evaluate(() => window.scrollY);
  expect(previousScroll).toBeGreaterThan(200);
  await page.getByRole("button", { name: "更多" }).click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.goBack();
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(200);
});

test("failed expense mutation preserves the draft and previous data", async ({
  page,
}) => {
  await login(page);
  await page.route(/\/api\/trips\/[^/]+\/expenses$/, async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        body: JSON.stringify({ error: "測試用伺服器錯誤" }),
        contentType: "application/json",
        status: 500,
      });
      return;
    }
    await route.continue();
  });
  await page.getByRole("button", { name: "記一筆" }).click();
  await page.getByLabel("描述").fill("保留這份草稿");
  await page.getByLabel("金額", { exact: true }).fill("800");
  await page.getByRole("button", { name: "記錄支出" }).click();
  await expect(page.getByRole("alert")).toContainText("測試用伺服器錯誤");
  await expect(page.getByLabel("描述")).toHaveValue("保留這份草稿");
  await expect(page.getByLabel("金額", { exact: true })).toHaveValue("800");
  await expect(page.getByText("保留這份草稿", { exact: true })).toHaveCount(0);
});

test("dialogs manage focus and archived groups expose no mutation actions", async ({
  page,
}) => {
  await login(page);
  const payment = page.getByRole("button", { name: "記錄付款" }).first();
  await payment.click();
  const dialog = page.getByRole("dialog", { name: "記錄結清付款" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("付款金額（TWD）")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(payment).toBeFocused();

  await page.locator("summary").filter({ hasText: "已封存" }).click();
  await page.getByRole("button", { name: /已封存/ }).click();
  await expect(page.getByText("已封存・唯讀。資料會保留")).toBeVisible();
  await expect(page.getByRole("button", { name: "記一筆" })).toHaveCount(0);
  await page.getByRole("button", { name: "支出", exact: true }).click();
  await expect(page.getByRole("button", { name: "編輯" })).toHaveCount(0);
});

test("consequential settings preview without mutating until apply", async ({
  page,
}) => {
  let settingMutations = 0;
  page.on("request", (request) => {
    if (
      request.method() !== "GET" &&
      /\/api\/trips\/trip_dev_tokyo_2026/.test(request.url())
    )
      settingMutations += 1;
  });
  await login(page);
  await page.getByRole("button", { name: "更多" }).click();

  await page.locator("summary").filter({ hasText: "群組偏好" }).click();
  await page.locator('select[name="baseCurrency"]').selectOption("JPY");
  await expect(page.getByText("變更預覽", { exact: true })).toBeVisible();
  expect(settingMutations).toBe(0);
  await page.getByRole("button", { name: "取消變更" }).first().click();

  await page.locator("summary").filter({ hasText: "分享與權限" }).click();
  await page.getByRole("button", { name: "建立分享連結" }).click();
  const shareDialog = page.getByRole("dialog", { name: "建立分享連結？" });
  await expect(shareDialog.getByText(/任何取得連結的人/)).toBeVisible();
  await shareDialog.getByRole("button", { name: "取消" }).click();
  expect(settingMutations).toBe(0);

  await page.locator("summary").filter({ hasText: "換算方式" }).click();
  await page.getByLabel("JPY → TWD").fill("0.22");
  await expect(page.getByText("換算預覽", { exact: true })).toBeVisible();
  expect(settingMutations).toBe(0);

  await page.locator("summary").filter({ hasText: "資料與匯出" }).click();
  await page.locator('input[accept=".csv,text/csv"]').setInputFiles({
    buffer: Buffer.from(
      "date,description,amount,currency,paid_by,split_participants\n2026-07-25,E2E meal,100,TWD,Admin,Admin;美咲",
    ),
    mimeType: "text/csv",
    name: "preview.csv",
  });
  await expect(page.getByText("可匯入 1 列；0 個錯誤。")).toBeVisible();
  expect(settingMutations).toBe(0);
  await page.locator('input[accept=".csv,text/csv"]').setInputFiles({
    buffer: Buffer.from(
      "date,description,amount,currency,paid_by,split_participants\ninvalid,Broken,100,TWD,Missing,Missing",
    ),
    mimeType: "text/csv",
    name: "invalid.csv",
  });
  await expect(page.getByText(/第 2 列：日期格式必須/)).toBeVisible();
  expect(settingMutations).toBe(0);

  await page.locator('input[accept="application/json,.json"]').setInputFiles({
    buffer: Buffer.from(
      JSON.stringify({
        exportedAt: "2026-07-25T00:00:00.000Z",
        trip: {
          baseCurrency: "TWD",
          expenses: [],
          name: "預覽還原群組",
          participants: [{ id: "preview-person", name: "Preview" }],
        },
        version: 1,
      }),
    ),
    mimeType: "application/json",
    name: "preview.json",
  });
  await expect(page.getByText("還原預覽：預覽還原群組")).toBeVisible();
  expect(settingMutations).toBe(0);

  await page.locator("summary").filter({ hasText: "群組生命週期" }).click();
  await page.getByRole("button", { name: "封存群組" }).click();
  const archiveDialog = page.getByRole("dialog", { name: "封存這個群組？" });
  await expect(archiveDialog.getByText(/封存期間不能修改/)).toBeVisible();
  await archiveDialog.getByRole("button", { name: "取消" }).click();
  expect(settingMutations).toBe(0);
});

test("a new group can record an expense and be safely removed", async ({
  page,
}) => {
  await login(page);
  const groupName = `E2E-${Date.now()}`;
  await page.getByRole("button", { name: "建立群組" }).click();
  const createDialog = page.getByRole("dialog", { name: "建立群組" });
  await createDialog.getByLabel("群組名稱").fill(groupName);
  await createDialog.getByRole("button", { name: "建立群組" }).click();
  await expect(page.getByRole("heading", { name: groupName })).toBeVisible();

  await page.getByLabel("成員名稱").fill("Bob");
  await page.getByRole("button", { name: "新增成員" }).click();
  await expect(
    page.getByRole("list").getByText("Bob", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "記一筆" }).click();
  await page.getByLabel("描述").fill("E2E dinner");
  await page.getByLabel("金額", { exact: true }).fill("1000");
  await page.getByRole("button", { name: "記錄支出" }).click();
  await expect(page.getByText("E2E dinner", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "更多" }).click();
  await page.locator("summary").filter({ hasText: "群組生命週期" }).click();
  await page.getByLabel(`輸入「${groupName}」確認`).fill(groupName);
  await page.getByRole("button", { name: "永久刪除群組" }).click();
  const deleteDialog = page.getByRole("dialog", { name: "永久刪除群組？" });
  await deleteDialog
    .getByRole("button", { name: `永久刪除「${groupName}」` })
    .click();
  await expect(page.getByRole("heading", { name: groupName })).toHaveCount(0);
});

test("readonly share exposes results without mutation controls", async ({
  page,
}) => {
  await login(page);
  const link = await page.evaluate(async () => {
    const response = await fetch("/api/trips/trip_dev_tokyo_2026/share-links", {
      method: "POST",
    });
    const payload = await response.json();
    return payload.shareLinks.find((item: { url?: string }) => item.url);
  });
  expect(link?.url).toBeTruthy();
  if (!link?.url) throw new Error("Share link was not created");
  await page.goto(link.url);
  await expect(page.getByText("唯讀分享", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "記錄付款" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "編輯" })).toHaveCount(0);
  await page.evaluate(async ({ id }) => {
    await fetch(`/api/trips/trip_dev_tokyo_2026/share-links/${id}`, {
      method: "DELETE",
    });
  }, link);
});

test("supported viewports reflow without body overflow", async ({ page }) => {
  await login(page);
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ height: 900, width });
    await expect
      .poll(() =>
        page.evaluate(() => document.body.scrollWidth <= window.innerWidth),
      )
      .toBe(true);
    await expect(page.getByRole("button", { name: "記一筆" })).toBeVisible();
  }
  await page.setViewportSize({ height: 844, width: 390 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  expect(await overflowingElements(page)).toEqual([]);
  await page.setViewportSize({ height: 390, width: 844 });
  await expect
    .poll(() =>
      page.evaluate(() => document.body.scrollWidth <= window.innerWidth),
    )
    .toBe(true);
});

test("long localized content and dense expense history remain usable", async ({
  page,
}) => {
  await page.route(/\/api\/trips\/trip_dev_tokyo_2026$/, async (route) => {
    const response = await route.fetch();
    const payload = await response.json();
    payload.trip.name =
      "這是一個非常長但仍需要完整辨識的跨國旅行與朋友聚會群組名稱";
    payload.trip.participants[0].name = "擁有一個非常長顯示名稱的同行分帳成員";
    const source = payload.trip.expenses[0];
    payload.trip.expenses = Array.from({ length: 52 }, (_, index) => ({
      ...source,
      description: `第 ${index + 1} 筆包含很長描述、分類與多個標籤的共同支出紀錄`,
      id: `dense-${index}`,
      tags: ["早餐", "跨國交通", "需要核對", "朋友代墊", "長標籤內容"],
    }));
    await route.fulfill({ json: payload, response });
  });
  await page.setViewportSize({ height: 900, width: 320 });
  await login(page, /這是一個非常長/);
  await page.getByRole("button", { name: "支出", exact: true }).click();
  await expect(page.getByText("顯示 52 / 52 筆支出")).toBeVisible();
  expect(await overflowingElements(page)).toEqual([]);
  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("heading", { name: "支出" })).toBeVisible();
});

test("offline state keeps reading available and disables mutations", async ({
  context,
  page,
}) => {
  await login(page);
  await context.setOffline(true);
  await expect(page.getByText(/目前離線/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "記錄付款" }).first(),
  ).toBeDisabled();
  await expect(page.getByRole("button", { name: "建立群組" })).toBeDisabled();
  await context.setOffline(false);
});

test("primary workspace has no serious automated accessibility violations", async ({
  page,
}) => {
  await login(page);
  const results = await new AxeBuilder({ page })
    .exclude("[data-vite-dev-id]")
    .analyze();
  expect(
    results.violations.filter(
      (item) => item.impact === "critical" || item.impact === "serious",
    ),
  ).toEqual([]);
});
