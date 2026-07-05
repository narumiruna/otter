import assert from "node:assert/strict";
import test from "node:test";
import {
  generateShareToken,
  hashShareToken,
  verifyShareTokenHash,
} from "./server-sharing.js";

test("share tokens are high entropy and verified by hash", () => {
  const token = generateShareToken();
  const hash = hashShareToken(token);

  assert.notEqual(hash, token);
  assert.equal(hash.length, 64);
  assert.equal(verifyShareTokenHash(token, hash), true);
  assert.equal(verifyShareTokenHash(`${token}x`, hash), false);
});
