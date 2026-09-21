import { isDateOnly } from "@narumitw/otter-core/date";
import {
  type ExpenseCategory,
  isExpenseCategory,
} from "@narumitw/otter-core/expense-metadata";
import type { SplitMode } from "@narumitw/otter-core/expense-splits";
import {
  type Currency,
  currencies,
  type ExchangeRates,
  isCurrency,
} from "@narumitw/otter-core/money";
import type { Balance, Settlement } from "@narumitw/otter-core/settlement";
import {
  isExpenseVersion,
  type Trip,
  type VersionedTrip,
} from "./expense-history.js";

export {
  changedExpenseFields,
  type Expense,
  type ExpenseChangeField,
  type ExpenseHistoryPage,
  type ExpenseRevision,
  type ExpenseSnapshot,
  type ExpenseVersionErrorCode,
  expenseChangeFields,
  expenseIfMatch,
  isExpenseSnapshot,
  isExpenseVersion,
  parseExpenseHistoryPage,
  parseExpenseIfMatch,
  type RevisionSource,
  revisionSources,
  type Trip,
  type VersionedExpense,
  type VersionedTrip,
} from "./expense-history.js";

export type User = {
  id: string;
  name: string;
  username: string;
};

export type TripSummary = {
  id: string;
  name: string;
  baseCurrency: Currency;
  archivedAt?: string | null;
  participantCount: number;
  expenseCount: number;
};

export type TripRole = "owner" | "editor";

export type TripCollaborator = {
  userId: string;
  name: string;
  username: string;
  role: TripRole;
  createdAt: string;
};

export type TripShareLink = {
  id: string;
  createdAt: string;
  revokedAt: string | null;
  expiresAt: string | null;
  url?: string;
};

export type ExchangeRateDefaults =
  | {
      fetchedAt: string;
      provider: "BANK_OF_TAIWAN";
      rates: Record<Currency, number>;
      rateType: "spotMid";
      source: "bank";
    }
  | { rates: Record<Currency, number>; source: "fixed" };

export type ExchangeRateInfo =
  | {
      fetchedAt: string;
      provider: "BANK_OF_TAIWAN";
      rateType: "spotMid";
      source: "bank";
    }
  | {
      customRates: ExchangeRates;
      defaults: ExchangeRateDefaults;
      source: "custom";
    }
  | { source: "fixed" };

export type TripPayload = {
  trip: Trip;
  balances: Balance[];
  settlements: Settlement[];
  exchangeRateInfo?: ExchangeRateInfo;
  currentUserRole?: TripRole;
  collaborators?: TripCollaborator[];
  shareLinks?: TripShareLink[];
  readonly?: boolean;
};

export type ApiErrorResponse = {
  error: string;
  code?: import("./expense-history.js").ExpenseVersionErrorCode;
  errors?: string[];
};

export type UserResponse = {
  user: User | null;
};

export type TripsResponse = {
  archivedTrips: TripSummary[];
  trips: TripSummary[];
};

export type OkResponse = { ok: true };

export type ExchangeRateSnapshot = {
  baseCurrency: Currency;
  fetchedAt: string;
  rates: Record<Currency, number>;
  rateType: "spotMid";
  source: "BANK_OF_TAIWAN";
};

export type ApiToken = {
  createdAt: string;
  expiresAt: string;
  id: string;
  name: string;
};

export type ApiTokensResponse = {
  tokens: ApiToken[];
};

export type CreateApiTokenRequest = {
  accessToken: string;
  id: string;
  name: string;
};

export type CreateApiTokenResponse = {
  accessToken: string;
  token: ApiToken;
};

export type DeviceAuthorization = {
  device_code: string;
  expires_in: number;
  interval: number;
  user_code: string;
  verification_uri: string;
  verification_uri_complete: string;
};

export type DeviceInspection = {
  clientName: string;
  expiresAt: string;
  userCode: string;
};

export type DeviceTokenResponse = {
  access_token: string;
  expires_at: string;
  token_type: "Bearer";
};

export type CreateExpenseRequest = {
  amount: string;
  category?: ExpenseCategory;
  currency: Currency;
  description: string;
  expenseDate?: string;
  paidById: string;
  participantIds: string[];
  splitMode?: SplitMode;
  splitValues?: Record<string, string>;
  tags?: string[];
};

export type UpdateExpenseRequest = Partial<CreateExpenseRequest>;

export type CreateSettlementPaymentRequest = {
  amount: string;
  currency?: Currency;
  fromId: string;
  note?: string;
  paidAt?: string;
  toId: string;
};

export function parseTripPayload(value: unknown): TripPayload {
  if (!isRecord(value)) {
    throw invalidTripPayload();
  }
  validateTrip(value.trip);
  validateBalances(value.balances);
  validateSettlements(value.settlements);
  validateExchangeRateInfo(value.exchangeRateInfo);
  validateRole(value.currentUserRole);
  validateCollaborators(value.collaborators);
  validateShareLinks(value.shareLinks);
  if (value.readonly !== undefined && typeof value.readonly !== "boolean") {
    throw invalidTripPayload();
  }
  return value as TripPayload;
}

export type VersionedTripPayload = Omit<TripPayload, "trip"> & {
  trip: VersionedTrip;
};

export function parseVersionedTripPayload(
  value: unknown,
): VersionedTripPayload {
  const payload = parseTripPayload(value);
  if (
    !payload.trip.expenses.every((expense) => isExpenseVersion(expense.version))
  ) {
    throw invalidTripPayload();
  }
  return payload as VersionedTripPayload;
}

export function parseExchangeRateSnapshot(
  value: unknown,
): ExchangeRateSnapshot {
  if (
    !isRecord(value) ||
    !isCurrency(value.baseCurrency) ||
    !isNonEmptyString(value.fetchedAt) ||
    !Number.isFinite(Date.parse(value.fetchedAt)) ||
    value.rateType !== "spotMid" ||
    value.source !== "BANK_OF_TAIWAN" ||
    !isRecord(value.rates)
  ) {
    throw new Error("Invalid exchange-rate snapshot");
  }
  if (!isExchangeRateMap(value.rates, false)) {
    throw new Error("Invalid exchange-rate snapshot");
  }
  for (const currency of currencies) {
    if (!isPositiveNumber(value.rates[currency])) {
      throw new Error("Invalid exchange-rate snapshot");
    }
  }
  return value as ExchangeRateSnapshot;
}

function validateTrip(value: unknown): asserts value is Trip {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.ownerId) ||
    !isNonEmptyString(value.name) ||
    !isCurrency(value.baseCurrency) ||
    !isOptionalString(value.archivedAt, true) ||
    !isNonEmptyString(value.createdAt) ||
    !Array.isArray(value.participants) ||
    !Array.isArray(value.expenses)
  ) {
    throw invalidTripPayload();
  }

  for (const participant of value.participants) {
    if (
      !isRecord(participant) ||
      !isNonEmptyString(participant.id) ||
      !isNonEmptyString(participant.name)
    ) {
      throw invalidTripPayload();
    }
  }

  for (const expense of value.expenses) {
    if (
      !isRecord(expense) ||
      !isNonEmptyString(expense.id) ||
      (expense.version !== undefined && !isExpenseVersion(expense.version)) ||
      !isNonEmptyString(expense.description) ||
      !isPositiveSafeInteger(expense.amountMinor) ||
      !isCurrency(expense.currency) ||
      (expense.category !== undefined &&
        !isExpenseCategory(expense.category)) ||
      !isOptionalStringArray(expense.tags) ||
      !isNonEmptyString(expense.paidById) ||
      !isStringArray(expense.participantIds, false) ||
      typeof expense.expenseDate !== "string" ||
      !isDateOnly(expense.expenseDate) ||
      !isNonEmptyString(expense.createdAt) ||
      !isOptionalString(expense.receiptId) ||
      !isOptionalString(expense.receiptUrl)
    ) {
      throw invalidTripPayload();
    }
    if (expense.participantShares !== undefined) {
      if (!Array.isArray(expense.participantShares)) {
        throw invalidTripPayload();
      }
      for (const share of expense.participantShares) {
        if (
          !isRecord(share) ||
          !isNonEmptyString(share.participantId) ||
          !isPositiveSafeInteger(share.shareMinor)
        ) {
          throw invalidTripPayload();
        }
      }
    }
  }

  if (value.settlementPayments !== undefined) {
    if (!Array.isArray(value.settlementPayments)) {
      throw invalidTripPayload();
    }
    for (const payment of value.settlementPayments) {
      if (
        !isRecord(payment) ||
        !isNonEmptyString(payment.id) ||
        !isNonEmptyString(payment.fromId) ||
        !isNonEmptyString(payment.toId) ||
        !isPositiveSafeInteger(payment.amountMinor) ||
        !isCurrency(payment.currency) ||
        typeof payment.paidAt !== "string" ||
        !isDateOnly(payment.paidAt) ||
        typeof payment.note !== "string" ||
        !isNonEmptyString(payment.createdAt)
      ) {
        throw invalidTripPayload();
      }
    }
  }

  if (
    value.exchangeRates !== undefined &&
    !isExchangeRateMap(value.exchangeRates, false)
  ) {
    throw invalidTripPayload();
  }
}

function validateBalances(value: unknown): asserts value is Balance[] {
  if (!Array.isArray(value)) {
    throw invalidTripPayload();
  }
  for (const balance of value) {
    if (
      !isRecord(balance) ||
      !isNonEmptyString(balance.participantId) ||
      !isNonEmptyString(balance.name) ||
      !Number.isSafeInteger(balance.amountMinor) ||
      !isCurrency(balance.currency)
    ) {
      throw invalidTripPayload();
    }
  }
}

function validateSettlements(value: unknown): asserts value is Settlement[] {
  if (!Array.isArray(value)) {
    throw invalidTripPayload();
  }
  for (const settlement of value) {
    if (
      !isRecord(settlement) ||
      !isNonEmptyString(settlement.fromId) ||
      !isNonEmptyString(settlement.fromName) ||
      !isNonEmptyString(settlement.toId) ||
      !isNonEmptyString(settlement.toName) ||
      !isPositiveSafeInteger(settlement.amountMinor) ||
      !isCurrency(settlement.currency)
    ) {
      throw invalidTripPayload();
    }
  }
}

function validateExchangeRateInfo(value: unknown): void {
  if (value === undefined) {
    return;
  }
  if (!isRecord(value)) {
    throw invalidTripPayload();
  }
  if (value.source === "fixed") {
    return;
  }
  if (value.source === "custom") {
    if (
      !isRecord(value.customRates) ||
      !isExchangeRateMap(value.customRates, false) ||
      Object.keys(value.customRates).length === 0 ||
      !isRecord(value.defaults) ||
      !isExchangeRateDefaults(value.defaults)
    ) {
      throw invalidTripPayload();
    }
    return;
  }
  if (!isBankRateMetadata(value)) {
    throw invalidTripPayload();
  }
}

function isExchangeRateDefaults(value: Record<string, unknown>): boolean {
  if (!isExchangeRateMap(value.rates, true)) {
    return false;
  }
  return value.source === "fixed" || isBankRateMetadata(value);
}

function isBankRateMetadata(value: Record<string, unknown>): boolean {
  return (
    value.source === "bank" &&
    value.provider === "BANK_OF_TAIWAN" &&
    value.rateType === "spotMid" &&
    isNonEmptyString(value.fetchedAt) &&
    Number.isFinite(Date.parse(value.fetchedAt))
  );
}

function isExchangeRateMap(value: unknown, complete: boolean): boolean {
  if (!isRecord(value)) {
    return false;
  }
  for (const [currency, rate] of Object.entries(value)) {
    if (!isCurrency(currency) || !isPositiveNumber(rate)) {
      return false;
    }
  }
  return (
    !complete || currencies.every((currency) => value[currency] !== undefined)
  );
}

function validateRole(value: unknown): void {
  if (value !== undefined && value !== "owner" && value !== "editor") {
    throw invalidTripPayload();
  }
}

function validateCollaborators(value: unknown): void {
  if (value === undefined) {
    return;
  }
  if (!Array.isArray(value)) {
    throw invalidTripPayload();
  }
  for (const collaborator of value) {
    if (
      !isRecord(collaborator) ||
      !isNonEmptyString(collaborator.userId) ||
      !isNonEmptyString(collaborator.name) ||
      !isNonEmptyString(collaborator.username) ||
      (collaborator.role !== "owner" && collaborator.role !== "editor") ||
      !isNonEmptyString(collaborator.createdAt)
    ) {
      throw invalidTripPayload();
    }
  }
}

function validateShareLinks(value: unknown): void {
  if (value === undefined) {
    return;
  }
  if (!Array.isArray(value)) {
    throw invalidTripPayload();
  }
  for (const link of value) {
    if (
      !isRecord(link) ||
      !isNonEmptyString(link.id) ||
      !isNonEmptyString(link.createdAt) ||
      !isOptionalString(link.revokedAt, true) ||
      !isOptionalString(link.expiresAt, true) ||
      !isOptionalString(link.url)
    ) {
      throw invalidTripPayload();
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isOptionalString(value: unknown, nullable = false): boolean {
  return (
    value === undefined ||
    (nullable && value === null) ||
    typeof value === "string"
  );
}

function isPositiveSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isStringArray(value: unknown, allowEmpty = true): value is string[] {
  return (
    Array.isArray(value) &&
    (allowEmpty || value.length > 0) &&
    value.every(isNonEmptyString)
  );
}

function isOptionalStringArray(value: unknown): boolean {
  return value === undefined || isStringArray(value);
}

function invalidTripPayload(): Error {
  return new Error("Otter returned an unexpected trip payload");
}
