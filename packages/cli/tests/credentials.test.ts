import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, onTestFinished, test, vi } from "vitest";
import { executeCliCommand } from "../src/index.js";

const server = "http://localhost:17463";
const missingToken =
  "Run 'otter auth login' or set OTTER_TOKEN before running a data command";

test.each([
  {
    name: "environment overrides stored",
    environmentToken: "  otter_api_environment  ",
    expiresAt: "2099-01-01",
    expected: "otter_api_environment",
    removed: false,
  },
  {
    name: "blank environment falls back",
    environmentToken: "  ",
    expiresAt: "2099-01-01",
    expected: "otter_api_stored",
    removed: false,
  },
  {
    name: "stored token",
    environmentToken: undefined,
    expiresAt: "2099-01-01",
    expected: "otter_api_stored",
    removed: false,
  },
  {
    name: "expired stored token",
    environmentToken: undefined,
    expiresAt: "2000-01-01",
    expected: undefined,
    removed: true,
  },
  {
    name: "environment avoids expired-token cleanup",
    environmentToken: "otter_api_environment",
    expiresAt: "2000-01-01",
    expected: "otter_api_environment",
    removed: false,
  },
])(
  "credential resolution: $name",
  async ({ environmentToken, expiresAt, expected, removed }) => {
    const directory = await mkdtemp(path.join(tmpdir(), "otter-credentials-"));
    onTestFinished(() => rm(directory, { force: true, recursive: true }));
    const filename = path.join(directory, "credentials.json");
    const stored = {
      version: 1,
      servers: {
        [server]: { accessToken: "otter_api_stored", expiresAt },
        "https://other.example": {
          accessToken: "otter_api_other",
          expiresAt: "2099-01-01",
        },
      },
    };
    await writeFile(filename, JSON.stringify(stored));
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ user: null }));
    const request = executeCliCommand(
      { method: "GET", path: "/api/me" },
      {
        OTTER_URL: server,
        OTTER_CONFIG_PATH: filename,
        OTTER_TOKEN: environmentToken,
      },
      fetchMock,
    );
    if (expected) {
      await expect(request).resolves.toEqual({ user: null });
      expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
        `${server}/api/me`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${expected}`,
          }),
        }),
      );
    } else {
      await expect(request).rejects.toMatchObject({
        code: "CONFIG_ERROR",
        message: missingToken,
      });
      expect(fetchMock).not.toHaveBeenCalled();
    }
    const saved = JSON.parse(await readFile(filename, "utf8"));
    expect(saved).toEqual(
      removed
        ? {
            version: 1,
            servers: {
              "https://other.example": stored.servers["https://other.example"],
            },
          }
        : stored,
    );
  },
);

test("missing credentials retain the existing error without a request", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "otter-credentials-"));
  onTestFinished(() => rm(directory, { force: true, recursive: true }));
  const fetchMock = vi.fn<typeof fetch>();
  await expect(
    executeCliCommand(
      { method: "GET", path: "/api/me" },
      {
        OTTER_URL: server,
        OTTER_CONFIG_PATH: path.join(directory, "missing.json"),
      },
      fetchMock,
    ),
  ).rejects.toMatchObject({ code: "CONFIG_ERROR", message: missingToken });
  expect(fetchMock).not.toHaveBeenCalled();
});
