# MVP integrity boundary

The host selects allowed resources, tools and algorithms. The Pi agent receives no read/bash/edit/write/codemode tools, discovered extensions, arbitrary Python or model-selected filesystem paths. Scientific tools write specific outputs and do not accept fabricated metrics, receipts or artifacts. The worker runs only approved estimators with bounded parameters and a frozen budget. Its environment excludes inherited API credentials.

The runner maintains a hash-linked journal, attempt states and receipts. Auditing cross-checks journal, receipts and artifacts and recalculates metrics from predictions. Completed seeds are not repeated during resume; failures and cancellation require explicit `run --retry`. Historical failures remain visible even after coverage is complete. A local lock prevents cooperating concurrent freezes/runners.

The model cannot automatically reduce the ten-seed policy. Theory and deterministic tasks need a non-applicability protocol; the current runner does not execute them.

Compaction affects only the Pi conversation. The scientific authority is the frozen protocol and external evidence store. Source, worker and lockfile hashes invalidate old protocols after changes. Incompatible data, configuration or environment across receipts prevents aggregation. Tables and reports are recalculated; an old file saying `complete` is not trusted by itself.

## Trust assumptions

Bounded tool authority is the implemented boundary. The host and operating-system user are trusted. That user can edit files, rebuild all hashes or modify application code and resources. There is no third-party signature, host sandbox or WORM storage. The chain detects inconsistencies; it does not prove execution against an adversary controlling the host.

Granting terminal access or unrestricted editing to the model would break this boundary. Stronger protection requires a runner and evidence store with separate identities/permissions, process isolation and receipts signed outside the agent's reach.

Causal and manuscript gates check structure and links, not assumptions, identification, citation semantics, scientific quality or submission readiness. Arbitrary manuscripts are reviewed through structured manifests; this is not a complete claim detector for PDFs or unrestricted prose.

## Dependencies

Pi 1.0.0 distributes a shrinkwrap pinning brace-expansion 5.0.9. The recorded `npm audit` identifies GHSA-qhr7-859c-m2p7 and GHSA-6j4f-fj2g-mc7p (recursion denial of service), as well as GHSA-q2hr-2g5m-vwhr. `npm audit fix` and an override do not update the shrinkwrap-pinned package. Pi 1.0.0 is retained without a silent vendor patch.

The harness does not discover resources or expose glob/terminal tools to the model, but the transitive advisory still requires an upstream update. No clean audit is claimed. The esbuild 0.28.1 override addresses GHSA-g7r4-m6w7-qqqr in tooling.

Review notices and licenses when updating the SDK and rerun relevant checks.
