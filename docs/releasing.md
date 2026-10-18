# Versions and releases

Otter uses [Changesets](https://github.com/changesets/changesets) for package versions and changelogs. Only `@narumitw/otter-cli` is published to npm. Other workspace packages are private. Private packages still receive Git tags because `.changeset/config.json` enables `privatePackages.tag`.

## Add a changeset

For a package change, run this command from the repository root:

```bash
npm run changeset
```

Select the affected packages and the SemVer change level. Commit the new `.changeset/*.md` file. For a change that does not need a package version change, use `npm run changeset -- --empty`.

## Authentication

Set the repository Actions secret `PAT_TOKEN` to a fine-grained PAT with access to this repository:

- Contents: Read and write.
- Pull requests: Read and write.

The Release workflow requires this secret. Checkout uses the PAT for the fetch but does not save its credentials in Git configuration. `changesets/action` uses the same PAT for release PRs, tag pushes, and GitHub Releases. The action sets up Git authentication for its own commands.

Do not substitute the default `GITHUB_TOKEN`: its tag pushes do not start the tag-based Deploy workflow. PAT tag pushes can start it. Token expiry or insufficient permissions must be fixed in the repository settings; do not store tokens in source files or logs.

npm authentication is separate. The workflow uses npm trusted publishing through GitHub OIDC. Keep `id-token: write` and the npm trusted-publisher configuration for this repository and `publish.yml`. `PAT_TOKEN` is not an npm token. The workflow does not require an `NPM_TOKEN` secret when trusted publishing is configured.

## Automatic release

A push to `main` runs `.github/workflows/publish.yml`.

1. Changesets creates or updates a release PR when package changesets are present.
2. After that PR is merged, the publish path runs `npm run release`, including the full `npm run check`.
3. Before publication, the tag guard checks all current workspace package versions against the first parent of the release commit and the remote tags.
   - A new package version can receive a tag at the release commit.
   - A missing tag for an unchanged version stops publication. Recover that historical tag at its original release commit first.
   - An existing new-version tag at another commit stops publication. The workflow does not move tags.
4. Changesets publishes eligible npm packages and creates local package tags.
5. The publish adapter reads CLI v3's JSONL report through `CHANGESETS_OUTPUT`. It checks the reported package names and tags, checks local tag targets, and emits the legacy `New tag:` lines that `changesets/action@v1` expects.
6. The action pushes those tags and creates GitHub Releases. Web tags such as `@narumitw/otter-web@0.5.0` can start Deploy.
7. A separate step checks that every expected tag is present on `origin`. New-version tags must point to the release commit. This check uses `hasChangesets`, not `published`, so a silent tag-detection failure cannot produce a successful release run.

CLI v3 changed its human-readable output to `Created git tags:`. The action does not recognize that text by itself. Keep the adapter and its real-CLI fixture test when updating Changesets. Do not downgrade to CLI v2 to restore the old text: that version adds dependency audit findings.

The adapter preserves a nonzero publish exit code, including partial publication. It removes its temporary report after the command exits. If npm publication succeeded but the tag push failed, a successful retry at the same release commit can create or report that commit's missing new-version tag. It does not use this retry rule for older unchanged versions. Do not blindly rerun a failed release or force-push tags. Check the registry and remote tag state first.

## Historical tag recovery

Some earlier successful workflow runs created local tags without pushing them. The first publish after this fix can therefore stop with `Missing historical tags`. This is a safety check, not a token failure.

For each missing tag:

1. Inspect the release PR and package version history to identify the original release commit.
2. Check whether the remote tag already exists and which commit it targets.
3. Stop if the target is uncertain. Never assign an older version to the current workflow-fix commit just to pass the guard.
4. Review the deployment effects before creating or pushing a recovered web tag. Tag pushes can start Deploy.
5. Create and push only the approved missing tags. Do not move existing tags or use a blind `git push --tags`.

Historical tag recovery is a separate release operation. The workflow fix does not perform it automatically.

## Safe local checks

These commands do not publish packages or push repository tags:

```bash
npm run test:tooling
npm run release:verify
npm run check
```

`test:tooling` uses disposable local Git repositories and a bare local remote. It tests CLI v3 tag reports without running `changeset publish`. Publish-process tests replace the process with a test double. `release:verify` only reads package files, Git history, and remote refs; it exits with an error while expected tags are missing.

The release tests also cover missing historical tags, renamed workspaces, annotated tags, wrong targets, missing pushes, malformed reports, process failures, and temporary-file cleanup.

## Commands with side effects

```bash
npm pack --dry-run --workspace @narumitw/otter-cli
npm run version-packages
npm run release
```

`version-packages` changes package versions and changelogs. `release` can publish npm packages and create local tags. Run them only for an approved release. Do not use a real release to test workflow changes.
