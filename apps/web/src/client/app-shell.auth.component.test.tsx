// @vitest-environment jsdom

import { Theme } from "@radix-ui/themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { AppShell } from "./app-shell.js";
import { ApiResponseError } from "./client-support.js";
import { I18nProvider } from "./i18n.js";
import {
  clearPendingPasskeySignup,
  createAccountWithPasskey,
} from "./passkeys.js";

vi.mock("./passkeys.js", () => ({
  authenticateWithPasskey: vi.fn(),
  clearPendingPasskeySignup: vi.fn(),
  createAccountWithPasskey: vi.fn(),
  pendingPasskeySignupChallengeId: vi.fn(() => "pending-123"),
  supportsPasskeys: vi.fn(() => true),
}));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.mocked(createAccountWithPasskey).mockReset();
});

test.each([
  {
    locale: "zh-TW" as const,
    failure: new Error("The operation timed out"),
    expected: "無法使用 Passkey 建立帳號，請重新嘗試",
    create: "建立帳號",
    passkey: "使用 Passkey 建立帳號",
    username: "使用者名稱",
  },
  {
    locale: "en" as const,
    failure: new ApiResponseError("This username is being registered", 409),
    expected: "This username is being registered",
    create: "Create account",
    passkey: "Create account with a passkey",
    username: "Username",
  },
])(
  "passkey registration errors stay localized in $locale",
  async ({ locale, failure, expected, create, passkey, username }) => {
    window.history.replaceState({}, "", "/");
    vi.mocked(createAccountWithPasskey).mockRejectedValue(failure);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const path = new URL(String(input), window.location.origin).pathname;
        if (path === "/api/config")
          return Response.json({ devLoginCredentials: null });
        if (path === "/api/me") return Response.json({ user: null });
        throw new Error(`Unexpected request: ${path}`);
      }),
    );
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const view = render(
      <Theme>
        <I18nProvider initialLocale={locale}>
          <QueryClientProvider client={queryClient}>
            <AppShell />
          </QueryClientProvider>
        </I18nProvider>
      </Theme>,
    );
    const user = userEvent.setup();
    await user.click(await view.findByRole("button", { name: create }));
    await user.type(view.getByRole("textbox", { name: username }), "Alice");
    await user.click(view.getByRole("button", { name: passkey }));
    expect(await view.findByText(expected)).toBeVisible();
    if (locale === "zh-TW")
      expect(view.queryByText("The operation timed out")).toBeNull();
    view.unmount();
  },
);

test("password signup can fall back after a cancelled passkey prompt", async () => {
  window.history.replaceState({}, "", "/");
  vi.mocked(createAccountWithPasskey).mockRejectedValue(new Error("cancelled"));
  let registrationBody: Record<string, unknown> | undefined;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const path = new URL(String(input), window.location.origin).pathname;
      if (path === "/api/config")
        return Response.json({ devLoginCredentials: null });
      if (path === "/api/me") return Response.json({ user: null });
      if (path === "/api/auth/register") {
        registrationBody = JSON.parse(String(init?.body));
        return Response.json(
          { user: { id: "new-user", name: "Alice", username: "alice" } },
          { status: 201 },
        );
      }
      throw new Error(`Unexpected request: ${path}`);
    }),
  );
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const view = render(
    <Theme>
      <I18nProvider initialLocale="en">
        <QueryClientProvider client={queryClient}>
          <AppShell />
        </QueryClientProvider>
      </I18nProvider>
    </Theme>,
  );
  const user = userEvent.setup();
  await user.click(await view.findByRole("button", { name: "Create account" }));
  await user.type(view.getByRole("textbox", { name: "Username" }), "Alice");
  await user.click(
    view.getByRole("button", { name: "Create account with a passkey" }),
  );
  await waitFor(() =>
    expect(createAccountWithPasskey).toHaveBeenCalledWith("Alice"),
  );
  await user.type(view.getByLabelText("Password"), "password123");
  await user.click(view.getByRole("button", { name: "Create account" }));
  await waitFor(() =>
    expect(registrationBody).toEqual({
      username: "Alice",
      password: "password123",
      challengeId: "pending-123",
    }),
  );
  expect(clearPendingPasskeySignup).toHaveBeenCalledWith("Alice");
});
