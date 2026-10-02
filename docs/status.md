# Implementation and verification status

Updated 2026-10-02. ResearchPi uses Pi SDK 1.0.0 without modifying its core. Original code is MIT licensed; Pi and dependency notices are retained separately. The repository is public at [rubenfb23/research-pi](https://github.com/rubenfb23/research-pi).

## Current capabilities

| Area | Implemented and tested behavior | Verification boundary |
| --- | --- | --- |
| Pi integration | Explicit scientific resources, bounded tools, persistent sessions, actual SDK tool dispatch, resume and compaction | Simulated transports plus a live OpenCode Go text/reasoning check; broader provider and scientific judgment coverage remains unverified |
| Experiments | Twenty real CPU fits, ten distinct seeds per configuration, frozen protocols, receipts, predictions, journal, retries and recalculated metrics | Synthetic binary classification with logistic SGD and random forest |
| Scientific library | Six attributed notes, topic/lexical retrieval, experimental/methodology/causal protocols | Small curated library; no semantic search or universal citation checking |
| Causal planning | Missing-field and non-identifiability states | Fields do not prove assumptions, identification or causality; no causal estimators |
| Papers | Five editorial profiles, evidence-derived methodology/results, numerical provenance manifest and missing-items report | Human scientific/editorial review remains required |
| Venues | Officially checked NeurIPS 2026 and TMLR snapshots | Partial profiles; recheck before submission; NeurIPS 2026's submission window has passed |
| Connections | Claude API, OpenAI API/ChatGPT OAuth, OpenCode Zen/Go API keys and offline testing | Basic Go glm-5.3-flash live response checked; other models/accounts and OAuth remain unverified |
| Packaging | Linux/Windows x64 and macOS arm64/x64 installers with bundled Node and notices | Native install/chat/resume/removal checked; no signing or notarization |
| Repository | MIT, protected main, PR checks and verified release upload | Checksums establish consistency rather than publisher identity |

The interface, setup prompts, errors, scientific notes, profiles, generated paper scaffolds and current documentation use English from 0.2.3. This also applies when terminal locale is Spanish. System instructions request English model responses. Existing conversations, user-supplied text and experiment evidence are preserved rather than translated in place.

## Scientific verification

Tests exercise real scikit-learn fits and independently recalculate prediction-derived metrics. Negative cases cover nine seeds, duplicates, worker startup failures, cancellation, explicit retries, incompatible protocol/configuration/data/environment, edited artifacts, concurrency locks and changed frozen protocols. Resume/compaction preserve actual evidence.

`demo` produces twenty successful runs and a complete recalculated audit, ten seeds per method. Aggregation creates CSV/JSON linked to receipts; paper generation creates methodology, results and missing-review reports. Dispersion is sample standard deviation over training runs on fixed data and split, not a population confidence interval.

The original local demo recorded mean accuracy ± sample SD of 0.610400 ± 0.034160 for logistic SGD and 0.772800 ± 0.032703 for random forest. Log loss was 0.676731 ± 0.022002 and 0.510471 ± 0.019127. These historical numbers do not establish general superiority or a novel contribution. They are not a claim about the current version's audit.

Original protocol hash: `bd19be3f8defac9d724049c9abde705a6cc73f7ad565c306ab5d235a2289bb7c`. Exact code/table/evidence hashes and receipts belong in local or CI artifacts, not manually asserted results. Local outputs are ignored by Git. New code versions require a new project directory for valid reproduction; earlier evidence is retained.

## Verification history

All entries below describe the versions tested at the time. Test counts increased as features were added.

| Stage | Evidence |
| --- | --- |
| Four initial milestones, 17 tests and twenty-fit demo | [Initial CI](https://github.com/rubenfb23/research-pi/actions/runs/36997449500), [protocol-tools CI](https://github.com/rubenfb23/research-pi/actions/runs/36997809448), implementation commit `c76bbd55d4ff78bc63d8a4638fd7f1e7e139ded1` |
| Simplified launcher/connections, 23 tests and demo | [CI](https://github.com/rubenfb23/research-pi/actions/runs/37003788440), commit `2a4d91e3716bc7aa38a4ebddcd9e5987e52a4e03` |
| Native installers 0.2.0, all four platforms | [Installer CI](https://github.com/rubenfb23/research-pi/actions/runs/37005882068), commit `77711dc071416fc781efadc4d1379b3da1a7c8fa` |
| Scientific checks, 25 tests and demo | [CI](https://github.com/rubenfb23/research-pi/actions/runs/37005882173) |
| MIT, primary repi launcher and automatic release packages 0.2.1 | [Successful release workflow](https://github.com/rubenfb23/research-pi/actions/runs/37008591434), commit `5290659460b4b5ec11a5fb86f3a0faa741c762a6` |
| OpenCode 0.2.2, 32 tests | [Scientific PR checks](https://github.com/rubenfb23/research-pi/actions/runs/37010219740), [four native PR installers](https://github.com/rubenfb23/research-pi/actions/runs/37010219838), merged commit `15d2a09ffeb8979dd8b432a925e74da315f1677e` |

Earlier clean-checkout checks verified automatic npm setup, interactive onboarding with a non-echoed fake key, connection changes retaining history, automatic Python setup and twenty actual fits. No inference was sent. The `examples/easy-launch-v1/.research-pi/` execution recorded code fingerprint `a109d1401d7f8bf2ca67c6a6ca58d9d7e7474f3e75f70470e8e3a80ab80f45cf`.

Native package tests verified help/version, chat, SDK tool calls, resume, invocation from paths containing spaces, user-data locations and removal preserving data. macOS tests compare canonical paths across `/var` and `/private/var`. Linux additionally passed install/remove in Ubuntu 24.04 without preinstalled Node and a twenty-fit demo as an unprivileged user in Debian Bookworm with Python 3.14. The packaged scientific run recorded code fingerprint `cf055db6a46bd694cf4f6fc39d5396d64a2834ea770c71a107af45c1da2ca7b9`; its venv used per-user data without writing to `/opt/research-pi/app`.

## OpenCode and English-interface checks

OpenCode uses native Pi providers rather than an OpenCode local server. Tests simulate seven provider/API routes, verify key/client/session headers, independent credential storage, cancellation, actual bounded tool execution and stable session IDs after resume. CLI checks cover both catalogs, environment-key setup, model switching and rejection of piped keys. Native smoke tests check both catalogs. See [OpenCode](opencode.md).

Version 1.1.0 passes 40 local tests, including twenty actual CPU fits. English-interface checks exercise fresh connection setup under a Spanish locale, English help/errors and paper/resource output. A separate pseudo-terminal check verified no-argument startup of the globally linked `repi`, fresh English onboarding under `es_ES.UTF-8`, offline chat and clean exit. Native smoke tests exercise the actual installed onboarding and help. Release publication runs scientific and all four native installer checks before uploading four packages, four checksums and a source-commit manifest. See [releases](releases.md).

## Terminal and prompt 1.0.0

The CLI uses a colored scrolling layout, immediate answer streaming, separate provider reasoning, tool progress/completion, a model picker, and persisted effort/display preferences. Plain output and `NO_COLOR` remain supported. Tests verify text arrives before completion, reasoning stays off answer stdout, split terminal controls are stripped, and settings survive resume. A real pseudo-terminal verified colored startup, input, tool boundaries and clean exit. [Assistant contract](assistant.md).

The initial live greeting check found a Spanish, lengthy response; the prompt was strengthened with an explicit English response contract and short greeting example. A subsequent fresh-project Go `glm-5.3-flash` call returned exactly “Hi! What research question are you working on?”, emitted 58 characters of provider reasoning, and called no tools. This is one behavior check, not a general model-compliance evaluation. SDK-clamped effort was high for this model although the project default is medium.

## Keyboard verification 1.1.0

Completion tests cover command prefixes, provider/model arguments, supported effort levels and prose without completion. History checks cover deduplication, a 500-entry bound, separate concurrent-session snapshots, corrupt storage recovery and whitespace/control exclusions. A POSIX pseudo-terminal exercises the actual compiled CLI with unique and double Tab, provider connection, model IDs and the picker, ↑/↓ navigation, prefix draft restoration, restart persistence and hidden credential entry. Persisted SDK user messages verify recalled text was actually submitted. Go model completion uses the real SDK catalog with a fake key and sends no inference request.

The automated keyboard test runs on POSIX. Windows native installer smoke tests exercise setup/chat/resume with piped input; interactive Windows keyboard behavior still needs a native terminal check. The added completion/history code uses Node's cross-platform readline API.

## Pending capabilities and limitations

- Real-account ChatGPT login, Anthropic/OpenAI/Zen access and other Go models remain unverified. Live Go glm-5.3-flash text and provider-exposed reasoning were checked on October 2, 2026; this does not establish research judgment or real tool execution.
- Causal estimation/automatic identification, real datasets, RL, LLM evaluation, theory and deterministic runners remain future extensions.
- The model cannot reduce ten seeds. An explicit human-exception mechanism would require separate implementation.
- Hernán/Robins chapter-level recommendations still need specific curation; the current note verifies the website and bibliographic identity.
- Venue coverage is partial and current official instructions must be rechecked before submission.
- Manuscript review uses structured manifests, not arbitrary PDF/prose claim extraction or scientific certification.
- Bounded tools protect against unrestricted model edits. The host/user is trusted; there is no independently signed evidence store or host sandbox. See [integrity](integrity.md).
- Pi 1.0.0's shrinkwrap retains a high-severity brace-expansion advisory pending upstream update. The esbuild override applies; no clean dependency audit is claimed.
- Windows signing, macOS signing/notarization, Linux/Windows ARM packages and scientific Python experiments on Windows/macOS remain pending.
