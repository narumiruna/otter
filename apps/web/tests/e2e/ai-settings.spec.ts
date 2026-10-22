import type {
  AiAuthMethod,
  AiConnection,
  AiLoginState,
  AiSettings,
} from "@narumitw/otter-contracts";
import { expect, type Page, test } from "@playwright/test";
import { accessible, mockWorkspace } from "./interface-fixtures.js";
import { expectNoOverflow } from "./layout-assertions.js";

async function mockAi(page: Page) {
  const state = {
    settings: null as AiSettings | null,
    connections: [] as AiConnection[],
    login: null as AiLoginState | null,
    starts: 0,
    responses: [] as { promptId: string; value: string }[],
    saves: [] as AiSettings[],
  };
  await page.route("**/api/auth/ai/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === "/api/auth/ai/catalog") {
      await route.fulfill({
        json: {
          authenticationEnabled: true,
          providers: [
            {
              id: "test-provider",
              name: "Test Provider",
              authMethods: ["oauth", "api_key"],
              models: [
                {
                  id: "test-fast",
                  name: "Fast Test Model",
                  thinkingLevels: ["off", "low"],
                },
                {
                  id: "test-reason",
                  name: "Reasoning Test Model",
                  thinkingLevels: ["low", "high"],
                },
              ],
            },
            {
              id: "key-only",
              name: "Key Only Provider",
              authMethods: ["api_key"],
              models: [],
            },
          ],
        },
      });
    } else if (path === "/api/auth/ai/settings") {
      if (request.method() === "PUT") {
        state.settings = request.postDataJSON();
        if (!state.settings) throw new Error("Missing saved settings");
        state.saves.push(state.settings);
      }
      await route.fulfill({ json: { settings: state.settings } });
    } else if (path === "/api/auth/ai/connections") {
      await route.fulfill({ json: { connections: state.connections } });
    } else if (path === "/api/auth/ai/logins" && request.method() === "POST") {
      state.starts += 1;
      const { provider, method }: { provider: string; method: AiAuthMethod } =
        request.postDataJSON();
      state.login = {
        id: "browser-login",
        provider,
        method,
        status: "pending",
        events:
          method === "oauth"
            ? [
                {
                  type: "auth_url",
                  url: "https://login.example.test/authorize",
                  instructions:
                    "Simulated test sign-in; do not open the provider.",
                },
                {
                  type: "device_code",
                  verificationUri: "https://login.example.test/device",
                  userCode: "TEST-1234",
                },
              ]
            : [],
        prompt: {
          id: "browser-prompt",
          type: method === "oauth" ? "manual_code" : "secret",
          message:
            method === "oauth"
              ? "Enter the simulated code"
              : "Enter the simulated API key",
        },
      };
      await route.fulfill({ json: { login: state.login } });
    } else if (
      path === "/api/auth/ai/logins/browser-login/respond" &&
      request.method() === "POST"
    ) {
      if (!state.login) throw new Error("Login not started");
      state.responses.push(request.postDataJSON());
      state.connections = [
        { provider: state.login.provider, method: state.login.method },
      ];
      state.login = { ...state.login, status: "complete", prompt: undefined };
      await route.fulfill({ json: { login: state.login } });
    } else if (path === "/api/auth/ai/logins/browser-login") {
      if (request.method() === "DELETE") {
        state.login = null;
        await route.fulfill({ json: { ok: true } });
      } else await route.fulfill({ json: { login: state.login } });
    } else
      throw new Error(`Unexpected AI request: ${request.method()} ${path}`);
  });
  return state;
}

for (const colorScheme of ["light", "dark"] as const) {
  for (const width of [320, 1280]) {
    test(`${colorScheme} AI account settings at ${width}px: simulated sign-in, keyboard search and reload`, async ({
      page,
    }) => {
      test.setTimeout(60_000);
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const externalRequests: string[] = [];
      await page.route("https://login.example.test/**", async (route) => {
        externalRequests.push(route.request().url());
        await route.abort();
      });
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
      await mockWorkspace(page);
      const state = await mockAi(page);
      await page.goto("/?account=settings");
      const account = page.getByRole("region", {
        name: "Account settings",
        exact: true,
      });
      const ai = account.getByRole("region", {
        name: "AI settings",
        exact: true,
      });
      const connections = ai.getByRole("region", {
        name: "Provider connections",
      });
      await expect(
        connections.getByRole("button", { name: "Add provider" }),
      ).toBeEnabled();
      await expect(
        ai.getByRole("combobox", { name: "Provider", exact: true }),
      ).toBeDisabled();
      await expect(
        ai.getByRole("button", { name: "Save AI settings" }),
      ).toBeDisabled();
      await expectNoOverflow(page);
      await accessible(page);
      await connections.getByRole("button", { name: "Add provider" }).click();
      const method = connections.getByRole("combobox", {
        name: "Authentication method",
      });
      await expect(method).toHaveValue("oauth");
      const useKey = width === 320;
      if (useKey) await method.selectOption("api_key");
      const provider = connections.getByRole("combobox", {
        name: "Provider",
        exact: true,
      });
      await provider.fill("TEST-PROVIDER");
      await expect(
        connections.getByRole("listbox").getByRole("option"),
      ).toHaveCount(1);
      await provider.press("ArrowDown");
      await provider.press("Enter");
      expect(state.starts).toBe(0);
      await connections
        .getByRole("button", { name: "Connect provider", exact: true })
        .click();
      const response = connections.getByLabel("Response", { exact: true });
      await expect(response).toHaveAttribute("type", "password");
      await expect(
        account.getByRole("button", { name: "Back to groups", exact: true }),
      ).toBeDisabled();
      await expect(
        account.getByRole("button", { name: "Cancel", exact: true }),
      ).toBeDisabled();
      await expect(
        account.getByRole("button", { name: "Save", exact: true }),
      ).toBeDisabled();
      if (!useKey) {
        const links = connections.getByRole("link", {
          name: "Open sign-in page",
        });
        await expect(links).toHaveCount(2);
        for (const link of await links.all()) {
          await expect(link).toHaveAttribute(
            "href",
            /^https:\/\/login\.example\.test\//,
          );
          await expect(link).toHaveAttribute("target", "_blank");
          await expect(link).toHaveAttribute("rel", "noopener noreferrer");
        }
        await expect(connections.getByText("TEST-1234")).toBeVisible();
      }
      const simulatedResponse = useKey
        ? "fake-browser-api-key"
        : "fake-browser-manual-code";
      await response.fill(simulatedResponse);
      // Await an actual mocked poll, not an arbitrary delay. It must retain typed input.
      await page.waitForResponse(
        (result) =>
          new URL(result.url()).pathname ===
            "/api/auth/ai/logins/browser-login" &&
          result.request().method() === "GET",
      );
      await expect(response).toHaveValue(simulatedResponse);
      expect(
        await page.evaluate(() => JSON.stringify(localStorage)),
      ).not.toContain(simulatedResponse);
      await expectNoOverflow(page);
      await accessible(page);
      await connections
        .getByRole("button", { name: "Continue", exact: true })
        .click();
      await expect(
        connections.getByText("Provider connection saved", { exact: true }),
      ).toBeVisible();
      await expect(response).toHaveCount(0);
      expect(state.responses).toEqual([
        { promptId: "browser-prompt", value: simulatedResponse },
      ]);
      expect(state.starts).toBe(1);
      await expect(
        account.getByRole("button", { name: "Back to groups", exact: true }),
      ).toBeEnabled();
      await expect(
        account.getByRole("button", { name: "Save", exact: true }),
      ).toBeEnabled();
      const modelProvider = ai.getByRole("combobox", {
        name: "Provider",
        exact: true,
      });
      await modelProvider.fill("pRoViDeR");
      await modelProvider.press("Enter");
      const model = ai.getByRole("combobox", { name: "Model", exact: true });
      await model.fill("TEST-REASON");
      await expect(ai.getByRole("listbox").getByRole("option")).toHaveCount(1);
      await model.press("ArrowDown");
      await model.press("Enter");
      const thinking = ai.getByRole("combobox", {
        name: "Thinking level",
        exact: true,
      });
      await expect(thinking).toHaveValue("low");
      await expect(
        thinking.getByRole("option", { name: "Off", exact: true }),
      ).toHaveCount(0);
      await thinking.selectOption("high");
      expect(state.saves).toEqual([]);
      await ai
        .getByRole("button", { name: "Save AI settings", exact: true })
        .click();
      await expect(
        ai.getByText("AI settings saved", { exact: true }),
      ).toBeVisible();
      expect(state.saves).toEqual([
        {
          provider: "test-provider",
          model: "test-reason",
          thinkingLevel: "high",
        },
      ]);
      await expect(account).toBeVisible(); // AI save must not submit the username form.
      await expect(
        ai.getByRole("button", { name: "Save AI settings" }),
      ).toBeDisabled();
      await page.reload();
      await expect(modelProvider).toHaveValue("Test Provider");
      await expect(model).toHaveValue("Reasoning Test Model");
      await expect(thinking).toHaveValue("high");
      await expect(
        ai.getByRole("button", { name: "Save AI settings" }),
      ).toBeDisabled();
      expect(
        await page.evaluate(() => JSON.stringify(localStorage)),
      ).not.toContain(simulatedResponse);
      await expectNoOverflow(page);
      await accessible(page);
      expect(externalRequests).toEqual([]);
      expect(errors).toEqual([]);
    });
  }
}
