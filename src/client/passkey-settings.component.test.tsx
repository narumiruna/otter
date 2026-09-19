// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import { api } from "./client-support.js";
import { PasskeySettings } from "./passkey-settings.js";
import { registerPasskey } from "./passkeys.js";

vi.mock("./client-support.js", () => ({ api: vi.fn() }));
vi.mock("./passkeys.js", () => ({
  registerPasskey: vi.fn(),
  supportsPasskeys: () => true,
}));

const passkey = {
  backedUp: true,
  createdAt: "2026-09-19T00:00:00.000Z",
  deviceType: "multiDevice" as const,
  id: "credential-1",
  lastUsedAt: null,
};

beforeEach(() => {
  vi.mocked(api).mockReset();
  vi.mocked(registerPasskey).mockReset();
});

test("passkey settings does not request data while offline", () => {
  const view = render(<PasskeySettings offline />);

  expect(api).not.toHaveBeenCalled();
  expect(view.queryByRole("alert")).toBeNull();
  view.unmount();
});

test("passkey settings clears a list error after recovery", async () => {
  vi.mocked(api)
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce({ passkeys: [passkey] });
  const view = render(<PasskeySettings offline={false} />);

  expect(await view.findByRole("alert")).toHaveTextContent("無法載入 Passkey");
  view.rerender(<PasskeySettings offline />);
  view.rerender(<PasskeySettings offline={false} />);
  expect(await view.findByText("Passkey 1")).toBeVisible();
  expect(view.queryByRole("alert")).toBeNull();
  expect(api).toHaveBeenCalledTimes(2);
  view.unmount();
});

test("passkey settings reloads the list after registration fails", async () => {
  let resolveInitialList: (value: { passkeys: (typeof passkey)[] }) => void =
    () => undefined;
  const initialList = new Promise<{ passkeys: (typeof passkey)[] }>(
    (resolve) => {
      resolveInitialList = resolve;
    },
  );
  vi.mocked(api)
    .mockReturnValueOnce(initialList)
    .mockResolvedValueOnce({ passkeys: [passkey] });
  vi.mocked(registerPasskey).mockRejectedValueOnce(new Error("cancelled"));
  const user = userEvent.setup();
  const view = render(<PasskeySettings offline={false} />);

  await user.click(view.getByRole("button", { name: "新增 Passkey" }));
  expect(await view.findByText("Passkey 1")).toBeVisible();
  expect(view.getByRole("alert")).toHaveTextContent(
    "無法新增 Passkey；若已取消，請重新嘗試",
  );
  await act(async () => resolveInitialList({ passkeys: [] }));
  expect(view.getByText("Passkey 1")).toBeVisible();
  expect(api).toHaveBeenCalledTimes(2);
  view.unmount();
});

test("passkey settings ignores a list response superseded by removal", async () => {
  let listRequests = 0;
  let resolveStaleList: (value: { passkeys: (typeof passkey)[] }) => void =
    () => undefined;
  const staleList = new Promise<{ passkeys: (typeof passkey)[] }>((resolve) => {
    resolveStaleList = resolve;
  });
  vi.mocked(api).mockImplementation(async (url, init) => {
    if (url === "/api/passkeys" && !init) {
      listRequests += 1;
      return listRequests === 1 ? { passkeys: [passkey] } : staleList;
    }
    if (url === "/api/passkeys/credential-1" && init?.method === "DELETE") {
      return { ok: true };
    }
    throw new Error(`Unexpected API request: ${url}`);
  });
  const user = userEvent.setup();
  const view = render(<PasskeySettings offline={false} />);

  expect(await view.findByText("Passkey 1")).toBeVisible();
  view.rerender(<PasskeySettings offline />);
  view.rerender(<PasskeySettings offline={false} />);
  await waitFor(() => expect(listRequests).toBe(2));
  await user.click(view.getByRole("button", { name: "移除 Passkey 1" }));
  expect(await view.findByText("Passkey 已移除")).toBeVisible();
  await act(async () => resolveStaleList({ passkeys: [passkey] }));
  expect(view.queryByText("Passkey 1")).toBeNull();
  expect(view.getByText("尚未新增 Passkey。")).toBeVisible();
  view.unmount();
});

test("passkey settings enroll and remove passkeys", async () => {
  let listedPasskeys = [passkey];
  vi.mocked(api).mockImplementation(async (url, init) => {
    if (url === "/api/passkeys" && !init) {
      return { passkeys: listedPasskeys };
    }
    if (url === "/api/passkeys/credential-1" && init?.method === "DELETE") {
      listedPasskeys = [];
      return { ok: true };
    }
    throw new Error(`Unexpected API request: ${url}`);
  });
  const user = userEvent.setup();
  const view = render(<PasskeySettings offline={false} />);

  expect(await view.findByText("Passkey 1")).toBeVisible();
  await user.click(view.getByRole("button", { name: "新增 Passkey" }));
  await waitFor(() => expect(registerPasskey).toHaveBeenCalledOnce());
  expect(await view.findByText("Passkey 已新增")).toBeVisible();

  await user.click(view.getByRole("button", { name: "移除 Passkey 1" }));
  await waitFor(() =>
    expect(api).toHaveBeenCalledWith("/api/passkeys/credential-1", {
      method: "DELETE",
    }),
  );
  expect(view.getByText("Passkey 已移除")).toBeVisible();
  expect(view.getByText("尚未新增 Passkey。")).toBeVisible();
  view.unmount();
});
