// @vitest-environment jsdom

import assert from "node:assert/strict";
import { Theme } from "@radix-ui/themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { AppShell } from "./app-shell.js";
import { api } from "./client-support.js";
import { translations } from "./i18n/messages.js";
import { currentLocale, I18nProvider, translate, useI18n } from "./i18n.js";

function renderApp(initialLocale?: "en" | "zh-TW") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <Theme>
      <I18nProvider initialLocale={initialLocale}>
        <QueryClientProvider client={queryClient}>
          <AppShell />
        </QueryClientProvider>
      </I18nProvider>
    </Theme>,
  );
}

const storedValues = new Map<string, string>();

beforeEach(() => {
  storedValues.clear();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => storedValues.get(key) ?? null,
      setItem: (key: string, value: string) => storedValues.set(key, value),
    },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function CurrentLocale() {
  const { locale } = useI18n();
  return <span>{locale}</span>;
}

test("browser language detection honors the user's preference order", () => {
  vi.spyOn(window.navigator, "languages", "get").mockReturnValue([
    "en-US",
    "zh-TW",
  ]);

  const view = render(
    <I18nProvider>
      <CurrentLocale />
    </I18nProvider>,
  );

  expect(view.getByText("en")).toBeVisible();
});

test("app switches between Traditional Chinese and English in account settings and persists the choice", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith("/api/config")) {
        return Response.json({ devLoginCredentials: null });
      }
      if (url.endsWith("/api/me")) {
        return Response.json({
          user: { id: "user-1", name: "Alice", username: "alice" },
        });
      }
      if (url.endsWith("/api/trips")) {
        return Response.json({ archivedTrips: [], trips: [] });
      }
      if (url.endsWith("/api/passkeys")) {
        return Response.json({ passkeys: [] });
      }
      if (url.endsWith("/api/auth/tokens")) {
        return Response.json({ tokens: [] });
      }
      return Response.json({ error: "找不到 API" }, { status: 404 });
    }),
  );
  const user = userEvent.setup();
  const view = renderApp("zh-TW");

  expect(view.queryByRole("combobox", { name: "語言" })).toBeNull();
  await user.click(
    await view.findByRole("button", { name: "Alice 的帳號選單" }),
  );
  await user.click(await view.findByRole("menuitem", { name: "帳號設定" }));
  await user.selectOptions(view.getByRole("combobox", { name: "語言" }), "en");

  expect(view.getByRole("heading", { name: "Account settings" })).toBeVisible();
  expect(
    view.getByRole("option", { name: "Traditional Chinese" }),
  ).toBeVisible();
  assert.equal(document.documentElement.lang, "en");
  assert.equal(window.localStorage.getItem("otter.locale"), "en");

  view.unmount();
  const persisted = renderApp();
  expect(
    await persisted.findByRole("button", { name: "Alice's account menu" }),
  ).toBeVisible();
});

test("active locale survives unavailable browser storage", async () => {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: () => null,
      setItem: () => {
        throw new Error("Storage is unavailable");
      },
    },
  });
  const fetchMock = vi.fn(
    async (input: string | URL | Request, _init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/config")) {
        return Response.json({ devLoginCredentials: null });
      }
      if (url.endsWith("/api/me")) {
        return Response.json({
          user: { id: "user-1", name: "Alice", username: "alice" },
        });
      }
      if (url.endsWith("/api/trips")) {
        return Response.json({ archivedTrips: [], trips: [] });
      }
      if (url.endsWith("/api/passkeys")) {
        return Response.json({ passkeys: [] });
      }
      if (url.endsWith("/api/auth/tokens")) {
        return Response.json({ tokens: [] });
      }
      return Response.json({ error: "找不到 API" }, { status: 404 });
    },
  );
  vi.stubGlobal("fetch", fetchMock);
  const user = userEvent.setup();
  const view = renderApp("zh-TW");

  await user.click(
    await view.findByRole("button", { name: "Alice 的帳號選單" }),
  );
  await user.click(await view.findByRole("menuitem", { name: "帳號設定" }));
  await user.selectOptions(view.getByRole("combobox", { name: "語言" }), "en");

  assert.equal(currentLocale(), "en");
  await expect(api("/api/missing")).rejects.toThrow("API endpoint not found");
  const missingCall = fetchMock.mock.calls.find(([input]) =>
    String(input).endsWith("/api/missing"),
  );
  assert.ok(missingCall);
  assert.equal(
    new Headers(missingCall[1]?.headers).get("Accept-Language"),
    "en",
  );
});

test("English count messages use singular nouns for one item", () => {
  const messages = translations.en;

  assert.equal(messages.countActiveGroups({ count: 1 }), "1 active group");
  assert.equal(
    messages.participantsPeopleExpensesExpensesCurrency({
      participants: 1,
      expenses: 1,
      currency: "TWD",
    }),
    "1 person · 1 expense · TWD",
  );
  assert.equal(
    messages.rowsRowsCanBeImportedErrorsErrors({ rows: 1, errors: 1 }),
    "1 row can be imported; 1 error.",
  );
  assert.equal(
    messages.peoplePeopleExpensesExpensesPaymentsPaymentsBaseCurrency({
      people: 1,
      expenses: 1,
      payments: 1,
      currency: "TWD",
    }),
    "1 person · 1 expense · 1 payment · base TWD",
  );
  assert.equal(messages.countActiveGroups({ count: 2 }), "2 active groups");
});

test("message translation interpolates values and preserves Traditional Chinese", () => {
  assert.equal(
    translate("en", "顯示 {shown} / {total} 筆支出", {
      shown: 2,
      total: 5,
    }),
    "Showing 2 of 5 expenses",
  );
  assert.equal(translate("zh-TW", "登入"), "登入");
  assert.equal(translate("en", "找不到旅行"), "Trip not found");
  assert.equal(
    translate("en", "驗證要求過於頻繁，請稍後再試"),
    "Too many authentication requests. Try again later.",
  );
  assert.equal(
    translate("en", "缺少欄位：description, currency"),
    "Missing columns: description, currency",
  );
  assert.equal(
    translate("en", "找不到參與者：Alice"),
    "Participant not found: Alice",
  );
});

test("English auth forms show localized rate-limit errors", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith("/api/config")) {
        return Response.json({ devLoginCredentials: null });
      }
      if (url.endsWith("/api/me")) {
        return Response.json({ user: null });
      }
      if (
        url.endsWith("/api/auth/login") ||
        url.endsWith("/api/auth/register")
      ) {
        return Response.json(
          { error: "驗證要求過於頻繁，請稍後再試" },
          { status: 429 },
        );
      }
      return Response.json({ error: "找不到 API" }, { status: 404 });
    }),
  );
  const user = userEvent.setup();
  const view = renderApp("en");

  await user.type(await view.findByLabelText("Username"), "alice");
  await user.type(view.getByLabelText("Password"), "password123");
  await user.click(view.getByRole("button", { name: "Sign in" }));
  expect(
    await view.findByText("Too many authentication requests. Try again later."),
  ).toBeVisible();

  await user.click(view.getByRole("button", { name: "Create account" }));
  await user.type(view.getByLabelText("Username"), "new-alice");
  await user.type(view.getByLabelText("Password"), "password123");
  await user.click(view.getByRole("button", { name: "Create account" }));
  expect(
    await view.findByText("Too many authentication requests. Try again later."),
  ).toBeVisible();
});
