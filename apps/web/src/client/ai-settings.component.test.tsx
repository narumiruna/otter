// @vitest-environment jsdom

import type {
  AiCatalogResponse,
  AiConnection,
  AiSettings as Settings,
} from "@narumitw/otter-contracts";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { AiSettings } from "./ai-settings.js";
import { I18nProvider } from "./i18n.js";

const catalog: AiCatalogResponse = {
  authenticationEnabled: true,
  providers: [
    {
      id: "alpha",
      name: "Alpha",
      authMethods: ["oauth", "api_key"],
      models: [
        {
          id: "fast",
          name: "Fast model",
          thinkingLevels: ["off", "low", "high"],
        },
        {
          id: "reason",
          name: "Reasoning model",
          thinkingLevels: ["low", "high"],
        },
        { id: "deep", name: "Deep model", thinkingLevels: ["high"] },
      ],
    },
    {
      id: "beta",
      name: "Beta",
      authMethods: ["api_key"],
      models: [
        { id: "beta-model", name: "Beta model", thinkingLevels: ["off"] },
      ],
    },
    {
      id: "unconnected",
      name: "Unconnected",
      authMethods: ["oauth"],
      models: [{ id: "hidden", name: "Hidden model", thinkingLevels: ["off"] }],
    },
  ],
};
const initial: Settings = {
  provider: "alpha",
  model: "fast",
  thinkingLevel: "off",
};

function server(settings: Settings | null = null) {
  const state = {
    settings,
    connections: [
      { provider: "alpha", method: "oauth" },
      { provider: "beta", method: "api_key" },
    ] as AiConnection[],
    loadFailures: 0,
    saveFailures: 0,
    saveResponse: null as Promise<Response> | null,
  };
  const fetch = vi.fn(
    async (url: string, init?: RequestInit): Promise<Response> => {
      if (url === "/api/auth/ai/catalog") {
        if (state.loadFailures-- > 0)
          return Response.json({ error: "Unavailable" }, { status: 503 });
        return Response.json(catalog);
      }
      if (url === "/api/auth/ai/connections")
        return Response.json({ connections: state.connections });
      if (url === "/api/auth/ai/settings") {
        if (init?.method === "PUT") {
          if (state.saveFailures-- > 0)
            return Response.json({ error: "Unavailable" }, { status: 503 });
          if (state.saveResponse) return state.saveResponse;
          state.settings = JSON.parse(String(init.body));
        }
        return Response.json({ settings: state.settings });
      }
      throw new Error(`Unexpected request: ${init?.method ?? "GET"} ${url}`);
    },
  );
  vi.stubGlobal("fetch", fetch);
  return { state, fetch };
}

function setup(props: { offline?: boolean; disabled?: boolean } = {}) {
  const onMutationChange = vi.fn();
  const view = render(
    <I18nProvider initialLocale="en">
      <AiSettings
        disabled={props.disabled ?? false}
        offline={props.offline ?? false}
        onMutationChange={onMutationChange}
      />
    </I18nProvider>,
  );
  return { ...view, onMutationChange, user: userEvent.setup() };
}

async function loaded() {
  await screen.findByRole("region", { name: "Provider connections" });
}

async function choose(
  user: ReturnType<typeof userEvent.setup>,
  label: string,
  name: string,
) {
  await user.click(screen.getByRole("combobox", { name: label }));
  await user.click(screen.getByRole("option", { name }));
}

afterEach(() => vi.unstubAllGlobals());

test("only connected providers can be selected and a valid dirty choice is required", async () => {
  const { fetch } = server();
  const { user } = setup();
  await loaded();
  const save = screen.getByRole("button", { name: "Save AI settings" });
  expect(save).toBeDisabled();
  expect(screen.getByRole("combobox", { name: "Model" })).toBeDisabled();
  await user.click(screen.getByRole("combobox", { name: "Provider" }));
  expect(screen.getAllByRole("option")).toHaveLength(3); // Two providers and the empty thinking level.
  expect(
    screen.queryByRole("option", { name: /Unconnected/ }),
  ).not.toBeInTheDocument();
  await user.click(screen.getByRole("option", { name: "Alpha alpha" }));
  expect(save).toBeDisabled();
  await choose(user, "Model", "Reasoning model reason");
  const level = screen.getByRole("combobox", { name: "Thinking level" });
  expect(level).toHaveValue("low");
  expect(
    within(level).queryByRole("option", { name: "Off" }),
  ).not.toBeInTheDocument();
  expect(save).toBeEnabled();
  expect(
    fetch.mock.calls.filter(([, init]) => init?.method === "PUT"),
  ).toHaveLength(0);
  await choose(user, "Provider", "Beta beta");
  expect(screen.getByRole("combobox", { name: "Model" })).toHaveValue("");
  expect(level).toBeDisabled();
  expect(save).toBeDisabled();
});

test("model changes preserve supported thinking levels and otherwise select the first supported level", async () => {
  server(initial);
  const { user } = setup();
  await loaded();
  const level = screen.getByRole("combobox", { name: "Thinking level" });
  await user.selectOptions(level, "high");
  await choose(user, "Model", "Reasoning model reason");
  expect(level).toHaveValue("high");
  await user.selectOptions(level, "low");
  await choose(user, "Model", "Deep model deep");
  expect(level).toHaveValue("high");
});

test("explicitly saves preferences, reports success, and restores them after remount", async () => {
  const { state, fetch } = server(initial);
  const { user, unmount, onMutationChange } = setup();
  await loaded();
  const save = screen.getByRole("button", { name: "Save AI settings" });
  expect(save).toBeDisabled();
  await user.selectOptions(
    screen.getByRole("combobox", { name: "Thinking level" }),
    "high",
  );
  await user.click(save);
  expect(await screen.findByText("AI settings saved")).toBeVisible();
  expect(state.settings).toEqual({ ...initial, thinkingLevel: "high" });
  expect(
    fetch.mock.calls.find(([, init]) => init?.method === "PUT")?.[1],
  ).toMatchObject({
    credentials: "same-origin",
    body: JSON.stringify({ ...initial, thinkingLevel: "high" }),
  });
  expect(onMutationChange.mock.calls).toEqual([[true], [false]]);
  expect(save).toBeDisabled();
  unmount();
  setup();
  await loaded();
  expect(screen.getByRole("combobox", { name: "Provider" })).toHaveValue(
    "Alpha",
  );
  expect(screen.getByRole("combobox", { name: "Model" })).toHaveValue(
    "Fast model",
  );
  expect(screen.getByRole("combobox", { name: "Thinking level" })).toHaveValue(
    "high",
  );
  expect(
    screen.getByRole("button", { name: "Save AI settings" }),
  ).toBeDisabled();
});

test("load and save errors can be retried without losing the draft", async () => {
  const { state } = server(initial);
  state.loadFailures = 1;
  state.saveFailures = 1;
  const { user, onMutationChange } = setup();
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Unable to load AI settings",
  );
  expect(screen.getByRole("combobox", { name: "Provider" })).toBeDisabled();
  await user.click(screen.getByRole("button", { name: "Reload" }));
  await loaded();
  await user.selectOptions(
    screen.getByRole("combobox", { name: "Thinking level" }),
    "low",
  );
  await user.click(screen.getByRole("button", { name: "Save AI settings" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Unable to save AI settings",
  );
  expect(screen.getByRole("combobox", { name: "Thinking level" })).toHaveValue(
    "low",
  );
  expect(onMutationChange).toHaveBeenLastCalledWith(false);
  await user.click(screen.getByRole("button", { name: "Save AI settings" }));
  expect(await screen.findByText("AI settings saved")).toBeVisible();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

test("locks actions throughout a save and prevents duplicate mutations", async () => {
  const { state, fetch } = server(initial);
  let resolve: (value: Response) => void = () => {
    throw new Error("Save not pending");
  };
  state.saveResponse = new Promise<Response>((done) => {
    resolve = done;
  });
  const { user, onMutationChange } = setup();
  await loaded();
  await user.selectOptions(
    screen.getByRole("combobox", { name: "Thinking level" }),
    "high",
  );
  const save = screen.getByRole("button", { name: "Save AI settings" });
  fireEvent.click(save);
  fireEvent.click(save);
  await waitFor(() => expect(onMutationChange).toHaveBeenCalledWith(true));
  expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
  expect(screen.getByRole("combobox", { name: "Provider" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Add provider" })).toBeDisabled();
  expect(
    fetch.mock.calls.filter(([, init]) => init?.method === "PUT"),
  ).toHaveLength(1);
  expect(onMutationChange).not.toHaveBeenCalledWith(false);
  await act(async () =>
    resolve(Response.json({ settings: { ...initial, thinkingLevel: "high" } })),
  );
  expect(await screen.findByText("AI settings saved")).toBeVisible();
  expect(onMutationChange).toHaveBeenLastCalledWith(false);
});

test("offline mounting sends no requests and reconnecting loads the current account", async () => {
  const { fetch } = server(initial);
  const { rerender, onMutationChange } = setup({ offline: true });
  expect(fetch).not.toHaveBeenCalled();
  expect(screen.getByRole("combobox", { name: "Provider" })).toBeDisabled();
  expect(
    screen.getByRole("button", { name: "Save AI settings" }),
  ).toBeDisabled();
  rerender(
    <I18nProvider initialLocale="en">
      <AiSettings
        disabled={false}
        offline={false}
        onMutationChange={onMutationChange}
      />
    </I18nProvider>,
  );
  await loaded();
  rerender(
    <I18nProvider initialLocale="en">
      <AiSettings
        disabled={false}
        offline
        onMutationChange={onMutationChange}
      />
    </I18nProvider>,
  );
  expect(screen.getByRole("button", { name: "Add provider" })).toBeDisabled();
  for (const button of screen.getAllByRole("button", { name: "Disconnect" }))
    expect(button).toBeDisabled();
});

test("a missing saved model is not silently replaced or saved", async () => {
  server({ ...initial, model: "removed" });
  setup();
  await loaded();
  expect(
    screen.getByText(
      "The saved provider or model is no longer available. Select a current model.",
    ),
  ).toBeVisible();
  expect(screen.getByRole("combobox", { name: "Model" })).toHaveValue(
    "removed",
  );
  expect(
    screen.getByRole("button", { name: "Save AI settings" }),
  ).toBeDisabled();
});
