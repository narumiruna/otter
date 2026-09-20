import assert from "node:assert/strict";
import { test } from "vitest";
import {
  participantSharesFromBody,
  previewParticipantShares,
} from "./expense-splits.js";

const ids = ["a", "b", "c"];

test("equal preview distributes remainder in participant order", () => {
  assert.deepEqual(previewParticipantShares("equal", ids, 100, {}, "TWD"), [
    { participantId: "a", shareMinor: 34 },
    { participantId: "b", shareMinor: 33 },
    { participantId: "c", shareMinor: 33 },
  ]);
  assert.equal(
    participantSharesFromBody({ splitMode: "equal" }, ids, 100, "TWD"),
    undefined,
  );
});

test("ratio preview uses the same weighted rounding as persisted shares", () => {
  const values = { a: "1", b: "2", c: "3" };
  const expected = [
    { participantId: "a", shareMinor: 17 },
    { participantId: "b", shareMinor: 33 },
    { participantId: "c", shareMinor: 50 },
  ];
  assert.deepEqual(
    previewParticipantShares("ratio", ids, 100, values, "TWD"),
    expected,
  );
  assert.deepEqual(
    participantSharesFromBody(
      { splitMode: "ratio", splitValues: values },
      ids,
      100,
      "TWD",
    ),
    expected,
  );
});

test("amount preview requires an exact total", () => {
  assert.throws(
    () =>
      previewParticipantShares(
        "amount",
        ["a", "b"],
        100,
        { a: "0.40", b: "0.50" },
        "USD",
      ),
    /加總必須等於/,
  );
});
