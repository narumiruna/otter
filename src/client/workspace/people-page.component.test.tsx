// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import type { TripPayload } from "../client-support.js";
import { I18nProvider, useI18n } from "../i18n.js";
import { PeoplePage } from "./people-page.js";
import { WorkspaceProvider } from "./workspace-context.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

const payload: TripPayload = {
  balances: [],
  settlements: [],
  trip: {
    baseCurrency: "TWD",
    createdAt: "2026-09-19T00:00:00.000Z",
    expenses: [],
    id: "trip_people",
    name: "Weekend trip",
    ownerId: "owner",
    participants: [{ id: "participant_alice", name: "Alice" }],
  },
};

function LocaleSwitch() {
  const { setLocale } = useI18n();
  return (
    <button type="button" onClick={() => setLocale("en")}>
      Switch to English
    </button>
  );
}

test("English participant management uses a page-specific heading", () => {
  const queryClient = new QueryClient();
  render(
    <I18nProvider initialLocale="en">
      <QueryClientProvider client={queryClient}>
        <WorkspaceProvider
          announce={() => undefined}
          offline={false}
          payload={payload}
          refreshCollection={async () => undefined}
        >
          <PeoplePage trip={payload.trip} />
        </WorkspaceProvider>
      </QueryClientProvider>
    </I18nProvider>,
  );

  expect(
    screen.getByRole("heading", { name: "Expense participants" }),
  ).toBeVisible();
  expect(screen.queryByRole("heading", { name: "Split with" })).toBeNull();
});

test("switching locale clears participant errors from the previous locale", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({ error: "參與者名稱已存在" }, { status: 409 }),
    ),
  );
  const user = userEvent.setup();
  const queryClient = new QueryClient();
  render(
    <I18nProvider initialLocale="zh-TW">
      <LocaleSwitch />
      <QueryClientProvider client={queryClient}>
        <WorkspaceProvider
          announce={() => undefined}
          offline={false}
          payload={payload}
          refreshCollection={async () => undefined}
        >
          <PeoplePage trip={payload.trip} />
        </WorkspaceProvider>
      </QueryClientProvider>
    </I18nProvider>,
  );

  await user.type(screen.getByLabelText("成員名稱"), "Alice");
  await user.click(screen.getByRole("button", { name: "新增成員" }));
  expect(await screen.findByText("參與者名稱已存在")).toBeVisible();

  await user.click(screen.getByRole("button", { name: "Switch to English" }));

  expect(screen.queryByText("參與者名稱已存在")).toBeNull();
  expect(
    screen.getByRole("heading", { name: "Expense participants" }),
  ).toBeVisible();
});
