# Releases and branch protection

## Publish a version

1. In a topic branch, update `package.json` and the root version in `package-lock.json` to the same `MAJOR.MINOR.PATCH`. Update installation examples and describe the changes. Installer versions currently do not accept suffixes; use GitHub's prerelease flag for previews.
2. Open a pull request. Scientific checks and all four native installer jobs must pass. Merge into `main` using squash or rebase.
3. Create a GitHub release with tag `v<package-version>` targeting that merged commit. Publish it (or publish it as a prerelease). Saving a draft does not build packages.
4. Wait for **Release packages** in Actions. The workflow verifies that the tag version matches the package and that its commit belongs to `main`, then runs scientific checks and native builds against that exact commit.
5. Once all checks pass, the workflow uploads four installers, four `.sha256` files, and `release-manifest.json` with the tag, source commit, sizes, and checksums.

The published release can temporarily have no installers while Actions runs. Do not announce downloads until the upload job succeeds. The workflow uses `release: published`, which covers both stable releases and published prereleases. See [GitHub's release event documentation](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#release).

| Build | Runner | Artifact |
| --- | --- | --- |
| Linux x64 | Ubuntu 24.04 | `research-pi_<version>_amd64.deb` |
| Windows x64 | Windows 2022 | `research-pi-<version>-windows-x64-setup.exe` |
| macOS arm64 | macOS 15 | `research-pi-<version>-macos-arm64.pkg` |
| macOS x64 | macOS 15 Intel | `research-pi-<version>-macos-x64.pkg` |

Native builds include Node 22.23.0 and preserve ResearchPi, Pi, dependency, and Node license notices. Each installer is installed and exercised with offline chat, actual SDK tool dispatch, conversation resumption, and a working directory with spaces. Removal checks preserve user data. The separate scientific workflow runs real CPU experiments on Linux. Provider inference, installer signing, notarization, and Linux/Windows ARM packages remain outside these checks.

## Recovery

For a published release whose workflow failed before upload, correct the failure and rerun the failed jobs. **Release packages** also has a manual dispatch input for an existing published tag. That tag must contain the workflow and scripts and be part of `main` history. Old releases created before this workflow cannot gain it retroactively.

Uploads do not overwrite existing assets. If upload fails partway, compare the existing assets against the verified artifact checksums, remove only the incomplete release assets as maintainer, and rerun the publish job. Do not retag or silently replace a distributed version; publish a new version for code changes. SHA-256 checksums prove consistency with the downloaded files, not publisher identity.

Only the final upload job has `contents: write`; all build and test jobs have read-only repository permissions. Workflows do not run privileged code from fork pull requests. Release tags are validated as `vMAJOR.MINOR.PATCH` before they are used.

## Main protection

The configured rule requires a pull request, an up-to-date branch, resolved review conversations, a linear history, and these GitHub Actions checks:

- `reproducibility`
- `installer-deb-x64`
- `installer-windows-x64`
- `installer-macos-arm64`
- `installer-macos-x64`

Checks are tied to the GitHub Actions app. Administrator enforcement is enabled; force pushes and deletion are disabled. External approval is not mandatory while the project has a single maintainer. Protection is a GitHub setting, not installed automatically by cloning this repository. See [protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).
