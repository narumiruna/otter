import assert from "node:assert/strict";
import test from "node:test";
import { type TripBackupV1, validateTripBackupV1 } from "./backup.js";

const backup: TripBackupV1 = {
  exportedAt: "2026-06-25T00:00:00.000Z",
  trip: {
    baseCurrency: "TWD",
    expenses: [
      {
        amountMinor: 100,
        createdAt: "2026-06-25T00:00:00.000Z",
        currency: "TWD",
        description: "Dinner",
        expenseDate: "2026-06-25",
        id: "expense_1",
        paidById: "participant_alice",
        participantIds: ["participant_alice", "participant_bob"],
      },
    ],
    name: "Tokyo",
    participants: [
      { id: "participant_alice", name: "Alice" },
      { id: "participant_bob", name: "Bob" },
    ],
  },
  version: 1,
};

test("validates trip backup version and required relationships", () => {
  assert.equal(validateTripBackupV1(backup).trip.name, "Tokyo");
  assert.throws(
    () => validateTripBackupV1({ ...backup, version: 99 }),
    /不支援的備份版本/,
  );
  assert.throws(
    () =>
      validateTripBackupV1({
        ...backup,
        trip: { ...backup.trip, participants: [] },
      }),
    /備份缺少參與者/,
  );
  assert.throws(
    () =>
      validateTripBackupV1({
        ...backup,
        trip: {
          ...backup.trip,
          expenses: [
            {
              ...backup.trip.expenses[0],
              paidById: "participant_missing",
            },
          ],
        },
      }),
    /備份支出格式錯誤/,
  );
  assert.throws(
    () =>
      validateTripBackupV1({
        ...backup,
        trip: { ...backup.trip, exchangeRates: { BTC: 1 } },
      }),
    /備份匯率格式錯誤/,
  );
  assert.throws(
    () =>
      validateTripBackupV1({
        ...backup,
        trip: { ...backup.trip, exchangeRates: { USD: 0 } },
      }),
    /備份匯率格式錯誤/,
  );
});
