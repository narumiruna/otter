import { readFile, stat } from "node:fs/promises";
import { CliError } from "./types.js";

const maxReceiptBytes = 5 * 1024 * 1024;

export async function readReceipt(file: string): Promise<{
  bytes: Buffer;
  mimeType: string;
}> {
  let bytes: Buffer;
  try {
    const info = await stat(file);
    if (!info.isFile()) {
      throw new CliError("FILE_ERROR", "Receipt must be a regular file");
    }
    if (info.size === 0 || info.size > maxReceiptBytes) {
      throw new CliError("FILE_ERROR", "Receipt must be 1 byte to 5 MiB");
    }
    bytes = await readFile(file);
  } catch (error) {
    if (error instanceof CliError) throw error;
    throw new CliError("FILE_ERROR", "Could not read receipt image");
  }
  if (bytes.length === 0 || bytes.length > maxReceiptBytes) {
    throw new CliError("FILE_ERROR", "Receipt must be 1 byte to 5 MiB");
  }
  const mimeType = receiptMimeType(bytes);
  if (!mimeType) {
    throw new CliError(
      "FILE_ERROR",
      "Receipt must be a JPEG, PNG, or WebP image",
    );
  }
  return { bytes, mimeType };
}

function receiptMimeType(bytes: Buffer): string | undefined {
  if (
    bytes.length >= 3 &&
    bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
  ) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return undefined;
}
