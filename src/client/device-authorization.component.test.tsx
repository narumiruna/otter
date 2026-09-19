import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";
import { DeviceAuthorization } from "./device-authorization.js";

test("device authorization renders an accessible code form", () => {
  const html = renderToStaticMarkup(<DeviceAuthorization initialCode="" />);

  assert.match(html, /<form/);
  assert.match(html, /<label[^>]*for="device-code"[^>]*>Device code<\/label>/);
  assert.match(html, /id="device-code"/);
  assert.match(html, /autoComplete="one-time-code"/);
  assert.match(html, /type="submit"/);
  assert.match(html, />繼續<\/button>/);
});
