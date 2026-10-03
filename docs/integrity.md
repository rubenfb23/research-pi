# Research and host execution integrity

ResearchPi 1.5.0 retains native Pi file/shell tools, codemode, resources and configured extensions/MCP alongside scientific tools. These execute with the local user account permissions. General scripts can modify project files and scientific artifacts; the system policy requires preserving evidence, but it is not an operating-system sandbox. No universal ten-seed enforcement or audit certification is claimed for arbitrary code.

The scientific runner validates classification protocols and budgets. Built-in estimators remain allowlisted. Version 1.5 adds real/CSV data and explicit custom Python adapters; the custom path executes arbitrary adapter code with host-user permissions and is not a bounded estimator or operating-system sandbox. Its source snapshot, predictions, metrics and ten-seed receipt coverage are checked, but the code can inspect or modify accessible host files. Its supported execution path recalculates metrics from predictions and cross-checks receipts, and its worker environment excludes inherited API credentials. General shell commands use the normal host environment and are a separate execution path.

The runner maintains a hash-linked journal, attempt states and receipts. Auditing cross-checks journal, receipts and artifacts and recalculates metrics from predictions. Completed seeds are not repeated during resume; failures and cancellation require explicit `run --retry`. Historical failures remain visible even after coverage is complete. A local lock prevents cooperating concurrent freezes/runners.

The bounded runner rejects protocols that reduce its ten-seed policy. General file/shell execution is governed by the host instructions rather than this validator. Theory and deterministic tasks need a non-applicability protocol; the current runner does not execute them.

Compaction affects only the Pi conversation. The scientific authority is the frozen protocol and external evidence store. Source, worker and lockfile hashes invalidate old protocols after changes. Incompatible data, configuration or environment across receipts prevents aggregation. Tables and reports are recalculated; an old file saying `complete` is not trusted by itself.

## Trust assumptions

The bounded scientific worker is a supported execution path, not the whole agent authority. The agent, host and operating-system user can access files and execute commands with the user account permissions. That user can edit files, rebuild all hashes or modify application code and resources. There is no third-party signature, host sandbox or WORM storage. The chain detects inconsistencies; it does not prove execution against an adversary controlling the host or a malicious custom adapter.

Version 1.4.0 intentionally grants terminal and file tools, so the earlier restricted agent boundary no longer applies. Stronger protection requires a runner and evidence store with separate identities/permissions, process isolation and receipts signed outside the agent's reach.

Causal and manuscript gates check structure and links, not assumptions, identification, citation semantics, scientific quality or submission readiness. Arbitrary manuscripts are reviewed through structured manifests; this is not a complete claim detector for PDFs or unrestricted prose.

## Dependencies

Pi 1.0.0 distributes a shrinkwrap pinning brace-expansion 5.0.9. The recorded `npm audit` identifies GHSA-qhr7-859c-m2p7 and GHSA-6j4f-fj2g-mc7p (recursion denial of service), as well as GHSA-q2hr-2g5m-vwhr. `npm audit fix` and an override do not update the shrinkwrap-pinned package. Pi 1.0.0 is retained without a silent vendor patch.

The harness now discovers SDK resources and exposes native file/terminal tools. The transitive advisory still requires an upstream update. No clean audit is claimed. The esbuild 0.28.1 override addresses GHSA-g7r4-m6w7-qqqr in tooling.

Review notices and licenses when updating the SDK and rerun relevant checks.
