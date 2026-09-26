import { expect, test } from "vitest";
import {
  expenseOperationHeader,
  parseExpenseOperationId,
} from "./expense-operation.js";

test("optional operation keys are UUIDs with stable casing", () => {
  expect(expenseOperationHeader).toBe("Idempotency-Key");
  expect(parseExpenseOperationId(undefined)).toBeUndefined();
  expect(parseExpenseOperationId("01234567-89AB-4DEF-8ABC-0123456789AB")).toBe(
    "01234567-89ab-4def-8abc-0123456789ab",
  );
  for (const bad of [
    "",
    "other",
    "01234567-89ab-4def-8abc-0123456789ab, second",
    "00000000-0000-0000-0000-000000000000",
  ]) {
    expect(() => parseExpenseOperationId(bad)).toThrow();
  }
});
