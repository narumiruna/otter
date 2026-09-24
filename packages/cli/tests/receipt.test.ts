import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, test, vi } from "vitest";
import {
  errorPayload,
  executeCliCommand,
  parseCliCommand,
} from "../src/index.js";

const env = {
  OTTER_URL: "http://localhost:17463",
  OTTER_TOKEN: "otter_api_test",
};
const args = [
  "expenses",
  "upload-receipt",
  "--trip",
  "t/1",
  "--expense",
  "e/1",
  "--version",
  "3",
  "--file",
];
const images = [
  ["image/png", Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2])],
  ["image/jpeg", Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2])],
  ["image/webp", Buffer.from("RIFF1234WEBPdata")],
] as const;

async function withFile(bytes: Buffer, run: (file: string) => Promise<void>) {
  const directory = await mkdtemp(path.join(tmpdir(), "otter-receipt-"));
  try {
    const file = path.join(directory, "image.bin");
    await writeFile(file, bytes);
    await run(file);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test("upload requires a file and an observed positive expense version", () => {
  expect(() => parseCliCommand(args)).toThrow("--file");
  expect(() =>
    parseCliCommand([...args, "image.png", "--version", "4"]),
  ).toThrow("may only be used once");
  for (const version of ["0", "01", "1.2", "9007199254740992"]) {
    expect(() =>
      parseCliCommand([
        ...args.slice(0, -3),
        "--version",
        version,
        "--file",
        "image.png",
      ]),
    ).toThrow("--version");
  }
  expect(parseCliCommand([...args, "image.png"])).toEqual({
    file: "image.png",
    headers: { "If-Match": '"3"' },
    method: "PUT",
    path: "/api/trips/t%2F1/expenses/e%2F1/receipt",
  });
});

test.each(images)(
  "uploads %s bytes with matching MIME and If-Match once",
  async (mime, bytes) => {
    await withFile(bytes, async (file) => {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          Response.json(
            { trip: { expenses: [{ id: "e/1", version: 4, receiptId: "r" }] } },
            { status: 201 },
          ),
        );
      const result = await executeCliCommand(
        parseCliCommand([...args, file]),
        env,
        fetcher,
      );
      expect(result).toMatchObject({
        trip: { expenses: [{ receiptId: "r" }] },
      });
      expect(fetcher).toHaveBeenCalledTimes(1);
      const [url, init] = fetcher.mock.calls[0];
      expect(url).toBe(
        "http://localhost:17463/api/trips/t%2F1/expenses/e%2F1/receipt",
      );
      expect(init?.method).toBe("PUT");
      expect(new Headers(init?.headers).get("Content-Type")).toBe(mime);
      expect(new Headers(init?.headers).get("If-Match")).toBe('"3"');
      expect(new Headers(init?.headers).get("Authorization")).toBe(
        "Bearer otter_api_test",
      );
      expect(Buffer.from(init?.body as Uint8Array)).toEqual(bytes);
    });
  },
);

test("accepts an image exactly 5 MiB in size", async () => {
  const bytes = Buffer.alloc(5 * 1024 * 1024);
  images[0][1].copy(bytes);
  await withFile(bytes, async (file) => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json({ trip: { expenses: [] } }, { status: 201 }),
      );
    await executeCliCommand(parseCliCommand([...args, file]), env, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][1]?.body).toHaveProperty(
      "byteLength",
      5 * 1024 * 1024,
    );
  });
});

test("does not send missing, empty, unsupported, or oversized files", async () => {
  const fetcher = vi.fn<typeof fetch>();
  await expect(
    executeCliCommand(
      parseCliCommand([...args, "/nonexistent/receipt.png"]),
      env,
      fetcher,
    ),
  ).rejects.toMatchObject({ code: "FILE_ERROR" });
  for (const bytes of [
    Buffer.alloc(0),
    Buffer.from("GIF89a"),
    Buffer.alloc(5 * 1024 * 1024 + 1),
  ]) {
    await withFile(bytes, async (file) => {
      await expect(
        executeCliCommand(parseCliCommand([...args, file]), env, fetcher),
      ).rejects.toMatchObject({ code: "FILE_ERROR" });
    });
  }
  expect(fetcher).not.toHaveBeenCalled();
});

test("upload returns version conflicts without retrying", async () => {
  await withFile(images[0][1], async (file) => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json(
          { error: "Changed", code: "EXPENSE_VERSION_CONFLICT" },
          { status: 412 },
        ),
      );
    const caught = await executeCliCommand(
      parseCliCommand([...args, file]),
      env,
      fetcher,
    ).catch((error: unknown) => error);
    expect(errorPayload(caught)).toEqual({
      error: {
        code: "EXPENSE_VERSION_CONFLICT",
        message: "Changed",
        status: 412,
      },
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
