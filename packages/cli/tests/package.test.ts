import { execFileSync, spawnSync } from "node:child_process";
import { copyFile, mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const packageDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

describe("CLI package", () => {
  test("builds an executable bundle that runs without node_modules", async () => {
    execFileSync("npm", ["run", "build"], {
      cwd: packageDirectory,
      stdio: "pipe",
    });

    const bundle = path.join(packageDirectory, "dist", "otter.cjs");
    expect((await stat(bundle)).mode & 0o111).not.toBe(0);

    const isolatedDirectory = await mkdtemp(
      path.join(tmpdir(), "otter-cli-bundle-"),
    );
    const isolatedBundle = path.join(isolatedDirectory, "otter.cjs");
    try {
      await copyFile(bundle, isolatedBundle);
      const result = spawnSync(process.execPath, [isolatedBundle, "--help"], {
        cwd: isolatedDirectory,
        encoding: "utf8",
      });

      expect(result.status).toBe(0);
      expect(result.stderr).toBe("");
      expect(result.stdout).toContain("Usage: otter");

      const inputPath = path.join(isolatedDirectory, "trip.json");
      await writeFile(
        inputPath,
        JSON.stringify({
          balances: [
            {
              amountMinor: 0,
              currency: "TWD",
              name: "Alice",
              participantId: "alice",
            },
          ],
          settlements: [],
          trip: {
            baseCurrency: "TWD",
            createdAt: "2026-09-20T00:00:00.000Z",
            expenses: [],
            id: "trip-1",
            name: "Taipei",
            ownerId: "user-1",
            participants: [{ id: "alice", name: "Alice" }],
          },
        }),
      );
      const preview = spawnSync(
        process.execPath,
        [isolatedBundle, "settlements", "preview", "--input", inputPath],
        { cwd: isolatedDirectory, encoding: "utf8" },
      );
      expect(preview.status).toBe(0);
      expect(preview.stderr).toBe("");
      expect(JSON.parse(preview.stdout)).toEqual({
        balances: [
          {
            amountMinor: 0,
            currency: "TWD",
            name: "Alice",
            participantId: "alice",
          },
        ],
        settlements: [],
      });
    } finally {
      await rm(isolatedDirectory, { force: true, recursive: true });
    }
  });
});
