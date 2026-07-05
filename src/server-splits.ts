import type { Currency } from "./shared/money.js";
import { parseAmountToMinor } from "./shared/money.js";

export type SplitMode = "equal" | "amount" | "ratio" | "shares";

export type ParticipantShare = {
  participantId: string;
  shareMinor: number;
};

function parseSplitMode(value: unknown): SplitMode {
  if (
    value === undefined ||
    value === null ||
    value === "" ||
    value === "equal" ||
    value === "amount" ||
    value === "ratio" ||
    value === "shares"
  ) {
    return value === undefined || value === null || value === ""
      ? "equal"
      : value;
  }
  throw new Error("不支援的分帳模式");
}

function splitValues(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("請輸入分帳值");
  }
  return value as Record<string, unknown>;
}

function parsePositiveWeight(value: unknown, errorMessage: string): number {
  const text = String(value ?? "").trim();
  if (!/^\d+(\.\d+)?$/.test(text)) {
    throw new Error(errorMessage);
  }
  const weight = Number(text);
  if (!Number.isFinite(weight) || weight <= 0) {
    throw new Error(errorMessage);
  }
  return weight;
}

function weightedShares(
  participantIds: string[],
  amountMinor: number,
  weights: number[],
): ParticipantShare[] {
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const shares = weights.map((weight) =>
    Math.floor((amountMinor * weight) / totalWeight),
  );
  let remainder = amountMinor - shares.reduce((sum, share) => sum + share, 0);
  for (let index = 0; remainder > 0 && index < shares.length; index += 1) {
    shares[index] += 1;
    remainder -= 1;
  }
  if (shares.some((share) => share <= 0)) {
    throw new Error("分帳金額必須大於 0");
  }
  return participantIds.map((participantId, index) => ({
    participantId,
    shareMinor: shares[index] ?? 0,
  }));
}

export function participantSharesFromBody(
  body: Record<string, unknown>,
  participantIds: string[],
  amountMinor: number,
  currency: Currency,
): ParticipantShare[] | undefined {
  const mode = parseSplitMode(body.splitMode);
  if (mode === "equal") {
    return undefined;
  }

  const values = splitValues(body.splitValues);
  if (mode === "amount") {
    const shares = participantIds.map((participantId) => {
      try {
        return {
          participantId,
          shareMinor: parseAmountToMinor(
            String(values[participantId] ?? ""),
            currency,
          ),
        };
      } catch {
        throw new Error("請輸入有效分帳金額");
      }
    });
    const total = shares.reduce((sum, share) => sum + share.shareMinor, 0);
    if (total !== amountMinor) {
      throw new Error("分帳金額加總必須等於支出金額");
    }
    return shares;
  }

  const errorMessage =
    mode === "ratio" ? "請輸入有效分帳比例" : "請輸入有效分帳份數";
  return weightedShares(
    participantIds,
    amountMinor,
    participantIds.map((participantId) =>
      parsePositiveWeight(values[participantId], errorMessage),
    ),
  );
}
