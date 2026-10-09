import AxeBuilder from "@axe-core/playwright";
import {
  calculateBalances,
  calculateSettlements,
  type Trip,
} from "@narumitw/otter-core/settlement";
import { expect, type Page } from "@playwright/test";
import type { TripPayload } from "../../src/client/client-support.js";

export function exampleTrip(): Trip {
  const participants = [
    { id: "a", name: "Alex" },
    { id: "b", name: "Morgan" },
    { id: "c", name: "Jamie" },
    { id: "d", name: "Sam", settledById: "c" },
  ];
  return {
    id: "interface-trip",
    name: "Autumn in Kyoto · 京都秋旅",
    baseCurrency: "JPY",
    ownerId: "owner",
    createdAt: "2026-10-01T00:00:00Z",
    participants,
    exchangeRates: { JPY: 1, USD: 250 },
    expenses: [
      {
        id: "dinner",
        description: "Dinner at the market",
        amountMinor: 5700,
        currency: "JPY",
        category: "餐飲",
        expenseDate: "2026-10-04",
        paidById: "a",
        participantIds: ["a", "b"],
        receiptUrl: "/icon.svg",
        createdAt: "2026-10-04T10:00:00Z",
        exchangeRate: { baseCurrency: "JPY", rateToBase: 1, source: "fixed" },
      },
      {
        id: "train",
        description: "Train to the mountains",
        amountMinor: 17150,
        currency: "JPY",
        category: "交通",
        expenseDate: "2026-10-04",
        paidById: "b",
        participantIds: ["a", "b", "c", "d"],
        createdAt: "2026-10-04T09:00:00Z",
      },
      {
        id: "stay",
        description: "A quiet place to stay",
        amountMinor: 89640,
        currency: "JPY",
        category: "住宿",
        expenseDate: "2026-10-04",
        paidById: "a",
        participantIds: ["a", "b", "c", "d"],
        createdAt: "2026-10-04T08:00:00Z",
      },
      {
        id: "usd",
        description: "Travel booking",
        amountMinor: 4250,
        currency: "USD",
        category: "其他",
        expenseDate: "2026-10-02",
        paidById: "a",
        participantIds: ["a", "b", "c", "d"],
        createdAt: "2026-10-02T08:00:00Z",
        exchangeRate: {
          baseCurrency: "JPY",
          rateToBase: 150,
          source: "bank",
          provider: "BANK_OF_TAIWAN",
          rateType: "spotMid",
          fetchedAt: "2026-10-01T12:00:00Z",
        },
      },
      {
        id: "coffee",
        description: "Coffee and a slow morning",
        amountMinor: 2100,
        currency: "JPY",
        category: "餐飲",
        expenseDate: "2026-10-01",
        paidById: "c",
        participantIds: ["a", "b", "c"],
        createdAt: "2026-10-01T08:00:00Z",
      },
    ],
  };
}

export async function mockWorkspace(
  page: Page,
  trip = exampleTrip(),
  role: "owner" | "editor" = "owner",
  locale: "en" | "zh-TW" = "en",
) {
  const payload = (): TripPayload => ({
    trip,
    balances: calculateBalances(trip),
    settlements: calculateSettlements(trip),
    currentUserRole: role,
    exchangeRateInfo: {
      source: "bank",
      provider: "BANK_OF_TAIWAN",
      rateType: "spotMid",
      fetchedAt: "2026-10-01T12:00:00Z",
    },
    collaborators: [
      { userId: "owner", username: "alex", name: "Alex", role: "owner" },
    ],
    shareLinks: [
      {
        id: "link-1",
        mode: "readonly",
        createdAt: "2026-10-01T12:00:00Z",
        revokedAt: null,
      },
      {
        id: "link-2",
        mode: "anyone-edit",
        createdAt: "2026-09-28T12:00:00Z",
        revokedAt: "2026-10-01T12:00:00Z",
      },
    ],
  });
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/config")
      await route.fulfill({ json: { devLoginCredentials: null } });
    else if (path === "/api/me")
      await route.fulfill({
        json: { user: { id: "owner", username: "alex", name: "Alex" } },
      });
    else if (path === "/api/trips")
      await route.fulfill({
        json: {
          archivedTrips: [],
          trips: [
            {
              id: trip.id,
              name: trip.name,
              baseCurrency: trip.baseCurrency,
              participantCount: trip.participants.length,
              expenseCount: trip.expenses.length,
            },
          ],
        },
      });
    else if (path === `/api/trips/${trip.id}`)
      await route.fulfill({ json: payload() });
    else if (path === `/api/trips/${trip.id}/expense-history`)
      await route.fulfill({ json: { revisions: [], nextCursor: null } });
    else if (path === "/api/passkeys")
      await route.fulfill({ json: { passkeys: [] } });
    else if (path === "/api/auth/tokens")
      await route.fulfill({ json: { tokens: [] } });
    else
      throw new Error(
        `Unexpected request: ${route.request().method()} ${path}`,
      );
  });
  await page.addInitScript((locale) => {
    window.localStorage.setItem("otter.locale", locale);
  }, locale);
}

export async function accessible(page: Page) {
  const result = await new AxeBuilder({ page }).analyze();
  expect(
    result.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    ),
  ).toEqual([]);
}
