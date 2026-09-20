// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import { ApiTokenSettings } from "./api-token-settings.js";
import { api } from "./client-support.js";

vi.mock("./client-support.js", () => ({ api: vi.fn() }));

const token = {
  createdAt: "2026-09-20T00:00:00.000Z",
  expiresAt: "2026-12-19T00:00:00.000Z",
  id: "token-1",
  name: "Travel agent",
};

beforeEach(() => {
  vi.mocked(api).mockReset();
});

test("API token settings does not request data while offline", () => {
  const view = render(<ApiTokenSettings offline />);

  expect(api).not.toHaveBeenCalled();
  expect(view.getByRole("button", { name: "建立 API token" })).toBeDisabled();
});

test("creates a token, shows its secret once, and copies it", async () => {
  vi.mocked(api).mockImplementation(async (url, init) => {
    if (url === "/api/auth/tokens" && init?.method === undefined) {
      return { tokens: [] };
    }
    if (url === "/api/auth/tokens" && init?.method === "POST") {
      return { accessToken: "otter_api_secret", token };
    }
    throw new Error(`Unexpected API request: ${url}`);
  });
  const user = userEvent.setup();
  const clipboardWrite = vi.spyOn(navigator.clipboard, "writeText");
  const view = render(<ApiTokenSettings offline={false} />);

  expect(await view.findByText("沒有有效的 API token。")).toBeVisible();
  await user.type(
    view.getByRole("textbox", { name: "Token 名稱" }),
    token.name,
  );
  await user.click(view.getByRole("button", { name: "建立 API token" }));

  const secret = await view.findByRole("region", { name: "新的 API token" });
  expect(secret).toHaveTextContent("otter_api_secret");
  expect(view.getByText(token.name)).toBeVisible();
  expect(api).toHaveBeenCalledWith("/api/auth/tokens", {
    body: JSON.stringify({ name: token.name }),
    method: "POST",
  });

  await user.click(view.getByRole("button", { name: "複製 token" }));
  expect(clipboardWrite).toHaveBeenCalledWith("otter_api_secret");
  expect(await view.findByText("API token 已複製")).toBeVisible();

  await user.click(view.getByRole("button", { name: "完成" }));
  expect(
    view.queryByRole("region", { name: "新的 API token" }),
  ).not.toBeInTheDocument();
});

test("clears a one-time secret when its token is revoked", async () => {
  vi.mocked(api).mockImplementation(async (url, init) => {
    if (url === "/api/auth/tokens" && init?.method === undefined) {
      return { tokens: [] };
    }
    if (url === "/api/auth/tokens" && init?.method === "POST") {
      return { accessToken: "otter_api_secret", token };
    }
    if (url === "/api/auth/tokens/token-1" && init?.method === "DELETE") {
      return { ok: true };
    }
    throw new Error(`Unexpected API request: ${url}`);
  });
  const user = userEvent.setup();
  const view = render(<ApiTokenSettings offline={false} />);

  await view.findByText("沒有有效的 API token。");
  await user.type(
    view.getByRole("textbox", { name: "Token 名稱" }),
    token.name,
  );
  await user.click(view.getByRole("button", { name: "建立 API token" }));
  expect(
    await view.findByRole("region", { name: "新的 API token" }),
  ).toHaveTextContent("otter_api_secret");

  await user.click(
    view.getByRole("button", { name: "撤銷 API token「Travel agent」" }),
  );

  expect(await view.findByText("API token 已撤銷")).toBeVisible();
  expect(
    view.queryByRole("region", { name: "新的 API token" }),
  ).not.toBeInTheDocument();
  expect(view.queryByRole("button", { name: "複製 token" })).toBeNull();
});

test("does not refresh the token list during a revocation", async () => {
  let listRequests = 0;
  let resolveDelete: (value: { ok: true }) => void = () => undefined;
  const deleteRequest = new Promise<{ ok: true }>((resolve) => {
    resolveDelete = resolve;
  });
  vi.mocked(api).mockImplementation(async (url, init) => {
    if (url === "/api/auth/tokens" && init?.method === undefined) {
      listRequests += 1;
      return { tokens: [token] };
    }
    if (url === "/api/auth/tokens/token-1" && init?.method === "DELETE") {
      return deleteRequest;
    }
    throw new Error(`Unexpected API request: ${url}`);
  });
  const user = userEvent.setup();
  const view = render(<ApiTokenSettings offline={false} />);

  expect(await view.findByText(token.name)).toBeVisible();
  await user.click(
    view.getByRole("button", { name: "撤銷 API token「Travel agent」" }),
  );
  view.rerender(<ApiTokenSettings offline />);
  view.rerender(<ApiTokenSettings offline={false} />);
  await act(async () => undefined);
  expect(listRequests).toBe(1);

  await act(async () => resolveDelete({ ok: true }));
  expect(await view.findByText("API token 已撤銷")).toBeVisible();
  expect(view.queryByText(token.name)).not.toBeInTheDocument();
});

test("preserves the revoke error after refreshing tokens", async () => {
  let listRequests = 0;
  vi.mocked(api).mockImplementation(async (url, init) => {
    if (url === "/api/auth/tokens" && init?.method === undefined) {
      listRequests += 1;
      return { tokens: [token] };
    }
    if (url === "/api/auth/tokens/token-1" && init?.method === "DELETE") {
      throw new Error("delete failed");
    }
    throw new Error(`Unexpected API request: ${url}`);
  });
  const user = userEvent.setup();
  const view = render(<ApiTokenSettings offline={false} />);

  expect(await view.findByText(token.name)).toBeVisible();
  await user.click(
    view.getByRole("button", { name: "撤銷 API token「Travel agent」" }),
  );

  expect(await view.findByRole("alert")).toHaveTextContent(
    "無法撤銷 API token",
  );
  expect(view.getByText(token.name)).toBeVisible();
  expect(listRequests).toBe(2);
});

test("lists and revokes an active token", async () => {
  vi.mocked(api).mockImplementation(async (url, init) => {
    if (url === "/api/auth/tokens" && init?.method === undefined) {
      return { tokens: [token] };
    }
    if (url === "/api/auth/tokens/token-1" && init?.method === "DELETE") {
      return { ok: true };
    }
    throw new Error(`Unexpected API request: ${url}`);
  });
  const user = userEvent.setup();
  const view = render(<ApiTokenSettings offline={false} />);

  expect(await view.findByText(token.name)).toBeVisible();
  await user.click(
    view.getByRole("button", { name: "撤銷 API token「Travel agent」" }),
  );

  await waitFor(() =>
    expect(api).toHaveBeenCalledWith("/api/auth/tokens/token-1", {
      method: "DELETE",
    }),
  );
  expect(view.getByText("API token 已撤銷")).toBeVisible();
  expect(view.getByText("沒有有效的 API token。")).toBeVisible();
  expect(view.queryByText(token.name)).not.toBeInTheDocument();
});
