# Updating the Pi SDK

```sh
repi update --check
repi update
```

ResearchPi embeds Pi as an SDK dependency. The standalone `pi update` command manages a separate installation. ResearchPi's command updates both `@earendil-works/pi-ai` and `@earendil-works/pi-coding-agent` to stable npm `latest` versions, pins their exact versions, and retains distributed licenses and lockfile integrity records. It does not update ResearchPi itself, extensions, Python or model credentials.

The candidate is installed with dependency lifecycle scripts disabled in a staging directory. Verification includes TypeScript compilation, loading research and native shell tools, and actual deterministic offline SDK responses with `project_status` tool roundtrips in plain and JSON streaming modes. Source checkouts also run the SDK, conversations/features, CLI and connection regression suites. Build or verification failures leave the current runtime intact; file activation failures restore replaced files. Updates are serialized by a lock directory. Checks do not make paid model requests and do not certify access to a live provider or every third-party extension.

Source installations update `package.json`, `package-lock.json`, `node_modules` and `dist` in the existing checkout. Review and commit changed dependency pins when contributing. Project evidence, conversations, credentials and the Python environment are preserved. Restart running chats after updating.

Native packages use a per-user verified runtime overlay. The system package remains intact and no sudo is needed. New native packages bundle npm alongside Node, including npm's notices. Earlier installers do not contain this command and need a newer ResearchPi installer first. No Windows/macOS native execution of this updater has been verified locally.

The overlay selector lives under the user data directory (`RESEARCH_PI_DATA_DIR` when configured), in `runtime-updates/<installation-key>/active.json`. It is scoped to the installation path and ResearchPi version, so installing a new ResearchPi release selects its packaged runtime. Older verified overlays remain available on disk. To revert to the packaged SDK, close all ResearchPi sessions and remove the installation's `active.json`. Subsequent launches use the original package; no conversations or credentials are deleted.

If an interrupted update leaves `.repi-update-lock`, confirm that no updater is still running before deleting it and retrying. Close other chats before updating, particularly on Windows where files can be held open. Registry/network failures are reported as errors. The command checks even when versions already match.
