// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { expect, test } from "vitest";
import type { TripPayload } from "../client-support.js";
import { I18nProvider } from "../i18n.js";
import { OverviewSummary } from "./overview-summary.js";

test("an old payload without a required rate does not show an invented total", () => {
  const payload: TripPayload = {
    balances: [],
    settlements: [],
    trip: {
      id: "t",
      ownerId: "u",
      name: "Old",
      baseCurrency: "TWD",
      createdAt: "2026-07-05T00:00:00Z",
      participants: [{ id: "a", name: "A" }],
      expenses: [
        {
          id: "e",
          currency: "USD",
          amountMinor: 100,
          description: "Old expense",
          expenseDate: "2026-07-05",
          createdAt: "2026-07-05T00:00:00Z",
          paidById: "a",
          participantIds: ["a"],
        },
      ],
    },
  };
  const view = render(
    <I18nProvider initialLocale="en">
      <OverviewSummary payload={payload} />
    </I18nProvider>,
  );
  expect(
    view.container.querySelector(".summary-card-primary"),
  ).toHaveTextContent("Rate unavailable");
  expect(
    view.container.querySelector(".summary-card-primary"),
  ).not.toHaveTextContent("$32");
});
