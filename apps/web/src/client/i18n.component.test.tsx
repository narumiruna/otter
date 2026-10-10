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
import {
  currentLocale,
  I18nProvider,
  type Locale,
  translate,
  useI18n,
} from "./i18n.js";

function renderApp(initialLocale?: Locale) {
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

test.each([
  { languages: ["ja-JP", "en-US"], saved: null, expected: "ja" },
  { languages: ["ko-KR", "ja-JP"], saved: null, expected: "ko" },
  { languages: ["en-US"], saved: "ja", expected: "ja" },
  { languages: ["ja-JP"], saved: "ko", expected: "ko" },
  { languages: ["ko-KR"], saved: "fr", expected: "ko" },
])(
  "provider resolves $expected from browser and stored preferences",
  ({ languages, saved, expected }) => {
    vi.spyOn(window.navigator, "languages", "get").mockReturnValue(languages);
    if (saved) storedValues.set("otter.locale", saved);
    const view = render(
      <I18nProvider>
        <CurrentLocale />
      </I18nProvider>,
    );
    expect(view.getByText(expected)).toBeVisible();
    expect(document.documentElement.lang).toBe(expected);
  },
);

test.each(["ja", "ko"] as const)(
  "%s formats money and translates API errors and parameters",
  (locale) => {
    function Money() {
      const { formatMoney } = useI18n();
      return <span>{formatMoney(123456, "USD")}</span>;
    }
    const view = render(
      <I18nProvider initialLocale={locale}>
        <Money />
      </I18nProvider>,
    );
    expect(
      view.getByText(
        new Intl.NumberFormat(locale, {
          style: "currency",
          currency: "USD",
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(1234.56),
      ),
    ).toBeVisible();
    expect(translate(locale, "Username 或密碼錯誤")).toBe(
      translations[locale].incorrectUsernameOrPassword,
    );
    expect(translate(locale, "找不到參與者：Alice")).toBe(
      translations[locale].participantNotFoundName({ name: "Alice" }),
    );
    expect(translate(locale, "缺少欄位：description, currency")).toBe(
      translations[locale].missingColumnsColumns({
        columns: "description, currency",
      }),
    );
    expect(
      translate(locale, "顯示 {shown} / {total} 筆支出", {
        shown: 2,
        total: 5,
      }),
    ).toBe(
      translations[locale].showingShownOfTotalExpenses({ shown: 2, total: 5 }),
    );
    expect(translate(locale, "unmapped error")).toBe("unmapped error");
  },
);

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

test.each(["en", "ja", "ko"] as const)(
  "guest can choose %s before signing in and keep it on reload",
  async (locale) => {
    const messages = translations[locale];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);
        if (url.endsWith("/api/config")) {
          return Response.json({ devLoginCredentials: null });
        }
        if (url.endsWith("/api/me")) return Response.json({ user: null });
        return Response.json({ error: "找不到 API" }, { status: 404 });
      }),
    );
    const user = userEvent.setup();
    const view = renderApp("zh-TW");

    await user.selectOptions(
      await view.findByRole("combobox", { name: "語言" }),
      locale,
    );
    expect(view.getByRole("heading", { name: messages.signIn })).toBeVisible();
    expect(view.getByLabelText(messages.username)).toBeVisible();
    assert.equal(document.documentElement.lang, locale);
    assert.equal(window.localStorage.getItem("otter.locale"), locale);
    await expect(api("/api/missing")).rejects.toThrow(
      messages.apiEndpointNotFound,
    );
    const call = vi
      .mocked(fetch)
      .mock.calls.find(([input]) => String(input).endsWith("/api/missing"));
    expect(new Headers(call?.[1]?.headers).get("Accept-Language")).toBe(locale);

    view.unmount();
    const persisted = renderApp();
    expect(
      await persisted.findByRole("heading", { name: messages.signIn }),
    ).toBeVisible();
    expect(
      persisted.getByRole("combobox", { name: messages.language }),
    ).toHaveValue(locale);
  },
);

test("guest language changes clear localized login and registration errors", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith("/api/config"))
        return Response.json({ devLoginCredentials: null });
      if (url.endsWith("/api/me")) return Response.json({ user: null });
      if (url.endsWith("/api/auth/login"))
        return Response.json({ error: "Username 或密碼錯誤" }, { status: 401 });
      if (url.endsWith("/api/auth/register"))
        return Response.json(
          { error: "這個 Username 已經註冊" },
          { status: 409 },
        );
      return Response.json({ error: "找不到 API" }, { status: 404 });
    }),
  );
  const user = userEvent.setup();
  const view = renderApp("zh-TW");

  await user.type(await view.findByLabelText("使用者名稱"), "alice");
  await user.type(view.getByLabelText("密碼"), "password123");
  await user.click(view.getByRole("button", { name: "登入" }));
  expect(await view.findByText("使用者名稱或密碼錯誤")).toBeVisible();
  await user.selectOptions(view.getByRole("combobox", { name: "語言" }), "en");
  expect(view.queryByText("使用者名稱或密碼錯誤")).toBeNull();

  await user.click(view.getByRole("button", { name: "Create account" }));
  await user.type(view.getByLabelText("Username"), "new-alice");
  await user.type(view.getByLabelText("Password"), "password123");
  await user.click(view.getByRole("button", { name: "Create account" }));
  expect(
    await view.findByText("This username is already registered"),
  ).toBeVisible();
  await user.selectOptions(
    view.getByRole("combobox", { name: "Language" }),
    "zh-TW",
  );
  expect(view.queryByText("This username is already registered")).toBeNull();
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
  expect(view.getByRole("option", { name: "正體中文" })).toBeVisible();
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
  assert.equal(
    translate("zh-TW", "Username 或密碼錯誤"),
    "使用者名稱或密碼錯誤",
  );
  assert.equal(
    translate("zh-TW", "Username 需為 3–32 個英文字母、數字、底線或連字號"),
    "使用者名稱需為 3–32 個英文字母、數字、底線或連字號",
  );
  assert.equal(translate("en", "找不到旅行"), "Trip not found");
  for (const [source, english, chinese] of [
    [
      "這個 Username 已經註冊",
      "This username is already registered",
      "這個使用者名稱已經註冊",
    ],
    [
      "這個 Username 正在註冊中或已註冊",
      "This username is being registered or is already taken",
      "這個使用者名稱正在註冊中或已註冊",
    ],
    [
      "這個 Username 正在註冊中",
      "This username is being registered",
      "這個使用者名稱正在註冊中",
    ],
    [
      "Username 或 Passkey 已經註冊",
      "This username or passkey is already registered",
      "使用者名稱或 Passkey 已經註冊",
    ],
    [
      "Passkey 註冊要求過於頻繁，請稍後再試",
      "Too many passkey registration requests. Try again later.",
      "Passkey 註冊要求過於頻繁，請稍後再試",
    ],
    [
      "無法移除唯一的 Passkey，否則帳號將無法登入",
      "You cannot remove your only passkey without losing account access",
      "無法移除唯一的 Passkey，否則帳號將無法登入",
    ],
  ]) {
    assert.equal(translate("en", source), english);
    assert.equal(translate("zh-TW", source), chinese);
  }
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

test("settlement representative API and backup errors have English translations", () => {
  for (const [source, english] of [
    ["請提供要更新的參與者內容", "Provide the participant details to update"],
    ["結算代表人格式錯誤", "Invalid settlement representative"],
    [
      "結算代表人必須是同團的其他成員",
      "The settlement representative must be another member of this group",
    ],
    [
      "結算代表人不能再歸屬其他人，也不能有自己的被歸屬成員",
      "The settlement representative cannot settle through someone else, and this person cannot have members settling through them",
    ],
    ["備份結算歸屬格式錯誤", "Invalid settlement representative in backup"],
  ]) {
    assert.equal(translate("en", source), english);
    assert.equal(translate("zh-TW", source), source);
  }
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
