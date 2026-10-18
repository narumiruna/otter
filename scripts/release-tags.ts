import { execFileSync } from "node:child_process";
import { glob, readFile } from "node:fs/promises";
import { matchesGlob, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type PackageVersion = { name: string; version: string };
export type ReleaseTag = PackageVersion & { tag: string; changed: boolean };

export function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function packageVersion(text: string): PackageVersion {
  const data: unknown = JSON.parse(text);
  if (
    !data ||
    typeof data !== "object" ||
    !("name" in data) ||
    typeof data.name !== "string" ||
    !("version" in data) ||
    typeof data.version !== "string"
  )
    throw new Error("Package must have a name and version.");
  return { name: data.name, version: data.version };
}

async function packages(
  cwd: string,
  revision?: string,
): Promise<PackageVersion[]> {
  const root: unknown = JSON.parse(
    revision
      ? git(cwd, "show", `${revision}:package.json`)
      : await readFile(resolve(cwd, "package.json"), "utf8"),
  );
  if (
    !root ||
    typeof root !== "object" ||
    !("workspaces" in root) ||
    !Array.isArray(root.workspaces) ||
    !root.workspaces.every((value: unknown) => typeof value === "string")
  ) {
    throw new Error("Release checks require workspace path patterns.");
  }
  const patterns = root.workspaces.map(
    (pattern: string) => `${pattern}/package.json`,
  );
  const paths: string[] = [];
  if (revision) {
    paths.push(
      ...git(cwd, "ls-tree", "-r", "--name-only", revision)
        .split("\n")
        .filter((path) =>
          patterns.some((pattern: string) => matchesGlob(path, pattern)),
        ),
    );
  } else {
    for await (const path of glob(patterns, { cwd })) paths.push(path);
  }
  return Promise.all(
    paths
      .sort()
      .map(async (path) =>
        packageVersion(
          revision
            ? git(cwd, "show", `${revision}:${path}`)
            : await readFile(resolve(cwd, path), "utf8"),
        ),
      ),
  );
}

export function parseRemoteTags(output: string): Map<string, string> {
  const tags = new Map<string, string>();
  const peeled = new Set<string>();
  for (const line of output.trim().split("\n")) {
    const match = /^([a-f0-9]+)\s+refs\/tags\/(.+?)(\^\{\})?$/.exec(line);
    if (!match) continue;
    const [, sha, tag, dereferenced] = match;
    if (dereferenced || !peeled.has(tag)) tags.set(tag, sha);
    if (dereferenced) peeled.add(tag);
  }
  return tags;
}

async function inspect(cwd: string) {
  const previous = new Map(
    (await packages(cwd, "HEAD^1")).map((pkg) => [pkg.name, pkg.version]),
  );
  const tags: ReleaseTag[] = (await packages(cwd)).map((pkg) => ({
    ...pkg,
    tag: `${pkg.name}@${pkg.version}`,
    changed: previous.get(pkg.name) !== pkg.version,
  }));
  if (!tags.length)
    throw new Error("No workspace packages found for release checks.");
  const remote = parseRemoteTags(git(cwd, "ls-remote", "--tags", "origin"));
  return { tags, remote, head: git(cwd, "rev-parse", "HEAD") };
}

export async function prepareReleaseTags(
  cwd: string,
): Promise<(ReleaseTag & { pending: boolean })[]> {
  const { tags, remote, head } = await inspect(cwd);
  const historical = tags.filter(
    ({ tag, changed }) => !changed && !remote.has(tag),
  );
  if (historical.length) {
    throw new Error(
      `Missing historical tags: ${historical.map(({ tag }) => tag).join(", ")}. Recover them at their original release commits before publishing. No publish command was run.`,
    );
  }
  for (const { tag, changed } of tags) {
    if (
      changed &&
      git(cwd, "for-each-ref", "--format=%(refname)", `refs/tags/${tag}`) &&
      git(cwd, "rev-parse", "--verify", `refs/tags/${tag}^{commit}`) !== head
    ) {
      throw new Error(
        `Local release tag ${tag} does not point to HEAD. Do not move an existing release tag.`,
      );
    }
    if (changed && remote.has(tag) && remote.get(tag) !== head) {
      throw new Error(
        `Remote tag ${tag} does not point to HEAD. Do not move an existing release tag.`,
      );
    }
  }
  return tags.map((pkg) => ({ ...pkg, pending: !remote.has(pkg.tag) }));
}

export async function verifyReleaseTags(cwd: string): Promise<void> {
  const { tags, remote, head } = await inspect(cwd);
  for (const { tag, changed } of tags) {
    if (!remote.has(tag))
      throw new Error(`Release tag ${tag} was not pushed to origin.`);
    if (changed && remote.get(tag) !== head) {
      throw new Error(
        `Release tag ${tag} does not point to the release commit ${head}.`,
      );
    }
  }
}

export function tagOutput(report: string, expected: ReleaseTag[]): string[] {
  const allowed = new Map(expected.map((pkg) => [pkg.tag, pkg]));
  const tags = new Set<string>();
  for (const line of report.split("\n").filter((line) => line.trim())) {
    const event: unknown = JSON.parse(line);
    if (!event || typeof event !== "object" || !("type" in event)) {
      throw new Error("Invalid Changesets release report.");
    }
    if (event.type !== "git-tag") continue;
    if (
      !("tag" in event) ||
      typeof event.tag !== "string" ||
      !("packageName" in event) ||
      typeof event.packageName !== "string"
    ) {
      throw new Error("Invalid Changesets git-tag event.");
    }
    const pkg = allowed.get(event.tag);
    if (!pkg || pkg.name !== event.packageName) {
      throw new Error("Changesets reported an unexpected release tag.");
    }
    tags.add(event.tag);
  }
  return [...tags];
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  if (process.argv[2] !== "verify") {
    throw new Error("Usage: tsx scripts/release-tags.ts verify");
  }
  await verifyReleaseTags(process.cwd());
  console.log("Release tags are present on origin at the expected commits.");
}
