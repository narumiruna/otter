import { execFileSync, spawnSync } from "node:child_process";
import { copyFile, mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const packageDirectory = path.dirname(fileURLToPath(import.meta.url));

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
    } finally {
      await rm(isolatedDirectory, { force: true, recursive: true });
    }
  });
});
