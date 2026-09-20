// @vitest-environment jsdom

import assert from "node:assert/strict";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, test, vi } from "vitest";
import { DeviceAuthorization } from "./device-authorization.js";
import { I18nProvider, useI18n } from "./i18n.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

function DeviceAuthorizationWithLanguageSwitch() {
  const { setLocale } = useI18n();
  return (
    <>
      <button type="button" onClick={() => setLocale("zh-TW")}>
        中文
      </button>
      <DeviceAuthorization initialCode="ABCD-2345" />
    </>
  );
}

test("device authorization renders an accessible code form", () => {
  const html = renderToStaticMarkup(<DeviceAuthorization initialCode="" />);

  assert.match(html, /<form/);
  assert.match(html, /<label[^>]*for="device-code"[^>]*>Device code<\/label>/);
  assert.match(html, /id="device-code"/);
  assert.match(html, /autoComplete="one-time-code"/);
  assert.match(html, /type="submit"/);
  assert.match(html, />繼續<\/button>/);
});

test("language changes do not re-inspect an approved device code", async () => {
  const fetchMock = vi.fn(
    async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/auth/device/ABCD-2345")) {
        return Response.json({
          clientName: "Travel agent",
          expiresAt: "2099-01-01T00:00:00.000Z",
          userCode: "ABCD-2345",
        });
      }
      if (url.endsWith("/api/auth/device/approve") && init?.method === "POST") {
        return Response.json({ ok: true });
      }
      return Response.json({ error: "Not found" }, { status: 404 });
    },
  );
  vi.stubGlobal("fetch", fetchMock);
  const user = userEvent.setup();
  const view = render(
    <I18nProvider initialLocale="en">
      <DeviceAuthorizationWithLanguageSwitch />
    </I18nProvider>,
  );

  expect(
    await view.findByRole("heading", { name: "CLI access request" }),
  ).toBeVisible();
  await user.click(view.getByRole("button", { name: "Approve access" }));
  expect(
    await view.findByRole("heading", { name: "CLI connected" }),
  ).toBeVisible();

  await user.click(view.getByRole("button", { name: "中文" }));

  expect(view.getByRole("heading", { name: "CLI 已連結" })).toBeVisible();
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
