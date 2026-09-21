import { randomUUID } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import type { TripPayload, UserResponse } from "@narumitw/otter-contracts";
import { expect, test } from "@playwright/test";
import { expectNoOverflow } from "./layout-assertions.js";

test("two members resolve an expense conflict without losing a draft; history is private and accessible", async ({
  browser,
  baseURL,
}) => {
  const owner = await browser.newContext({
    baseURL,
    locale: "zh-TW",
    extraHTTPHeaders: { "X-Forwarded-For": "198.18.10.1" },
  });
  const editor = await browser.newContext({
    baseURL,
    locale: "zh-TW",
    extraHTTPHeaders: { "X-Forwarded-For": "198.18.10.2" },
  });
  const publicContext = await browser.newContext({ baseURL, locale: "zh-TW" });
  try {
    const suffix = randomUUID().slice(0, 8);
    for (const [context, name] of [
      [owner, "owner"],
      [editor, "editor"],
    ] as const) {
      const response = await context.request.post("/api/auth/register", {
        data: {
          username: `history-${name}-${suffix}`,
          name,
          password: "password123",
        },
      });
      expect(response.status()).toBe(201);
    }
    const editorUser = (await (
      await editor.request.get("/api/me")
    ).json()) as UserResponse;
    expect(editorUser.user).not.toBeNull();
    const created = await owner.request.post("/api/trips", {
      data: { name: `History ${suffix}`, baseCurrency: "TWD" },
    });
    const initial = (await created.json()) as TripPayload;
    const tripId = initial.trip.id;
    const root = `/api/trips/${tripId}`;
    const withPerson = (await (
      await owner.request.post(`${root}/participants`, {
        data: { name: "Other" },
      })
    ).json()) as TripPayload;
    expect(
      (
        await owner.request.post(`${root}/members`, {
          data: { username: editorUser.user?.username },
        })
      ).status(),
    ).toBe(201);
    const added = (await (
      await owner.request.post(`${root}/expenses`, {
        data: {
          description: "晚餐",
          amount: "100",
          currency: "TWD",
          paidById: initial.trip.participants[0].id,
          participantIds: withPerson.trip.participants.map((p) => p.id),
        },
      })
    ).json()) as TripPayload;
    const expenseId = added.trip.expenses[0].id;
    const ownerPage = await owner.newPage();
    const editorPage = await editor.newPage();
    await Promise.all([
      ownerPage.goto(`/?trip=${tripId}&view=expenses`),
      editorPage.goto(`/?trip=${tripId}&view=expenses`),
    ]);
    await ownerPage.getByRole("button", { name: "晚餐", exact: true }).click();
    await ownerPage.getByLabel("描述", { exact: true }).fill("我的草稿");
    await editorPage.getByRole("button", { name: "晚餐", exact: true }).click();
    await editorPage.getByLabel("金額", { exact: true }).fill("200");
    await editorPage
      .getByRole("button", { name: "儲存變更", exact: true })
      .click();
    await expect(
      editorPage.getByRole("button", { name: "晚餐", exact: true }),
    ).toBeVisible();
    const conflict = ownerPage.waitForResponse(
      (response) =>
        response.url().endsWith(`/expenses/${expenseId}`) &&
        response.request().method() === "PATCH",
    );
    await ownerPage
      .getByRole("button", { name: "儲存變更", exact: true })
      .click();
    expect((await conflict).status()).toBe(412);
    await expect(ownerPage.getByLabel("描述", { exact: true })).toHaveValue(
      "我的草稿",
    );
    await expect(
      ownerPage.getByRole("button", { name: "儲存變更", exact: true }),
    ).toBeDisabled();
    await ownerPage
      .getByRole("button", { name: "查看最新內容", exact: true })
      .click();
    await expect(ownerPage.getByText("v2", { exact: true })).toBeVisible();
    await ownerPage
      .getByRole("button", { name: "已確認最新內容，保留草稿繼續編輯" })
      .click();
    await ownerPage
      .getByRole("button", { name: "儲存變更", exact: true })
      .click();
    await expect(
      ownerPage.getByRole("button", { name: "我的草稿", exact: true }),
    ).toBeVisible();
    const current = (await (
      await owner.request.get(root)
    ).json()) as TripPayload;
    expect(current.trip.expenses[0].version).toBe(3);
    const historyButton = ownerPage.getByRole("button", {
      name: "修改紀錄：我的草稿",
      exact: true,
    });
    await historyButton.click();
    const dialog = ownerPage.getByRole("dialog", {
      name: "修改紀錄：我的草稿",
      exact: true,
    });
    await expect(dialog.getByText(/修改 · v3/)).toBeVisible();
    await expect(dialog.getByText(/editor/)).toBeVisible();
    await expect(dialog.getByText("修改前").first()).toBeVisible();
    for (const width of [375, 1280]) {
      await ownerPage.setViewportSize({ width, height: 900 });
      await expectNoOverflow(ownerPage);
      const accessibility = await new AxeBuilder({ page: ownerPage })
        .include('[role="dialog"]')
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(accessibility.violations).toEqual([]);
    }
    await ownerPage.keyboard.press("Escape");
    await expect(historyButton).toBeFocused();
    expect(
      (
        await owner.request.delete(`${root}/expenses/${expenseId}`, {
          headers: { "If-Match": '"3"' },
        })
      ).status(),
    ).toBe(200);
    await ownerPage.reload();
    await ownerPage
      .getByRole("button", { name: "修改紀錄", exact: true })
      .click();
    await expect(
      ownerPage.getByRole("dialog").getByText(/已刪除 · v4/),
    ).toBeVisible();
    const shared = (await (
      await owner.request.post(`${root}/share-links`)
    ).json()) as TripPayload;
    const shareUrl = shared.shareLinks?.find((link) => link.url)?.url;
    expect(shareUrl).toBeTruthy();
    const publicPage = await publicContext.newPage();
    await publicPage.goto(shareUrl ?? "/");
    await expect(
      publicPage.getByText("唯讀分享", { exact: true }),
    ).toBeVisible();
    await expect(
      publicPage.getByRole("button", { name: "修改紀錄", exact: true }),
    ).toHaveCount(0);
    expect(
      (await publicContext.request.get(`${root}/expense-history`)).status(),
    ).toBe(401);
    expect(
      (await owner.request.patch(root, { data: { archived: true } })).status(),
    ).toBe(200);
    expect((await editor.request.get(`${root}/expense-history`)).status()).toBe(
      200,
    );
    await editorPage.goto(`/?trip=${tripId}&view=expenses`);
    await editorPage
      .getByRole("button", { name: "修改紀錄", exact: true })
      .click();
    await expect(
      editorPage.getByRole("dialog").getByText(/已刪除 · v4/),
    ).toBeVisible();
  } finally {
    await Promise.all([owner.close(), editor.close(), publicContext.close()]);
  }
});
