import { randomUUID } from "node:crypto";
import type { TripPayload } from "@narumitw/otter-contracts";
import { expect, test } from "@playwright/test";

test("owner-selected edit links work with and without sign-in, and guest access can be revoked", async ({
  browser,
  baseURL,
}) => {
  const suffix = randomUUID().slice(0, 8);
  const owner = await browser.newContext({ baseURL, locale: "zh-TW" });
  const guest = await browser.newContext({ baseURL, locale: "zh-TW" });
  const editor = await browser.newContext({ baseURL, locale: "zh-TW" });
  try {
    expect(
      (
        await owner.request.post("/api/auth/register", {
          data: { username: `link-owner-${suffix}`, password: "password123" },
        })
      ).status(),
    ).toBe(201);
    const created = await owner.request.post("/api/trips", {
      data: { name: `Share ${suffix}` },
    });
    const tripId = ((await created.json()) as TripPayload).trip.id;
    const root = `/api/trips/${tripId}`;
    async function createLink(mode: string) {
      const response = await owner.request.post(`${root}/share-links`, {
        data: { mode },
      });
      expect(response.status()).toBe(201);
      const payload = (await response.json()) as TripPayload;
      const link = payload.shareLinks?.find((item) => item.url);
      if (!link?.url) throw new Error("Share link URL was not returned");
      return { id: link.id, url: link.url };
    }
    const anonymousLink = await createLink("anyone-edit");
    const guestPage = await guest.newPage();
    await guestPage.goto(`${anonymousLink.url}?view=people`);
    await expect(
      guestPage.getByRole("heading", { name: "分帳成員管理" }),
    ).toBeVisible();
    await guestPage.getByLabel("成員名稱").fill("Guest Person");
    await guestPage.getByRole("button", { name: "新增成員" }).click();
    await expect(
      guestPage.getByText("Guest Person", { exact: true }).first(),
    ).toBeVisible();
    expect(
      (
        await owner.request.delete(`${root}/share-links/${anonymousLink.id}`)
      ).status(),
    ).toBe(200);
    await guestPage.getByLabel("成員名稱").fill("After revoke");
    await guestPage.getByRole("button", { name: "新增成員" }).click();
    await expect(guestPage.getByRole("alert")).toContainText(
      "分享連結無效或已撤銷",
    );

    const signedInLink = await createLink("signed-in-edit");
    const editorPage = await editor.newPage();
    await editorPage.goto(signedInLink.url);
    await expect(
      editorPage.getByText(new RegExp(`登入或建立帳號以編輯 Share ${suffix}`)),
    ).toBeVisible();
    expect(
      (
        await editor.request.post("/api/auth/register", {
          data: { username: `link-editor-${suffix}`, password: "password123" },
        })
      ).status(),
    ).toBe(201);
    await editorPage.reload();
    await expect(editorPage).toHaveURL(new RegExp(`\\?trip=${tripId}`));
    await expect(
      editorPage.getByText(`Share ${suffix}`, { exact: true }).first(),
    ).toBeVisible();
  } finally {
    await editor.close();
    await guest.close();
    await owner.close();
  }
});
