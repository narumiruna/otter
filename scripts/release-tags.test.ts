import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, expect, test } from "vitest";
import {
  git,
  parseRemoteTags,
  prepareReleaseTags,
  tagOutput,
  verifyReleaseTags,
} from "./release-tags.js";

const directories: string[] = [];
const identity = {
  ...process.env,
  GIT_AUTHOR_NAME: "Release test",
  GIT_AUTHOR_EMAIL: "release@example.test",
  GIT_COMMITTER_NAME: "Release test",
  GIT_COMMITTER_EMAIL: "release@example.test",
};
const repoRoot = fileURLToPath(new URL("..", import.meta.url));

async function json(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value));
}

function commit(cwd: string) {
  git(cwd, "add", ".");
  execFileSync("git", ["commit", "--quiet", "-m", "test fixture"], {
    cwd,
    env: identity,
  });
}

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), "otter-release-test-"));
  directories.push(directory);
  const cwd = join(directory, "work");
  const remote = join(directory, "remote.git");
  await mkdir(cwd);
  git(directory, "init", "--quiet", "--bare", remote);
  git(cwd, "init", "--quiet", "-b", "main");
  git(cwd, "remote", "add", "origin", remote);
  await json(join(cwd, "package.json"), {
    name: "release-fixture",
    private: true,
    workspaces: ["packages/*"],
  });
  await json(join(cwd, "packages/web/package.json"), {
    name: "@fixture/web",
    version: "1.0.0",
    private: true,
  });
  await json(join(cwd, "package-lock.json"), {
    name: "release-fixture",
    lockfileVersion: 3,
    packages: { "": { name: "release-fixture", workspaces: ["packages/*"] } },
  });
  await json(join(cwd, ".changeset/config.json"), {
    baseBranch: "main",
    privatePackages: { version: true, tag: true },
  });
  commit(cwd);
  const initial = git(cwd, "rev-parse", "HEAD");
  git(cwd, "tag", "@fixture/web@1.0.0");
  git(cwd, "push", "--quiet", "origin", "main", "refs/tags/@fixture/web@1.0.0");
  await json(join(cwd, "packages/web/package.json"), {
    name: "@fixture/web",
    version: "1.1.0",
    private: true,
  });
  commit(cwd);
  return { cwd, remote, initial, head: git(cwd, "rev-parse", "HEAD") };
}

afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

test("new versions can be tagged at the release commit", async () => {
  const { cwd } = await fixture();
  expect(await prepareReleaseTags(cwd)).toEqual([
    {
      name: "@fixture/web",
      version: "1.1.0",
      tag: "@fixture/web@1.1.0",
      changed: true,
      pending: true,
    },
  ]);
});

test("a historical missing tag stops publication before Changesets runs", async () => {
  const { cwd } = await fixture();
  await writeFile(join(cwd, "notes"), "workflow fix");
  commit(cwd);
  await expect(prepareReleaseTags(cwd)).rejects.toThrow(
    "Missing historical tags: @fixture/web@1.1.0",
  );
  expect(git(cwd, "tag", "--list", "@fixture/web@1.1.0")).toBe("");
});

test("renaming a workspace does not make a historical version a new release", async () => {
  const { cwd } = await fixture();
  await mkdir(join(cwd, "packages/renamed"));
  await json(join(cwd, "packages/renamed/package.json"), {
    name: "@fixture/web",
    version: "1.1.0",
    private: true,
  });
  await rm(join(cwd, "packages/web"), { recursive: true });
  commit(cwd);
  await expect(prepareReleaseTags(cwd)).rejects.toThrow(
    "Missing historical tags",
  );
});

test("existing historical tags remain at their original commits", async () => {
  const { cwd, head } = await fixture();
  git(cwd, "tag", "@fixture/web@1.1.0");
  git(cwd, "push", "--quiet", "origin", "refs/tags/@fixture/web@1.1.0");
  await writeFile(join(cwd, "notes"), "workflow fix");
  commit(cwd);
  await prepareReleaseTags(cwd);
  await verifyReleaseTags(cwd);
  expect(git(cwd, "rev-parse", "@fixture/web@1.1.0")).toBe(head);
});

test("verification rejects local-only tags even if the action reports no publication", async () => {
  const { cwd } = await fixture();
  git(cwd, "tag", "@fixture/web@1.1.0");
  await expect(verifyReleaseTags(cwd)).rejects.toThrow(
    "was not pushed to origin",
  );
});

test("conflicting remote release tags fail before publication and after the action", async () => {
  const { cwd, initial } = await fixture();
  git(cwd, "tag", "@fixture/web@1.1.0", initial);
  git(cwd, "push", "--quiet", "origin", "refs/tags/@fixture/web@1.1.0");
  await expect(prepareReleaseTags(cwd)).rejects.toThrow(
    "Do not move an existing release tag",
  );
  await expect(verifyReleaseTags(cwd)).rejects.toThrow(
    "does not point to the release commit",
  );
  expect(git(cwd, "rev-parse", "@fixture/web@1.1.0")).toBe(initial);
});

test("a conflicting local-only tag stops publication before npm can run", async () => {
  const { cwd, initial } = await fixture();
  git(cwd, "tag", "@fixture/web@1.1.0", initial);
  await expect(prepareReleaseTags(cwd)).rejects.toThrow(
    "Local release tag @fixture/web@1.1.0 does not point to HEAD",
  );
});

test("annotated remote tags are checked against their commit, not their tag object", async () => {
  const { cwd } = await fixture();
  execFileSync("git", ["tag", "-a", "@fixture/web@1.1.0", "-m", "release"], {
    cwd,
    env: identity,
  });
  git(cwd, "push", "--quiet", "origin", "refs/tags/@fixture/web@1.1.0");
  await prepareReleaseTags(cwd);
  await verifyReleaseTags(cwd);
});

test("remote tag parsing prefers peeled commits in either line order", () => {
  const lines = [
    "aaaa\trefs/tags/@fixture/web@1.0.0",
    "bbbb\trefs/tags/@fixture/web@1.0.0^{}",
  ];
  expect(parseRemoteTags(lines.join("\n")).get("@fixture/web@1.0.0")).toBe(
    "bbbb",
  );
  expect(
    parseRemoteTags(lines.reverse().join("\n")).get("@fixture/web@1.0.0"),
  ).toBe("bbbb");
});

test("CLI v3 structured tag events produce the legacy action's expected tag lines", async () => {
  const { cwd, head } = await fixture();
  const expected = await prepareReleaseTags(cwd);
  const outputPath = join(cwd, "tag-report.jsonl");
  // This command creates tags only in the disposable local repository. It cannot publish to npm.
  const stdout = execFileSync(
    process.execPath,
    [join(repoRoot, "node_modules/@changesets/cli/bin.js"), "git-tag"],
    {
      cwd,
      encoding: "utf8",
      env: { ...process.env, CHANGESETS_OUTPUT: outputPath },
    },
  );
  expect(stdout).not.toMatch(/New tag:/);
  const tags = tagOutput(await readFile(outputPath, "utf8"), expected);
  expect(tags).toEqual(["@fixture/web@1.1.0"]);
  for (const tag of tags) {
    expect(
      `New tag: ${tag}`
        .match(/New tag:\s+(@[^/]+\/[^@]+|[^/]+)@([^\s]+)/)
        ?.slice(1),
    ).toEqual(["@fixture/web", "1.1.0"]);
    expect(git(cwd, "rev-parse", `refs/tags/${tag}^{commit}`)).toBe(head);
  }
  git(cwd, "push", "--quiet", "origin", "refs/tags/@fixture/web@1.1.0");
  await verifyReleaseTags(cwd);
});

test.each([
  "not-json",
  "{}",
  '{"type":"git-tag"}',
  '{"type":"git-tag","tag":"wrong@1.0.0","packageName":"wrong"}',
  '{"type":"git-tag","tag":"@fixture/web@1.1.0","packageName":"wrong"}',
])("invalid or unexpected tag events are rejected: %s", (report) => {
  expect(() =>
    tagOutput(report, [
      {
        name: "@fixture/web",
        version: "1.1.0",
        tag: "@fixture/web@1.1.0",
        changed: true,
      },
    ]),
  ).toThrow();
});

test("non-tag report events are ignored and duplicate tags are reported once", () => {
  const event = JSON.stringify({
    type: "git-tag",
    tag: "@fixture/web@1.1.0",
    packageName: "@fixture/web",
  });
  expect(
    tagOutput(`{"type":"npm-publish"}\n${event}\n${event}\n`, [
      {
        name: "@fixture/web",
        version: "1.1.0",
        tag: "@fixture/web@1.1.0",
        changed: true,
      },
    ]),
  ).toEqual(["@fixture/web@1.1.0"]);
});

test("workflow uses PAT authentication and checks remote tags independently of published output", async () => {
  const workflow = await readFile(
    join(repoRoot, ".github/workflows/publish.yml"),
    "utf8",
  );
  expect(workflow).toContain(`github-token: \${{ secrets.PAT_TOKEN }}`);
  expect(workflow).toContain(`token: \${{ secrets.PAT_TOKEN }}`);
  expect(workflow).toContain("persist-credentials: false");
  expect(workflow).toContain("id-token: write");
  expect(workflow).toContain(
    "if: steps.release.outputs.hasChangesets == 'false'",
  );
  expect(workflow).toContain("run: npm run release:verify");
  expect(workflow).not.toContain("steps.release.outputs.published ==");
});
