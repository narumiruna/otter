import { Hono } from "hono";
import { expect, test } from "vitest";
import {
  appleAssociation,
  registerAppleAssociationRoutes,
} from "./server-apple-association.js";
import type { OtterEnv } from "./server-http.js";

test.each([
  undefined,
  "",
  "bad.app",
  "team123456.dev.otter",
  "TEAM123456",
  "TEAM123456.dev.otter/evil",
  "TEAM123456.dev..otter",
  "TEAM123456.dev.otter\n",
])("Apple association rejects missing or malformed app IDs: %s", (id) => {
  expect(appleAssociation(id)).toBeUndefined();
});

test("Apple association binds only the configured signed app and native routes", async () => {
  const app = new Hono<OtterEnv>();
  registerAppleAssociationRoutes(app, () => "TEAM123456.dev.narumi.otter.ios");
  const response = await app.request("/.well-known/apple-app-site-association");
  expect(response.status).toBe(200);
  expect(response.headers.get("Content-Type")).toContain("application/json");
  expect(response.headers.get("Cache-Control")).toBe("public, max-age=3600");
  expect(await response.json()).toEqual({
    applinks: {
      details: [
        {
          appIDs: ["TEAM123456.dev.narumi.otter.ios"],
          components: [{ "/": "/share/*" }, { "/": "/device" }, { "/": "/" }],
        },
      ],
    },
    webcredentials: { apps: ["TEAM123456.dev.narumi.otter.ios"] },
  });
});

test("An unconfigured Apple association is 404 JSON, never SPA fallback or a wildcard app ID", async () => {
  const app = new Hono<OtterEnv>();
  registerAppleAssociationRoutes(app, () => undefined);
  app.get("*", (context) => context.html("<html>SPA</html>"));
  const response = await app.request("/.well-known/apple-app-site-association");
  expect(response.status).toBe(404);
  expect(response.headers.get("Content-Type")).toContain("application/json");
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  const head = await app.request("/.well-known/apple-app-site-association", {
    method: "HEAD",
  });
  expect(head.status).toBe(404);
  expect(await head.text()).toBe("");
});
