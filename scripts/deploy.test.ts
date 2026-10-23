import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const workflow = readFileSync(
  new URL("../.github/workflows/deploy.yml", import.meta.url),
  "utf8",
);
const script = workflow
  .match(/ {8}run: \|\n((?: {10}[^\n]*(?:\n|$))*)/)?.[1]
  ?.replace(/^ {10}/gm, "");
if (!script) throw new Error("Missing deployment shell script");

function startServices(encryptionKey: string | undefined) {
  return spawnSync(
    "bash",
    [
      "--noprofile",
      "--norc",
      "-euo",
      "pipefail",
      "-c",
      `docker() { printf '%s\\n' "docker $*"; }\n${script}`,
    ],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        ENCRYPTION_KEY: encryptionKey,
        POSTGRES_PASSWORD: "test-password",
        PASSKEY_ORIGIN: "https://otter.example.com",
      },
    },
  );
}

test.each([
  { format: "absent", value: undefined },
  { format: "empty", value: "" },
  { format: "lowercase hex", value: "ab".repeat(32) },
  { format: "uppercase hex", value: "AB".repeat(32) },
  { format: "mixed-case hex", value: "aBAb".repeat(16) },
])("deployment accepts $format encryption keys", ({ value }) => {
  const result = startServices(value);
  expect(result.error).toBeUndefined();
  expect(result.status).toBe(0);
  expect(result.stdout).toBe(
    "docker compose up --detach --wait --wait-timeout 120\n",
  );
  expect(result.stderr).toBe("");
});

test.each([
  { format: "Base64", value: Buffer.alloc(32, 17).toString("base64") },
  { format: "short hex", value: "ab".repeat(31) },
  { format: "long hex", value: "ab".repeat(33) },
  { format: "invalid hex", value: "g".repeat(64) },
  { format: "hex with a prefix", value: `0x${"ab".repeat(32)}` },
  { format: "hex with whitespace", value: ` ${"ab".repeat(32)}` },
  { format: "hex with a newline", value: `${"ab".repeat(32)}\n` },
  { format: "63 hex digits and a newline", value: `${"a".repeat(63)}\n` },
])("deployment rejects $format before starting containers", ({ value }) => {
  const result = startServices(value);
  expect(result.error).toBeUndefined();
  expect(result.status).toBe(1);
  expect(result.stdout).toBe("");
  expect(result.stderr).toContain(
    "ENCRYPTION_KEY must contain exactly 64 hexadecimal characters (32 bytes)",
  );
  expect(result.stdout + result.stderr).not.toContain(value);
});
