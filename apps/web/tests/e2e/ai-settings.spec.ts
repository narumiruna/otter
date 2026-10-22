import type {
  AiAuthMethod,
  AiCatalogResponse,
  AiConnection,
  AiLoginState,
  AiSettings,
} from "@narumitw/otter-contracts";
import { expect, type Page, type Route, test } from "@playwright/test";
import { accessible, mockWorkspace } from "./interface-fixtures.js";
import { expectNoOverflow } from "./layout-assertions.js";

const catalog: AiCatalogResponse = {
  authenticationEnabled: true,
  providers: [
    {
      id: "openai",
      name: "OpenAI",
      authMethods: ["api_key"],
      models: [
        { id: "gpt-test", name: "GPT test model", thinkingLevels: ["off"] },
        {
          id: "gpt-reason",
          name: "GPT reasoning test model",
          thinkingLevels: ["low", "high"],
        },
      ],
    },
    {
      id: "openai-codex",
      name: "OpenAI Codex (legacy)",
      authMethods: ["oauth"],
      models: [
        { id: "codex-test", name: "Codex test model", thinkingLevels: ["low"] },
        {
          id: "codex-reason",
          name: "Codex reasoning test model",
          thinkingLevels: ["low", "high"],
        },
      ],
    },
  ],
};

async function mockAi(page: Page) {
  const state = {
    settings: null as AiSettings | null,
    connections: [] as AiConnection[],
    login: null as AiLoginState | null,
    completeDeviceLogin: false,
    starts: [] as { provider: string; method: AiAuthMethod }[],
    responses: [] as { promptId: string; value: string }[],
    disconnects: [] as string[],
    saves: [] as AiSettings[],
  };
  function completeLogin() {
    if (!state.login) throw new Error("Login not started");
    state.connections = [
      ...state.connections.filter(
        (connection) => connection.provider !== state.login?.provider,
      ),
      { provider: state.login.provider, method: state.login.method },
    ];
    state.login = { ...state.login, status: "complete", prompt: undefined };
  }
  await page.route("**/api/auth/ai/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === "/api/auth/ai/catalog") {
      await route.fulfill({ json: catalog });
    } else if (path === "/api/auth/ai/settings") {
      if (request.method() === "PUT") {
        state.settings = request.postDataJSON();
        if (!state.settings) throw new Error("Missing saved settings");
        state.saves.push(state.settings);
      }
      await route.fulfill({ json: { settings: state.settings } });
    } else if (path === "/api/auth/ai/connections") {
      await route.fulfill({ json: { connections: state.connections } });
    } else if (
      path === "/api/auth/ai/connections/openai" &&
      request.method() === "DELETE"
    ) {
      state.disconnects.push("openai");
      state.connections = state.connections.filter(
        (connection) => connection.provider !== "openai",
      );
      if (state.settings?.provider === "openai") state.settings = null;
      await route.fulfill({ json: { ok: true } });
    } else if (path === "/api/auth/ai/logins" && request.method() === "POST") {
      const { provider, method }: { provider: string; method: AiAuthMethod } =
        request.postDataJSON();
      if (
        !catalog.providers.some(
          (option) =>
            option.id === provider && option.authMethods.includes(method),
        )
      )
        throw new Error(`Unsupported test login: ${provider} ${method}`);
      state.starts.push({ provider, method });
      state.login = {
        id: "test-login",
        provider,
        method,
        status: "pending",
        events:
          method === "oauth"
            ? [
                {
                  type: "device_code",
                  verificationUri: "https://login.example.test/device",
                  userCode: "TEST-1234",
                },
                {
                  type: "info",
                  message: "Enter the code on the verification page",
                },
              ]
            : [],
        prompt:
          method === "api_key"
            ? {
                id: "key-prompt",
                type: "secret",
                message: "Enter the simulated API key",
              }
            : undefined,
      };
      await route.fulfill({ json: { login: state.login } });
    } else if (
      path === "/api/auth/ai/logins/test-login/respond" &&
      request.method() === "POST"
    ) {
      if (state.login?.method !== "api_key")
        throw new Error("Device login must not submit a prompt response");
      state.responses.push(request.postDataJSON());
      completeLogin();
      await route.fulfill({ json: { login: state.login } });
    } else if (path === "/api/auth/ai/logins/test-login") {
      if (request.method() === "DELETE") {
        state.login = null;
        await route.fulfill({ json: { ok: true } });
      } else {
        if (state.completeDeviceLogin && state.login?.status === "pending")
          completeLogin();
        await route.fulfill({ json: { login: state.login } });
      }
    } else
      throw new Error(`Unexpected AI request: ${request.method()} ${path}`);
  });
  return state;
}

async function blockExternalRequests(page: Page, baseURL: string | undefined) {
  if (!baseURL) throw new Error("Missing test base URL");
  const origin = new URL(baseURL).origin;
  const externalRequests: string[] = [];
  async function guard(route: Route) {
    if (new URL(route.request().url()).origin === origin) {
      await route.fallback();
    } else {
      externalRequests.push(route.request().url());
      await route.abort();
    }
  }
  await page.context().route("**/*", guard);
  await page.route("**/*", guard);
  return externalRequests;
}

for (const colorScheme of ["light", "dark"] as const) {
  for (const width of [320, 1280]) {
    for (const authMethod of ["oauth", "api_key"] as const) {
      test(`${colorScheme} AI settings at ${width}px: ${authMethod}, keyboard search and reload`, async ({
        page,
        baseURL,
      }) => {
        test.setTimeout(60_000);
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
        await mockWorkspace(page);
        const state = await mockAi(page);
        const externalRequests = await blockExternalRequests(page, baseURL);
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
        const provider = connections.getByRole("combobox", {
          name: "Provider",
          exact: true,
        });
        await provider.click();
        await expect(
          connections.getByRole("option", {
            name: "OpenAI openai",
            exact: true,
          }),
        ).toHaveCount(0);
        await expect(
          connections.getByRole("option", {
            name: "OpenAI Codex (legacy) openai-codex",
            exact: true,
          }),
        ).toBeVisible();
        await provider.press("Escape");
        await method.selectOption("api_key");
        await provider.click();
        await expect(
          connections.getByRole("option", {
            name: "OpenAI openai",
            exact: true,
          }),
        ).toBeVisible();
        await expect(
          connections.getByRole("listbox").getByRole("option"),
        ).toHaveCount(1);
        await provider.press("Escape");
        await method.selectOption(authMethod);
        const useKey = authMethod === "api_key";
        const selectedProvider = useKey ? "openai" : "openai-codex";
        const selectedName = useKey ? "OpenAI" : "OpenAI Codex (legacy)";
        await provider.fill(useKey ? "OPENAI OPENAI" : "OPENAI-CODEX");
        await expect(
          connections.getByRole("listbox").getByRole("option"),
        ).toHaveCount(1);
        await provider.press("ArrowDown");
        await provider.press("Enter");
        expect(state.starts).toEqual([]);
        await connections
          .getByRole("button", { name: "Connect provider", exact: true })
          .click();
        const response = connections.getByLabel("Response", { exact: true });
        await expect(
          account.getByRole("button", { name: "Back to groups", exact: true }),
        ).toBeDisabled();
        await expect(
          account.getByRole("button", { name: "Cancel", exact: true }),
        ).toBeDisabled();
        await expect(
          account.getByRole("button", { name: "Save", exact: true }),
        ).toBeDisabled();
        const simulatedResponse = "fake-browser-api-key";
        if (useKey) {
          await expect(response).toHaveAttribute("type", "password");
          await response.fill(simulatedResponse);
          // A mocked poll must not erase a response the user is typing.
          await page.waitForResponse(
            (result) =>
              new URL(result.url()).pathname ===
                "/api/auth/ai/logins/test-login" &&
              result.request().method() === "GET",
          );
          await expect(response).toHaveValue(simulatedResponse);
        } else {
          const link = connections.getByRole("link", {
            name: "Open sign-in page",
          });
          await expect(link).toHaveCount(1);
          await expect(link).toHaveAttribute(
            "href",
            "https://login.example.test/device",
          );
          await expect(link).toHaveAttribute("target", "_blank");
          await expect(link).toHaveAttribute("rel", "noopener noreferrer");
          await expect(link).toHaveAttribute("referrerpolicy", "no-referrer");
          await expect(connections.getByText("TEST-1234")).toBeVisible();
          await expect(
            connections.getByText("Enter the code on the verification page"),
          ).toBeVisible();
          await expect(response).toHaveCount(0);
          await expect(
            connections.getByRole("combobox", { name: "Response" }),
          ).toHaveCount(0);
          await expect(
            connections.getByRole("button", { name: "Continue", exact: true }),
          ).toHaveCount(0);
        }
        expect(
          await page.evaluate(() => JSON.stringify(localStorage)),
        ).not.toContain(simulatedResponse);
        await expectNoOverflow(page);
        await accessible(page);
        if (useKey) {
          await connections
            .getByRole("button", { name: "Continue", exact: true })
            .click();
        } else {
          state.completeDeviceLogin = true;
        }
        await expect(
          connections.getByText("Provider connection saved", { exact: true }),
        ).toBeVisible();
        await expect(response).toHaveCount(0);
        expect(state.responses).toEqual(
          useKey ? [{ promptId: "key-prompt", value: simulatedResponse }] : [],
        );
        expect(state.starts).toEqual([
          { provider: selectedProvider, method: authMethod },
        ]);
        expect(state.connections).toEqual([
          { provider: selectedProvider, method: authMethod },
        ]);
        expect(state.saves).toEqual([]);
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
        await modelProvider.click();
        await expect(ai.getByRole("listbox").getByRole("option")).toHaveCount(
          1,
        );
        await expect(
          ai.getByRole("option", {
            name: `${selectedName} ${selectedProvider}`,
            exact: true,
          }),
        ).toBeVisible();
        await modelProvider.fill(selectedProvider.toUpperCase());
        await modelProvider.press("Enter");
        const modelId = useKey ? "gpt-reason" : "codex-reason";
        const modelName = useKey
          ? "GPT reasoning test model"
          : "Codex reasoning test model";
        const model = ai.getByRole("combobox", { name: "Model", exact: true });
        await model.fill(modelId.toUpperCase());
        await expect(ai.getByRole("listbox").getByRole("option")).toHaveCount(
          1,
        );
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
          { provider: selectedProvider, model: modelId, thinkingLevel: "high" },
        ]);
        // AI save must not submit the username form.
        await expect(account).toBeVisible();
        await expect(
          ai.getByRole("button", { name: "Save AI settings" }),
        ).toBeDisabled();
        await page.reload();
        await expect(modelProvider).toHaveValue(selectedName);
        await expect(model).toHaveValue(modelName);
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
}

test("stored OpenAI OAuth disconnects without remapping saved preferences to Codex", async ({
  page,
  baseURL,
}) => {
  await mockWorkspace(page);
  const state = await mockAi(page);
  const externalRequests = await blockExternalRequests(page, baseURL);
  const saved: AiSettings = {
    provider: "openai",
    model: "gpt-test",
    thinkingLevel: "off",
  };
  state.settings = saved;
  state.connections = [
    { provider: "openai", method: "oauth" },
    { provider: "openai-codex", method: "oauth" },
  ];
  await page.goto("/?account=settings");
  const ai = page.getByRole("region", { name: "AI settings", exact: true });
  const connections = ai.getByRole("region", { name: "Provider connections" });
  const legacy = connections
    .getByRole("listitem")
    .filter({ has: page.getByText("OpenAI", { exact: true }) });
  await expect(
    legacy.getByText("Sign in with an account", { exact: true }),
  ).toBeVisible();
  const modelProvider = ai.getByRole("combobox", {
    name: "Provider",
    exact: true,
  });
  const model = ai.getByRole("combobox", { name: "Model", exact: true });
  await expect(modelProvider).toHaveValue("OpenAI");
  await expect(model).toHaveValue("GPT test model");
  const disconnect = legacy.getByRole("button", {
    name: "Disconnect",
    exact: true,
  });
  await expect(disconnect).toHaveAccessibleDescription("OpenAI");
  await disconnect.focus();
  await disconnect.press("Enter");
  await expect(
    connections.getByText("Provider disconnected", { exact: true }),
  ).toBeVisible();
  await expect(legacy).toHaveCount(0);
  await expect(
    connections.getByText("OpenAI Codex (legacy)", { exact: true }),
  ).toBeVisible();
  expect(state.disconnects).toEqual(["openai"]);
  expect(state.connections).toEqual([
    { provider: "openai-codex", method: "oauth" },
  ]);
  expect(state.settings).toBeNull();
  expect(state.saves).toEqual([]);
  expect(state.starts).toEqual([]);
  await page.reload();
  await expect(modelProvider).toHaveValue("");
  await expect(model).toHaveValue("");
  await expect(
    ai.getByText(
      "The saved provider or model is no longer available. Select a current model.",
    ),
  ).toHaveCount(0);
  await expect(
    ai.getByRole("button", { name: "Save AI settings" }),
  ).toBeDisabled();
  expect(state.settings).toBeNull();
  expect(state.saves).toEqual([]);
  await expectNoOverflow(page);
  await accessible(page);
  expect(externalRequests).toEqual([]);
});
