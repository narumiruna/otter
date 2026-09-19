// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import type { TripPayload } from "../client-support.js";
import { I18nProvider } from "../i18n.js";
import { PeoplePage } from "./people-page.js";
import { WorkspaceProvider } from "./workspace-context.js";

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
