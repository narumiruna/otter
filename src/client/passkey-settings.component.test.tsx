// @vitest-environment jsdom

import { render, waitFor } from "@testing-library/react";
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
