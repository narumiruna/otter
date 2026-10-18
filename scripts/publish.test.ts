import { existsSync, writeFileSync } from "node:fs";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prepare: vi.fn(),
  git: vi.fn<(cwd: string, ...args: string[]) => string>(() => "release-head"),
  run: vi.fn<
    (
      executable: string,
      args: string[],
      options: { env: NodeJS.ProcessEnv },
    ) => { status: number | null; error?: Error }
  >(),
}));
vi.mock("node:child_process", () => ({ spawnSync: mocks.run }));
vi.mock("./release-tags.js", async (original) => ({
  ...(await original<typeof import("./release-tags.js")>()),
  prepareReleaseTags: mocks.prepare,
  git: mocks.git,
}));

const event = JSON.stringify({
  type: "git-tag",
  tag: "@fixture/web@1.1.0",
  packageName: "@fixture/web",
});
let reportPath = "";

beforeEach(() => {
  vi.resetModules();
  mocks.prepare.mockReset().mockResolvedValue([
    {
      name: "@fixture/web",
      version: "1.1.0",
      tag: "@fixture/web@1.1.0",
      changed: true,
      pending: true,
    },
  ]);
  mocks.git.mockReset().mockReturnValue("release-head");
  mocks.run.mockReset().mockImplementation((_executable, _args, options) => {
    reportPath = options.env.CHANGESETS_OUTPUT ?? "";
    writeFileSync(reportPath, `${event}\n`);
    return { status: 0 };
  });
  process.exitCode = undefined;
  reportPath = "";
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  process.exitCode = undefined;
  vi.restoreAllMocks();
});

test("publish adapter emits validated legacy tag lines from the v3 report and removes temporary files", async () => {
  await import("./publish.js");
  expect(mocks.prepare).toHaveBeenCalledOnce();
  expect(mocks.run).toHaveBeenCalledOnce();
  expect(mocks.run.mock.calls[0][1].slice(1)).toEqual(["publish"]);
  expect(mocks.run.mock.calls[0][2].env.CHANGESETS_OUTPUT).toBe(reportPath);
  expect(console.log).toHaveBeenCalledWith("New tag: @fixture/web@1.1.0");
  expect(process.exitCode).toBe(0);
  expect(existsSync(reportPath)).toBe(false);
});

test("historical tag errors stop before the publish process starts", async () => {
  mocks.prepare.mockRejectedValue(new Error("Missing historical tags"));
  await expect(import("./publish.js")).rejects.toThrow(
    "Missing historical tags",
  );
  expect(mocks.run).not.toHaveBeenCalled();
  expect(console.log).not.toHaveBeenCalled();
});

test("a partial publication keeps its failure status and reports its valid tags", async () => {
  mocks.run.mockImplementation((_executable, _args, options) => {
    reportPath = options.env.CHANGESETS_OUTPUT ?? "";
    writeFileSync(reportPath, event);
    return { status: 1 };
  });
  await import("./publish.js");
  expect(process.exitCode).toBe(1);
  expect(console.log).toHaveBeenCalledWith("New tag: @fixture/web@1.1.0");
  expect(existsSync(reportPath)).toBe(false);
});

test("missing reports cannot silently succeed", async () => {
  mocks.run.mockImplementation((_executable, _args, options) => {
    reportPath = options.env.CHANGESETS_OUTPUT ?? "";
    return { status: 0 };
  });
  await expect(import("./publish.js")).rejects.toThrow(
    "did not write a release report",
  );
  expect(console.log).not.toHaveBeenCalled();
  expect(existsSync(reportPath)).toBe(false);
});

test("spawn failures cannot emit tag lines", async () => {
  mocks.run.mockReturnValue({ status: null, error: new Error("spawn failed") });
  await expect(import("./publish.js")).rejects.toThrow("spawn failed");
  expect(console.log).not.toHaveBeenCalled();
});

test("a killed command with no report returns failure", async () => {
  mocks.run.mockReturnValue({ status: null });
  await import("./publish.js");
  expect(process.exitCode).toBe(1);
  expect(console.log).not.toHaveBeenCalled();
});

test.each(["not-json", '{"type":"git-tag","tag":"bad","packageName":"bad"}'])(
  "malformed and unexpected reports fail closed: %s",
  async (content) => {
    mocks.run.mockImplementation((_executable, _args, options) => {
      reportPath = options.env.CHANGESETS_OUTPUT ?? "";
      writeFileSync(reportPath, content);
      return { status: 0 };
    });
    await expect(import("./publish.js")).rejects.toThrow();
    expect(console.log).not.toHaveBeenCalled();
    expect(existsSync(reportPath)).toBe(false);
  },
);

test("a successful same-commit retry can restore a missing public tag", async () => {
  mocks.run.mockImplementation((_executable, _args, options) => {
    reportPath = options.env.CHANGESETS_OUTPUT ?? "";
    writeFileSync(reportPath, "");
    return { status: 0 };
  });
  mocks.git.mockImplementation((_cwd, ...args) =>
    args.includes("for-each-ref") ? "" : "release-head",
  );
  await import("./publish.js");
  expect(mocks.git).toHaveBeenCalledWith(
    expect.any(String),
    "tag",
    "@fixture/web@1.1.0",
    "release-head",
  );
  expect(console.log).toHaveBeenCalledWith("New tag: @fixture/web@1.1.0");
});

test("a failed publish with no tag event cannot invent a release tag", async () => {
  mocks.run.mockImplementation((_executable, _args, options) => {
    reportPath = options.env.CHANGESETS_OUTPUT ?? "";
    writeFileSync(reportPath, "");
    return { status: 1 };
  });
  await import("./publish.js");
  expect(console.log).not.toHaveBeenCalled();
  expect(mocks.git.mock.calls.some(([, command]) => command === "tag")).toBe(
    false,
  );
  expect(process.exitCode).toBe(1);
});

test("already pushed tags are not reported again to create duplicate GitHub Releases", async () => {
  mocks.prepare.mockResolvedValue([
    {
      name: "@fixture/web",
      version: "1.1.0",
      tag: "@fixture/web@1.1.0",
      changed: true,
      pending: false,
    },
  ]);
  await import("./publish.js");
  expect(console.log).not.toHaveBeenCalled();
  expect(mocks.git.mock.calls.some(([, command]) => command === "tag")).toBe(
    false,
  );
});

test("local tags must point to the release commit before they are reported", async () => {
  mocks.git.mockImplementation((_cwd, ...args: string[]) =>
    args.includes("--verify") ? "wrong-commit" : "release-head",
  );
  await expect(import("./publish.js")).rejects.toThrow(
    "does not point to HEAD",
  );
  expect(console.log).not.toHaveBeenCalled();
  expect(existsSync(reportPath)).toBe(false);
});
