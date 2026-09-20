import { readFile, stat } from "node:fs/promises";
import type { Readable } from "node:stream";
import { parseTripPayload } from "@narumitw/otter-contracts";
import {
  calculateBalances,
  calculateSettlements,
} from "@narumitw/otter-core/settlement";
import { CliError } from "./types.js";

const defaultMaxInputBytes = 10 * 1024 * 1024;

export function parseSettlementPreviewArguments(args: string[]): string {
  if (args.length !== 2 || args[0] !== "--input" || !args[1]) {
    throw new CliError(
      "USAGE",
      "settlements preview requires --input <trip payload JSON file or ->",
    );
  }
  return args[1];
}

export function settlementPreview(value: unknown): {
  balances: ReturnType<typeof calculateBalances>;
  settlements: ReturnType<typeof calculateSettlements>;
} {
  const payload = parseTripPayload(value);
  return {
    balances: calculateBalances(payload.trip),
    settlements: calculateSettlements(payload.trip),
  };
}

export async function executeSettlementPreview(
  input: string,
  stdin: Readable = process.stdin,
  maxInputBytes = defaultMaxInputBytes,
): Promise<ReturnType<typeof settlementPreview>> {
  try {
    const text =
      input === "-"
        ? await readStream(stdin, maxInputBytes)
        : await readInputFile(input, maxInputBytes);
    return settlementPreview(JSON.parse(text));
  } catch (error) {
    if (error instanceof CliError) {
      throw error;
    }
    throw new CliError(
      "INPUT_ERROR",
      error instanceof Error ? error.message : "Unable to read trip payload",
    );
  }
}

async function readInputFile(
  input: string,
  maxInputBytes: number,
): Promise<string> {
  if ((await stat(input)).size > maxInputBytes) {
    throw new Error("Trip payload exceeds the 10 MiB limit");
  }
  const value = await readFile(input, "utf8");
  if (Buffer.byteLength(value) > maxInputBytes) {
    throw new Error("Trip payload exceeds the 10 MiB limit");
  }
  return value;
}

async function readStream(
  stream: Readable,
  maxInputBytes: number,
): Promise<string> {
  stream.setEncoding("utf8");
  let value = "";
  let bytes = 0;
  for await (const chunk of stream) {
    bytes += Buffer.byteLength(chunk);
    if (bytes > maxInputBytes) {
      throw new Error("Trip payload exceeds the 10 MiB limit");
    }
    value += chunk;
  }
  return value;
}
