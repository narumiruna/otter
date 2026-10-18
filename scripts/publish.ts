import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { git, prepareReleaseTags, tagOutput } from "./release-tags.js";

// The action reads legacy human-readable lines. CLI v3 provides stable JSON events.
const cwd = process.cwd();
const expected = await prepareReleaseTags(cwd);
const directory = await mkdtemp(join(tmpdir(), "otter-publish-"));
try {
  const report = join(directory, "report.jsonl");
  const cli = fileURLToPath(
    new URL("../node_modules/@changesets/cli/bin.js", import.meta.url),
  );
  const result = spawnSync(process.execPath, [cli, "publish"], {
    cwd,
    stdio: "inherit",
    env: { ...process.env, CHANGESETS_OUTPUT: report },
  });
  if (result.error) throw result.error;
  let content = "";
  try {
    content = await readFile(report, "utf8");
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT"))
      throw error;
    if (result.status === 0)
      throw new Error("Changesets did not write a release report.");
  }
  const head = git(cwd, "rev-parse", "HEAD");
  const tags = new Set(
    tagOutput(content, expected).filter((tag) =>
      expected.some((pkg) => pkg.tag === tag && pkg.pending),
    ),
  );
  if (result.status === 0) {
    // A retry can find the public version already on npm and receive no tag event.
    // Only versions introduced by this release commit can get a new local tag.
    for (const pkg of expected.filter((pkg) => pkg.changed && pkg.pending)) {
      if (
        !git(cwd, "for-each-ref", "--format=%(refname)", `refs/tags/${pkg.tag}`)
      ) {
        git(cwd, "tag", pkg.tag, head);
      }
      tags.add(pkg.tag);
    }
  }
  for (const tag of tags) {
    if (
      git(cwd, "rev-parse", "--verify", `refs/tags/${tag}^{commit}`) !== head
    ) {
      throw new Error(`Local release tag ${tag} does not point to HEAD.`);
    }
    console.log(`New tag: ${tag}`);
  }
  // Preserve partial-publish failures. The action can still push tags reported above.
  process.exitCode = result.status ?? 1;
} finally {
  await rm(directory, { recursive: true, force: true });
}
