// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import { ApiTokenSettings } from "./api-token-settings.js";
import { ApiResponseError, api } from "./client-support.js";

vi.mock("./client-support.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./client-support.js")>()),
  api: vi.fn(),
}));

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
  const createCall = vi
    .mocked(api)
    .mock.calls.find(([, init]) => init?.method === "POST");
  const request = JSON.parse(String(createCall?.[1]?.body));
  expect(request).toMatchObject({ name: token.name });
  expect(request.id).toMatch(/^token_[0-9a-f-]{36}$/);
  expect(request.accessToken).toMatch(/^otter_api_[A-Za-z0-9_-]{43}$/);

  await user.click(view.getByRole("button", { name: "複製 token" }));
  expect(clipboardWrite).toHaveBeenCalledWith("otter_api_secret");
  expect(await view.findByText("API token 已複製")).toBeVisible();

  await user.click(view.getByRole("button", { name: "完成" }));
  expect(
    view.queryByRole("region", { name: "新的 API token" }),
  ).not.toBeInTheDocument();
});

test("refreshes tokens after an ambiguous creation failure", async () => {
  let listRequests = 0;
  let requestedId = "";
  vi.mocked(api).mockImplementation(async (url, init) => {
    if (url === "/api/auth/tokens" && init?.method === undefined) {
      listRequests += 1;
      return {
        tokens: listRequests === 1 ? [] : [{ ...token, id: requestedId }],
      };
    }
    if (url === "/api/auth/tokens" && init?.method === "POST") {
      requestedId = JSON.parse(String(init.body)).id;
      throw new Error("response lost");
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
  ).toHaveTextContent(/otter_api_/);
  expect(view.getByText(token.name)).toBeVisible();
  expect(view.queryByRole("alert")).not.toBeInTheDocument();
  expect(listRequests).toBe(2);
});

test("reconciles token creation after a server failure", async () => {
  let listRequests = 0;
  let requestedId = "";
  vi.mocked(api).mockImplementation(async (url, init) => {
    if (url === "/api/auth/tokens" && init?.method === undefined) {
      listRequests += 1;
      return {
        tokens: listRequests === 1 ? [] : [{ ...token, id: requestedId }],
      };
    }
    if (url === "/api/auth/tokens" && init?.method === "POST") {
      requestedId = JSON.parse(String(init.body)).id;
      throw new ApiResponseError("Bad gateway", 502);
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
  ).toHaveTextContent(/otter_api_/);
  expect(view.getByText(token.name)).toBeVisible();
  expect(view.queryByRole("alert")).not.toBeInTheDocument();
  expect(listRequests).toBe(2);
});

test("releases navigation after a definitive creation rejection", async () => {
  let listRequests = 0;
  vi.mocked(api).mockImplementation(async (url, init) => {
    if (url === "/api/auth/tokens" && init?.method === undefined) {
      listRequests += 1;
      return { tokens: [] };
    }
    if (url === "/api/auth/tokens" && init?.method === "POST") {
      throw new ApiResponseError("Unauthorized", 401);
    }
    throw new Error(`Unexpected API request: ${url}`);
  });
  const onMutationChange = vi.fn();
  const user = userEvent.setup();
  const view = render(
    <ApiTokenSettings offline={false} onMutationChange={onMutationChange} />,
  );

  await view.findByText("沒有有效的 API token。");
  await user.type(
    view.getByRole("textbox", { name: "Token 名稱" }),
    token.name,
  );
  await user.click(view.getByRole("button", { name: "建立 API token" }));

  expect(await view.findByRole("alert")).toHaveTextContent(
    "無法建立 API token",
  );
  expect(view.getByRole("button", { name: "建立 API token" })).toBeEnabled();
  expect(
    view.queryByRole("button", { name: "重試建立 token" }),
  ).not.toBeInTheDocument();
  expect(onMutationChange).toHaveBeenLastCalledWith(false);
  expect(listRequests).toBe(1);
});

test("retries the same request while creation remains uncertain", async () => {
  let listRequests = 0;
  const creationBodies: string[] = [];
  vi.mocked(api).mockImplementation(async (url, init) => {
    if (url === "/api/auth/tokens" && init?.method === undefined) {
      listRequests += 1;
      return { tokens: [] };
    }
    if (url === "/api/auth/tokens" && init?.method === "POST") {
      const body = String(init.body);
      creationBodies.push(body);
      if (creationBodies.length === 1) throw new Error("response lost");
      const request = JSON.parse(body);
      return {
        accessToken: request.accessToken,
        token: { ...token, id: request.id },
      };
    }
    throw new Error(`Unexpected API request: ${url}`);
  });
  const onMutationChange = vi.fn();
  const user = userEvent.setup();
  const view = render(
    <ApiTokenSettings offline={false} onMutationChange={onMutationChange} />,
  );

  await view.findByText("沒有有效的 API token。");
  await user.type(
    view.getByRole("textbox", { name: "Token 名稱" }),
    token.name,
  );
  await user.click(view.getByRole("button", { name: "建立 API token" }));

  expect(await view.findByRole("alert")).toHaveTextContent(
    "無法確認 token 建立結果",
  );
  expect(view.getByRole("button", { name: "建立 API token" })).toBeDisabled();
  expect(onMutationChange).toHaveBeenLastCalledWith(true);

  await user.click(view.getByRole("button", { name: "重試建立 token" }));

  expect(
    await view.findByRole("region", { name: "新的 API token" }),
  ).toHaveTextContent(/otter_api_/);
  expect(onMutationChange).toHaveBeenLastCalledWith(false);
  expect(creationBodies).toHaveLength(2);
  expect(creationBodies[1]).toBe(creationBodies[0]);
  expect(listRequests).toBe(2);
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

test("reconciles revocation when the token is already absent", async () => {
  let listRequests = 0;
  vi.mocked(api).mockImplementation(async (url, init) => {
    if (url === "/api/auth/tokens" && init?.method === undefined) {
      listRequests += 1;
      return { tokens: [] };
    }
    if (url === "/api/auth/tokens" && init?.method === "POST") {
      return { accessToken: "otter_api_secret", token };
    }
    if (url === "/api/auth/tokens/token-1" && init?.method === "DELETE") {
      throw new Error("response lost");
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
  ).toBeVisible();

  await user.click(
    view.getByRole("button", { name: "撤銷 API token「Travel agent」" }),
  );

  expect(await view.findByText("API token 已撤銷")).toBeVisible();
  expect(
    view.queryByRole("region", { name: "新的 API token" }),
  ).not.toBeInTheDocument();
  expect(view.queryByRole("alert")).not.toBeInTheDocument();
  expect(listRequests).toBe(2);
});

test("reconciles revocation after its refresh is aborted", async () => {
  let listRequests = 0;
  vi.mocked(api).mockImplementation(async (url, init) => {
    if (url === "/api/auth/tokens" && init?.method === undefined) {
      listRequests += 1;
      if (listRequests === 2) {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        });
      }
      return { tokens: [] };
    }
    if (url === "/api/auth/tokens" && init?.method === "POST") {
      return { accessToken: "otter_api_secret", token };
    }
    if (url === "/api/auth/tokens/token-1" && init?.method === "DELETE") {
      throw new Error("response lost");
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
  ).toBeVisible();
  await user.click(
    view.getByRole("button", { name: "撤銷 API token「Travel agent」" }),
  );
  await waitFor(() => expect(listRequests).toBe(2));

  view.rerender(<ApiTokenSettings offline />);
  view.rerender(<ApiTokenSettings offline={false} />);

  expect(await view.findByText("API token 已撤銷")).toBeVisible();
  expect(
    view.queryByRole("region", { name: "新的 API token" }),
  ).not.toBeInTheDocument();
  expect(view.queryByRole("alert")).not.toBeInTheDocument();
  expect(listRequests).toBe(3);
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
