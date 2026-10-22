// @vitest-environment jsdom

import type {
  AiConnection,
  AiLoginState,
  AiProviderOption,
} from "@narumitw/otter-contracts";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { AiProviderConnections } from "./ai-provider-connections.js";
import { I18nProvider } from "./i18n.js";

const providers: AiProviderOption[] = [
  {
    id: "both",
    name: "Both methods",
    authMethods: ["oauth", "api_key"],
    models: [],
  },
  { id: "key-only", name: "Key only", authMethods: ["api_key"], models: [] },
  {
    id: "oauth-only",
    name: "Account only",
    authMethods: ["oauth"],
    models: [],
  },
  { id: "unavailable", name: "Unavailable", authMethods: [], models: [] },
  {
    id: "openai",
    name: "OpenAI",
    authMethods: ["api_key"],
    models: [
      { id: "gpt-test", name: "GPT test model", thinkingLevels: ["off"] },
    ],
  },
  {
    id: "openai-codex",
    name: "OpenAI Codex (legacy)",
    authMethods: ["oauth"],
    models: [
      { id: "codex-test", name: "Codex test model", thinkingLevels: ["low"] },
    ],
  },
];

function setup(
  options: {
    disabled?: boolean;
    authenticationEnabled?: boolean;
    connections?: AiConnection[];
  } = {},
) {
  const state = {
    login: {
      id: "login-1",
      provider: "both",
      method: "oauth",
      status: "pending",
      events: [],
    } as AiLoginState,
    startFailures: 0,
    responseFailures: 0,
    cancelFailures: 0,
    disconnectFailures: 0,
    pollFailures: 0,
    pollStatus: 503,
    cancelStatus: 503,
  };
  const fetch = vi.fn(async (url: string, init?: RequestInit) => {
    if (url === "/api/auth/ai/logins" && init?.method === "POST") {
      if (state.startFailures-- > 0)
        return Response.json({ error: "Unavailable" }, { status: 503 });
      return Response.json({ login: state.login });
    }
    if (
      url === "/api/auth/ai/logins/login-1/respond" &&
      init?.method === "POST"
    ) {
      if (state.responseFailures-- > 0)
        return Response.json({ error: "Unavailable" }, { status: 503 });
      return Response.json({ login: state.login });
    }
    if (url === "/api/auth/ai/logins/login-1") {
      if (init?.method === "DELETE") {
        if (state.cancelFailures-- > 0)
          return Response.json(
            { error: "Unavailable" },
            { status: state.cancelStatus },
          );
        return Response.json({ ok: true });
      }
      if (state.pollFailures-- > 0)
        return Response.json(
          { error: "Unavailable" },
          { status: state.pollStatus },
        );
      return Response.json({ login: state.login });
    }
    if (
      (url === "/api/auth/ai/connections/both" ||
        url === "/api/auth/ai/connections/openai") &&
      init?.method === "DELETE"
    ) {
      if (state.disconnectFailures-- > 0)
        return Response.json({ error: "Unavailable" }, { status: 503 });
      return Response.json({ ok: true });
    }
    throw new Error(`Unexpected request: ${init?.method ?? "GET"} ${url}`);
  });
  vi.stubGlobal("fetch", fetch);
  const onChange = vi.fn(async (): Promise<void> => undefined);
  const onMutationChange = vi.fn();
  const props = {
    authenticationEnabled: options.authenticationEnabled ?? true,
    connections: options.connections ?? [],
    disabled: options.disabled ?? false,
    providers,
    onChange,
    onMutationChange,
  };
  const view = render(
    <I18nProvider initialLocale="en">
      <AiProviderConnections {...props} />
    </I18nProvider>,
  );
  return { ...view, state, fetch, onChange, onMutationChange, props };
}

async function click(name: string) {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name }));
  });
}

async function selectProvider(id = "both", method = "oauth") {
  await click("Add provider");
  fireEvent.change(
    screen.getByRole("combobox", { name: "Authentication method" }),
    { target: { value: method } },
  );
  fireEvent.focus(screen.getByRole("combobox", { name: "Provider" }));
  fireEvent.click(
    screen.getByRole("option", {
      name: `${providers.find((provider) => provider.id === id)?.name} ${id}`,
    }),
  );
}

async function tick(milliseconds: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(milliseconds);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test("chooses an authentication method first, filters providers, and starts only on explicit Connect", async () => {
  const { fetch, state } = setup();
  state.login = { ...state.login, provider: "openai", method: "api_key" };
  await click("Add provider");
  const method = screen.getByRole("combobox", {
    name: "Authentication method",
  });
  expect(method).toHaveValue("oauth");
  expect(
    within(method).getByRole("option", { selected: true }),
  ).toHaveTextContent("Sign in with an account");
  const provider = screen.getByRole("combobox", { name: "Provider" });
  fireEvent.focus(provider);
  expect(
    within(screen.getByRole("listbox")).getAllByRole("option"),
  ).toHaveLength(3);
  expect(
    screen.queryByRole("option", { name: "OpenAI openai" }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("option", {
      name: "OpenAI Codex (legacy) openai-codex",
    }),
  ).toBeVisible();
  expect(
    screen.queryByRole("option", { name: "Key only key-only" }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("option", { name: "Both methods both" }));
  expect(fetch).not.toHaveBeenCalled();
  fireEvent.change(method, { target: { value: "api_key" } });
  expect(provider).toHaveValue("");
  expect(
    screen.getByRole("button", { name: "Connect provider" }),
  ).toBeDisabled();
  fireEvent.focus(provider);
  expect(
    screen.queryByRole("option", { name: "Account only oauth-only" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("option", { name: "Unavailable unavailable" }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("option", { name: "OpenAI openai" })).toBeVisible();
  expect(
    screen.queryByRole("option", {
      name: "OpenAI Codex (legacy) openai-codex",
    }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("option", { name: "OpenAI openai" }));
  expect(fetch).not.toHaveBeenCalled();
  await click("Connect provider");
  expect(fetch.mock.calls[0]).toEqual([
    "/api/auth/ai/logins",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ provider: "openai", method: "api_key" }),
    }),
  ]);
});

test("masks an SDK secret prompt, sends it only in the response body, clears it, and blocks duplicate responses", async () => {
  const { state, fetch, onChange, onMutationChange } = setup();
  state.login = {
    ...state.login,
    method: "api_key",
    prompt: {
      id: "key-prompt",
      type: "secret",
      message: "Enter the test API key",
      placeholder: "API key",
    },
  };
  await selectProvider("both", "api_key");
  await click("Connect provider");
  expect(onMutationChange.mock.calls).toEqual([[true]]);
  const input = screen.getByLabelText("Response");
  expect(input).toHaveAttribute("type", "password");
  expect(input).toHaveAttribute("autocomplete", "off");
  expect(input).toHaveAccessibleDescription("Enter the test API key");
  fireEvent.change(input, { target: { value: "fake-test-secret" } });
  expect(JSON.stringify(localStorage)).not.toContain("fake-test-secret");
  expect(fetch.mock.calls).toHaveLength(1);
  state.login = { ...state.login, status: "complete", prompt: undefined };
  const submit = screen.getByRole("button", { name: "Continue" });
  await act(async () => {
    fireEvent.click(submit);
    fireEvent.click(submit);
  });
  const responses = fetch.mock.calls.filter(([url]) =>
    url.endsWith("/respond"),
  );
  expect(responses).toHaveLength(1);
  expect(responses[0]).toEqual([
    "/api/auth/ai/logins/login-1/respond",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({
        promptId: "key-prompt",
        value: "fake-test-secret",
      }),
    }),
  ]);
  expect(input).toHaveValue("");
  expect(screen.queryByLabelText("Response")).not.toBeInTheDocument();
  expect(onChange).toHaveBeenCalledOnce();
  expect(onMutationChange.mock.calls).toEqual([[true], [false]]);
  expect(screen.getByText("Provider connection saved")).toBeVisible();
  expect(JSON.stringify(localStorage)).not.toContain("fake-test-secret");
  expect(document.body).not.toHaveTextContent("fake-test-secret");
});

test("cancel clears the secret and unlocks only after the pending login is removed", async () => {
  const { state, fetch, onMutationChange } = setup();
  state.login.prompt = { id: "secret", type: "secret", message: "API key" };
  state.cancelFailures = 1;
  await selectProvider("both", "api_key");
  await click("Connect provider");
  const input = screen.getByLabelText("Response");
  fireEvent.change(input, { target: { value: "cancelled-test-secret" } });
  await click("Cancel connection");
  expect(input).toHaveValue("");
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Provider sign-in failed",
  );
  expect(onMutationChange).not.toHaveBeenCalledWith(false);
  await click("Cancel connection");
  expect(screen.getByRole("button", { name: "Add provider" })).toBeEnabled();
  expect(onMutationChange).toHaveBeenLastCalledWith(false);
  expect(
    fetch.mock.calls.filter(([, init]) => init?.method === "DELETE"),
  ).toHaveLength(2);
});

test("OAuth displays safe new-window links, events and manual prompts without erasing typed text during polling", async () => {
  const { state, onMutationChange, onChange } = setup();
  state.login.events = [
    {
      type: "auth_url",
      url: "https://login.example.test/authorize",
      instructions: "Use your test account",
    },
    { type: "info", message: "Waiting for authorization" },
    { type: "progress", message: "Test login started" },
  ];
  state.login.prompt = {
    id: "manual",
    type: "manual_code",
    message: "Paste the final redirect URL",
  };
  await selectProvider();
  await click("Connect provider");
  const link = screen.getByRole("link", { name: "Open sign-in page" });
  expect(link).toHaveAttribute("href", "https://login.example.test/authorize");
  expect(link).toHaveAttribute("target", "_blank");
  expect(link).toHaveAttribute("rel", "noopener noreferrer");
  expect(link).toHaveAttribute("referrerpolicy", "no-referrer");
  expect(screen.getByText("Waiting for authorization")).toBeVisible();
  expect(screen.getByText("Test login started")).toBeVisible();
  const input = screen.getByLabelText("Response");
  fireEvent.change(input, { target: { value: "partly typed redirect" } });
  await tick(500);
  expect(input).toHaveValue("partly typed redirect");
  expect(onMutationChange.mock.calls).toEqual([[true]]);
  state.login = { ...state.login, status: "complete", prompt: undefined };
  await tick(1000);
  expect(onChange).toHaveBeenCalledOnce();
  expect(onMutationChange.mock.calls).toEqual([[true], [false]]);
  expect(screen.getByRole("button", { name: "Add provider" })).toBeEnabled();
});

test("poll completion keeps the mutation lock until connection refresh finishes", async () => {
  const { state, onChange, onMutationChange } = setup();
  let finishRefresh: () => void = () => {
    throw new Error("Refresh not pending");
  };
  onChange.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finishRefresh = resolve;
      }),
  );
  await selectProvider();
  await click("Connect provider");
  state.login = { ...state.login, status: "complete" };
  await tick(500);
  expect(onChange).toHaveBeenCalledOnce();
  expect(onMutationChange.mock.calls).toEqual([[true]]);
  expect(
    screen.queryByRole("button", { name: "Add provider" }),
  ).not.toBeInTheDocument();
  await act(async () => {
    finishRefresh();
  });
  expect(onMutationChange.mock.calls).toEqual([[true], [false]]);
  expect(screen.getByRole("button", { name: "Add provider" })).toBeEnabled();
  expect(screen.getByText("Provider connection saved")).toBeVisible();
});

test("Codex displays device instructions without a method prompt and completes by polling", async () => {
  const { state, fetch, onChange, onMutationChange } = setup();
  state.login.provider = "openai-codex";
  state.login.events = [
    {
      type: "device_code",
      userCode: "TEST-1234",
      verificationUri: "https://device.example.test/activate",
    },
    { type: "info", message: "Enter the code on the verification page" },
  ];
  await selectProvider("openai-codex");
  await click("Connect provider");
  expect(screen.getByText("TEST-1234")).toBeVisible();
  expect(
    screen.getByRole("link", { name: "Open sign-in page" }),
  ).toHaveAttribute("href", "https://device.example.test/activate");
  expect(
    screen.getByText("Enter the code on the verification page"),
  ).toBeVisible();
  expect(screen.queryByLabelText("Response")).not.toBeInTheDocument();
  expect(
    screen.queryByRole("combobox", { name: "Response" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Continue" }),
  ).not.toBeInTheDocument();
  expect(fetch.mock.calls[0]).toEqual([
    "/api/auth/ai/logins",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ provider: "openai-codex", method: "oauth" }),
    }),
  ]);
  state.login = { ...state.login, status: "complete" };
  await tick(500);
  expect(screen.getByText("Provider connection saved")).toBeVisible();
  expect(onChange).toHaveBeenCalledOnce();
  expect(onMutationChange).toHaveBeenLastCalledWith(false);
  expect(fetch.mock.calls.map(([url]) => url)).toEqual([
    "/api/auth/ai/logins",
    "/api/auth/ai/logins/login-1",
  ]);
});

test.each([
  "http://example.test/login",
  "javascript:alert(1)",
  "https://user:password@example.test/login",
  "not a url",
])("does not expose an unsafe authorization link: %s", async (url) => {
  const { state } = setup();
  state.login.events = [{ type: "auth_url", url }];
  await selectProvider();
  await click("Connect provider");
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
});

test("changed prompts clear old input and text/select responses use the current prompt ID", async () => {
  const { state, fetch } = setup();
  state.login.prompt = {
    id: "text",
    type: "text",
    message: "Enter a test workspace",
  };
  await selectProvider();
  await click("Connect provider");
  const input = screen.getByLabelText("Response");
  expect(input).toHaveAttribute("type", "text");
  fireEvent.change(input, { target: { value: "old workspace" } });
  state.login = {
    ...state.login,
    prompt: {
      id: "select",
      type: "select",
      message: "Select a workspace",
      options: [{ id: "work", label: "Test workspace" }],
    },
  };
  await tick(500);
  const select = screen.getByRole("combobox", { name: "Response" });
  expect(select).toHaveValue("");
  expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  fireEvent.change(select, { target: { value: "work" } });
  state.login = { ...state.login, status: "complete", prompt: undefined };
  await click("Continue");
  expect(
    fetch.mock.calls.find(([url]) => url.endsWith("/respond"))?.[1]?.body,
  ).toBe(JSON.stringify({ promptId: "select", value: "work" }));
});

test("start errors unlock and allow retry; poll errors keep the pending connection cancellable", async () => {
  const { state, onMutationChange } = setup();
  state.startFailures = 1;
  state.pollFailures = 1;
  await selectProvider();
  await click("Connect provider");
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Provider sign-in failed",
  );
  expect(onMutationChange).toHaveBeenLastCalledWith(false);
  await click("Connect provider");
  await tick(500);
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Provider sign-in failed",
  );
  expect(onMutationChange).toHaveBeenLastCalledWith(true);
  expect(
    screen.getByRole("button", { name: "Cancel connection" }),
  ).toBeEnabled();
  state.login = { ...state.login, status: "error" };
  await tick(3000);
  expect(onMutationChange).toHaveBeenLastCalledWith(false);
  expect(
    screen.getByRole("button", { name: "Connect provider" }),
  ).toBeEnabled();
});

test("failed responses clear the input, retain the pending lock, and can be retried", async () => {
  const { state, onMutationChange } = setup();
  state.responseFailures = 1;
  state.login.prompt = { id: "text", type: "text", message: "Workspace" };
  await selectProvider();
  await click("Connect provider");
  const input = screen.getByLabelText("Response");
  fireEvent.change(input, { target: { value: "first" } });
  await click("Continue");
  expect(input).toHaveValue("");
  expect(screen.getByRole("alert")).toBeVisible();
  expect(onMutationChange).not.toHaveBeenCalledWith(false);
  fireEvent.change(input, { target: { value: "second" } });
  state.login = { ...state.login, status: "complete", prompt: undefined };
  await click("Continue");
  expect(onMutationChange).toHaveBeenLastCalledWith(false);
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

test("disconnect can be retried and refreshes connections without changing model settings", async () => {
  const { state, fetch, onChange, onMutationChange } = setup({
    connections: [{ provider: "both", method: "oauth" }],
  });
  state.disconnectFailures = 1;
  await click("Disconnect");
  expect(screen.getByRole("alert")).toHaveTextContent("Unable to disconnect");
  expect(onChange).not.toHaveBeenCalled();
  expect(onMutationChange).toHaveBeenLastCalledWith(false);
  await click("Disconnect");
  expect(onChange).toHaveBeenCalledOnce();
  expect(screen.getByText("Provider disconnected")).toBeVisible();
  expect(
    fetch.mock.calls.every(([url]) => url === "/api/auth/ai/connections/both"),
  ).toBe(true);
});

test("a stored OpenAI OAuth connection stays listed and disconnects under its original provider ID", async () => {
  const { fetch, onChange } = setup({
    connections: [{ provider: "openai", method: "oauth" }],
  });
  const connection = screen.getByRole("listitem");
  expect(within(connection).getByText("OpenAI", { exact: true })).toBeVisible();
  expect(within(connection).getByText("Sign in with an account")).toBeVisible();
  expect(
    within(connection).queryByText("OpenAI Codex (legacy)"),
  ).not.toBeInTheDocument();
  expect(
    within(connection).getByRole("button", { name: "Disconnect" }),
  ).toHaveAccessibleDescription("OpenAI");
  await click("Disconnect");
  expect(fetch.mock.calls).toEqual([
    [
      "/api/auth/ai/connections/openai",
      expect.objectContaining({ method: "DELETE" }),
    ],
  ]);
  expect(onChange).toHaveBeenCalledOnce();
});

test.each([{ disabled: true }, { authenticationEnabled: false }])(
  "does not start login when unavailable: %j",
  async (options) => {
    const { fetch } = setup(options);
    expect(screen.getByRole("button", { name: "Add provider" })).toBeDisabled();
    await click("Add provider");
    expect(fetch).not.toHaveBeenCalled();
  },
);

test.each([401, 404])(
  "an unavailable login (%s) unlocks, removes its prompt, and stops polling",
  async (status) => {
    const { state, fetch, onMutationChange } = setup();
    state.login.prompt = {
      id: "expired",
      type: "secret",
      message: "Test secret",
    };
    state.pollFailures = 1;
    state.pollStatus = status;
    await selectProvider();
    await click("Connect provider");
    fireEvent.change(screen.getByLabelText("Response"), {
      target: { value: "expired-secret" },
    });
    await tick(500);
    expect(screen.getByRole("alert")).toHaveTextContent(
      status === 401 ? "Sign in first" : "Provider sign-in failed",
    );
    expect(screen.queryByLabelText("Response")).not.toBeInTheDocument();
    expect(onMutationChange).toHaveBeenLastCalledWith(false);
    const requests = fetch.mock.calls.length;
    await tick(10_000);
    expect(fetch.mock.calls).toHaveLength(requests);
    expect(
      screen.getByRole("button", { name: "Connect provider" }),
    ).toBeEnabled();
  },
);

test.each([401, 404])(
  "cancelling a login without access (%s) still closes and unlocks",
  async (status) => {
    const { state, onMutationChange, onChange } = setup();
    state.cancelFailures = 1;
    state.cancelStatus = status;
    await selectProvider();
    await click("Connect provider");
    await click("Cancel connection");
    expect(screen.getByRole("button", { name: "Add provider" })).toBeEnabled();
    if (status === 401) {
      expect(screen.getByRole("alert")).toHaveTextContent("Sign in first");
      expect(onChange).not.toHaveBeenCalled();
    } else {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(onChange).toHaveBeenCalledOnce();
    }
    expect(onMutationChange).toHaveBeenLastCalledWith(false);
  },
);

test("cancel refreshes connections when persistence finished before the next poll", async () => {
  const { state, onChange, onMutationChange } = setup();
  await selectProvider();
  await click("Connect provider");
  state.login = { ...state.login, status: "complete" };
  await click("Cancel connection");
  expect(onChange).toHaveBeenCalledOnce();
  expect(onMutationChange).toHaveBeenLastCalledWith(false);
  expect(screen.getByRole("button", { name: "Add provider" })).toBeEnabled();
});

test("unmount cancels a pending login and stops its polls", async () => {
  const { unmount, fetch } = setup();
  await selectProvider();
  await click("Connect provider");
  unmount();
  await tick(10_000);
  expect(fetch.mock.calls).toHaveLength(2);
  expect(fetch.mock.calls[1]).toEqual([
    "/api/auth/ai/logins/login-1",
    expect.objectContaining({ method: "DELETE" }),
  ]);
});
