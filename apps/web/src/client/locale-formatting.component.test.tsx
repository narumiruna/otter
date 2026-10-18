// @vitest-environment jsdom

import type { Currency } from "@narumitw/otter-core/money";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import type { TripPayload } from "./client-support.js";
import { languageOptions } from "./i18n/locales.js";
import { translations } from "./i18n/messages.js";
import { I18nProvider, useI18n } from "./i18n.js";
import { PasskeySettings } from "./passkey-settings.js";
import { ExpenseComposer } from "./workspace/expense-composer.js";
import { WorkspaceProvider } from "./workspace/workspace-context.js";

const moneyCases: {
  amountMinor: number;
  major: number;
  currency: Currency;
  digits: number;
}[] = [
  { amountMinor: 123456789, major: 1234567.89, currency: "USD", digits: 2 },
  { amountMinor: -123456, major: -1234.56, currency: "USD", digits: 2 },
  { amountMinor: 0, major: 0, currency: "USD", digits: 2 },
  { amountMinor: 1234567, major: 1234567, currency: "JPY", digits: 0 },
  { amountMinor: -1234, major: -1234, currency: "JPY", digits: 0 },
  { amountMinor: 0, major: 0, currency: "JPY", digits: 0 },
];

function LocaleControl() {
  const { setLocale } = useI18n();
  return (
    <div>
      {languageOptions.map(({ locale, label }) => (
        <button key={locale} type="button" onClick={() => setLocale(locale)}>
          {label}
        </button>
      ))}
    </div>
  );
}

function MoneyDisplays() {
  const { formatMoney } = useI18n();
  return (
    <>
      {moneyCases.map(({ amountMinor, currency }) => (
        <output
          key={`${currency}-${amountMinor}`}
          aria-label={`${currency}-${amountMinor}`}
        >
          {formatMoney(amountMinor, currency)}
        </output>
      ))}
    </>
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

test.each(languageOptions)(
  "$locale displays USD and JPY amounts and passkey dates with Intl after a switch",
  async ({ locale, label }) => {
    const createdAt = "2026-10-18T12:00:00.000Z";
    const passkey = { id: "key-1", createdAt };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ passkeys: [passkey] })),
    );
    const user = userEvent.setup();
    const view = render(
      <I18nProvider initialLocale={locale === "en" ? "zh-TW" : "en"}>
        <LocaleControl />
        <MoneyDisplays />
        <PasskeySettings offline={false} />
      </I18nProvider>,
    );
    await user.click(view.getByRole("button", { name: label }));
    for (const { amountMinor, major, currency, digits } of moneyCases) {
      const expected = new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }).format(major);
      expect(
        view.getByLabelText(`${currency}-${amountMinor}`).textContent,
      ).toBe(expected);
    }
    const expectedDate = new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
    }).format(new Date(createdAt));
    expect(
      await view.findByText(
        translations[locale].addedOnDate({ date: expectedDate }),
      ),
    ).toBeVisible();
    expect(passkey).toEqual({ id: "key-1", createdAt });
  },
);

const payload: TripPayload = {
  balances: [],
  settlements: [],
  trip: {
    id: "trip-1",
    name: "Untranslated trip",
    ownerId: "user-1",
    baseCurrency: "USD",
    createdAt: "2026-10-18T12:00:00.000Z",
    expenses: [],
    participants: [
      { id: "alice", name: "Alice" },
      { id: "bob", name: "Bob" },
    ],
  },
};

test("all locale switches preserve expense inputs and the submitted data payload", async () => {
  const snapshot = structuredClone(payload);
  const fetchMock = vi.fn(
    async (_input: string | URL | Request, _init?: RequestInit) =>
      Response.json(payload),
  );
  vi.stubGlobal("fetch", fetchMock);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const onSaved = vi.fn();
  const user = userEvent.setup();
  const view = render(
    <I18nProvider initialLocale="en">
      <LocaleControl />
      <QueryClientProvider client={client}>
        <WorkspaceProvider
          announce={vi.fn()}
          offline={false}
          payload={payload}
          refreshCollection={async () => undefined}
        >
          <ExpenseComposer
            onCancel={vi.fn()}
            onSaved={onSaved}
            trip={payload.trip}
          />
        </WorkspaceProvider>
      </QueryClientProvider>
    </I18nProvider>,
  );
  await user.type(view.getByLabelText("Description"), "Dinner हिन्दी ไทย");
  await user.type(view.getByLabelText("Amount", { exact: true }), "1234.56");
  const date = view.getByLabelText("Date");
  await user.clear(date);
  await user.type(date, "2026-10-18");
  for (const { locale, label } of languageOptions) {
    await user.click(view.getByRole("button", { name: label }));
    const messages = translations[locale];
    expect(view.getByLabelText(messages.description)).toHaveValue(
      "Dinner हिन्दी ไทย",
    );
    expect(view.getByLabelText(messages.amount, { exact: true })).toHaveValue(
      "1234.56",
    );
    expect(view.getByLabelText(messages.date)).toHaveValue("2026-10-18");
    expect(
      view.getByRole("combobox", { name: messages.currency2 }),
    ).toHaveValue("USD");
    expect(payload).toEqual(snapshot);
  }
  expect(fetchMock).not.toHaveBeenCalled();
  const lastOption = languageOptions[languageOptions.length - 1];
  if (!lastOption) throw new Error("No language options registered");
  await user.click(
    view.getByRole("button", {
      name: translations[lastOption.locale].recordExpense,
    }),
  );
  await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
  expect(fetchMock).toHaveBeenCalledOnce();
  const [url, init] = fetchMock.mock.calls[0] ?? [];
  expect(url).toBe("/api/trips/trip-1/expenses");
  expect(init?.method).toBe("POST");
  expect(JSON.parse(String(init?.body))).toMatchObject({
    description: "Dinner हिन्दी ไทย",
    amount: "1234.56",
    currency: "USD",
    expenseDate: "2026-10-18",
    paidById: "alice",
    participantIds: ["alice", "bob"],
    splitMode: "equal",
  });
  expect(new Headers(init?.headers).get("Accept-Language")).toBe(
    lastOption.locale,
  );
  expect(payload).toEqual(snapshot);
  view.unmount();
  client.clear();
});
