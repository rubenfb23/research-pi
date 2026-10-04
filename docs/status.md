# Implementation and verification status

Updated 2026-10-04. ResearchPi uses Pi SDK 1.0.2 without modifying its core. Original code is MIT licensed; Pi and dependency notices are retained separately. The repository is public at [rubenfb23/research-pi](https://github.com/rubenfb23/research-pi).

## SDK updates (unreleased)

`repi update` updates both embedded SDK dependencies in staging and verifies compilation, resource/tool loading and an actual offline SDK/tool roundtrip before activation. Source updates additionally run SDK, CLI, session and connection regressions. `--check` is read-only. Source activation restores replaced files if activation fails; native packages select a per-user verified overlay and retain their system runtime. New packages include npm and its notices. Native Pi update hints now name `repi update`.

Verified locally on Linux: actual SDK 1.0.0 → 1.0.2 source update; 81 tests passing with no skips; injected installation/build/tool/activation failures; actual candidate build and activation through a native-format fixture; subsequent launch through its base launcher. Windows/macOS native updater execution and freshly published installers remain pending. No live provider access is asserted by the offline checks. Earlier release verification below describes the versions used at release time.

## Current capabilities

| Area | Implemented and tested behavior | Verification boundary |
| --- | --- | --- |
| Pi integration | Native Pi UI, file/shell and scientific tools, resources, MCP, persistent sessions, queues, retries and compaction | Simulated transports plus a live OpenCode Go text/reasoning check; broader provider and scientific judgment coverage remains unverified |
| Experiments | Synthetic/real/CSV classification, frozen custom Python adapters, ten seeds per configuration, receipts, predictions and recalculated metrics | Fixed binary classification splits; custom code executes with host-user permissions and requires scientific review |
| Scientific library | Six attributed notes, topic/lexical retrieval, experimental/methodology/causal protocols | Small curated library; no semantic search; DOI metadata verification is separate from source-to-claim support |
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

Version 1.5.0 passes 76 local tests, including fifty actual CPU fits. English-interface checks exercise fresh connection setup under a Spanish locale, English help/errors and paper/resource output. A separate pseudo-terminal check verified no-argument startup of the globally linked `repi`, fresh English onboarding under `es_ES.UTF-8`, offline chat and clean exit. Native smoke tests exercise the actual installed onboarding and help. Release publication runs scientific and all four native installer checks before uploading four packages, four checksums and a source-commit manifest. See [releases](releases.md).

## Terminal and prompt 1.0.0

The CLI uses a colored scrolling layout, immediate answer streaming, separate provider reasoning, tool progress/completion, a model picker, and persisted effort/display preferences. Plain output and `NO_COLOR` remain supported. Tests verify text arrives before completion, reasoning stays off answer stdout, split terminal controls are stripped, and settings survive resume. A real pseudo-terminal verified colored startup, input, tool boundaries and clean exit. [Assistant contract](assistant.md).

The initial live greeting check found a Spanish, lengthy response; the prompt was strengthened with an explicit English response contract and short greeting example. A subsequent fresh-project Go `glm-5.3-flash` call returned exactly “Hi! What research question are you working on?”, emitted 58 characters of provider reasoning, and called no tools. This is one behavior check, not a general model-compliance evaluation. SDK-clamped effort was high for this model although the project default is medium.

## Keyboard verification 1.1.0

Completion tests cover command prefixes, provider/model arguments, supported effort levels and prose without completion. History checks cover deduplication, a 500-entry bound, separate concurrent-session snapshots, corrupt storage recovery and whitespace/control exclusions. A POSIX pseudo-terminal exercises the actual compiled CLI with unique and double Tab, provider connection, model IDs and the picker, ↑/↓ navigation, prefix draft restoration, restart persistence and hidden credential entry. Persisted SDK user messages verify recalled text was actually submitted. Go model completion uses the real SDK catalog with a fake key and sends no inference request.

The automated keyboard test runs on POSIX. Windows native installer smoke tests exercise setup/chat/resume with piped input; interactive Windows keyboard behavior still needs a native terminal check. The added completion/history code uses Node's cross-platform readline API.

## Pending capabilities and limitations

- Real-account ChatGPT login, Anthropic/OpenAI/Zen access and other Go models remain unverified. Live Go glm-5.3-flash text and provider-exposed reasoning were checked on October 2, 2026; this does not establish research judgment or real tool execution.
- Causal estimation/automatic identification, RL, full LLM research evaluation, theory, regression, grouped/temporal sampling and deterministic applicability protocols remain future extensions.
- The model cannot reduce ten seeds. An explicit human-exception mechanism would require separate implementation.
- Hernán/Robins chapter-level recommendations still need specific curation; the current note verifies the website and bibliographic identity.
- Venue coverage is partial and current official instructions must be rechecked before submission.
- Manuscript review uses structured manifests, not arbitrary PDF/prose claim extraction or scientific certification.
- Native file/shell tools now execute with host-user permissions. The scientific runner remains bounded, but arbitrary scripts are not automatically audited. There is no separately signed evidence store or host sandbox. See [integrity](integrity.md).
- Pi 1.0.0's shrinkwrap retains a high-severity brace-expansion advisory pending upstream update. The esbuild override applies; no clean dependency audit is claimed.
- Windows signing, macOS signing/notarization, Linux/Windows ARM packages and scientific Python experiments on Windows/macOS remain pending.

## Manuscript policy 1.2.0

The English editorial policy is bundled with the application and composed into every session's system prompt. SDK tests inspect actual simulated provider requests on Zen/Go tool follow-ups and resume, and after a Go model switch and real compaction. A second project receives the same policy. Installed-runtime smoke checks require both resources to load on each packaged platform. The empirical scaffold introduces table terms before the table and leaves unsupported novelty pending in the abstract, introduction and conclusion.

These checks establish instruction delivery and deterministic scaffold behavior, not universal model compliance. No live manuscript evaluation was performed for this change. At this historical stage, DOI resolution and bibliographic metadata matching were pending. Version 1.5.0 adds deposited-metadata checks; non-DOI identity, semantic citation support, exhaustive searches and rendered figure checks remain pending. [Editorial policy](../resources/manuscript-policy.md), [integration study](research/manuscript-policy-integration.md).

## Local web research 1.3.0

Seven SDK tools provide direct public-source reading, installed Chrome/Chromium/Edge browsing, recorded-link following, public-page search, Crossref paper discovery and persisted source recovery. No search-provider key, new npm dependency or browser download is required. Native PDF text reading is optional and uses the existing `pdftotext` command. Public addresses are checked for initial URLs, redirects and browser traffic; saved sources retain timestamps and consistency hashes.

Eleven web tests exercise real HTTP and local Chrome, JavaScript, link following, native PDF extraction, blocked-search fallback, query filters, text/link pagination, cancellation, size limits, tampering and actual SDK dispatch/resume. Live Linux retrieval checked the official scikit-learn page, an original Crossref DOI record and an exact-title paper query. Public search delivered CAPTCHA and poorly related results on this network; relevance remains a model/human review task. Installed-runtime smoke checks exercise direct reading on every platform and browser rendering when an installed browser is detected.

Semantic bibliographic/claim certification, OCR, screenshots/image interpretation, authenticated browsing and arbitrary form/script actions remain pending. Historical 1.2.0 verification boundaries above describe that earlier version. [Local web details](web.md).

## Native Pi capabilities and conversations 1.4.0

The SDK default resource loader, session runtime and native interactive interface replace the restricted host loader. Read/write/edit/search/list, shell tools, codemode, tool_search, configured MCP, skills/extensions/templates/themes/context, automatic compaction, model retries and steering/follow-up queues are activated. JSONL events and RPC are exposed. Native `/new`, `/resume`, `/chats`, `/name`, `/fork`, `/clone` and `/tree` accompany CLI conversation creation, listing/search, opening, naming, inspection and forks. Project histories are imported without deleting originals; cross-project switches rebind scientific tools and mandatory policy.

Twelve new integration tests exercise actual file/shell actions, codemode, a local MCP server, deferred discovery, resource reloads, legacy import, CLI/native conversation controls, SDK project switches, automatic compaction/retries/queues, JSON and RPC. Native POSIX and simple keyboard tests use real pseudo-terminals. Installed-runtime smoke checks require native file tools, codemode, new/resume and mandatory policy on each package platform. These checks do not establish real-account model research judgment, every third-party extension, remote MCP compatibility or native Windows keyboard behavior. [Pi capabilities](pi-features.md).

## Clipboard correction 1.4.1

Desktop clipboard copying requires Wayland/X11 utilities on Linux. `repi setup --clipboard` prepares per-user helpers through apt without sudo, and `repi clipboard` inspects prerequisites without reading clipboard data. Linux packages now declare `wl-clipboard` and `xclip` dependencies. Native `/copy`, Ctrl+X and mouse selection, exact Unicode/multiline transfer and simple-mode `/copy` have regression coverage. Local real Wayland copy/readback passed and the previous text clipboard was restored. Installed checks verify Linux helper availability; these checks do not certify real desktop clipboard access on Windows/macOS or every terminal. [Clipboard details](clipboard.md).

## Research workflows and presentation 1.5.0

The release adds a visual README, SVG identity/social preview, actual native offline capture, an actual twenty-fit study recording, concise quickstart/workflows, comparison criteria, roadmap and community files. A static documentation site replays retained study output without executing commands in the browser. Captures distinguish illustration, offline interface and actual scientific measurements.

Local tests executed twenty fits on the pinned real Wisconsin dataset and thirty on a numeric CSV plus a frozen custom Python method. They check successful resume without duplicate seeds, recalculated metrics, paper provenance, invalid CSV/seed policies and edited input snapshots. CSV/custom input copies retain SHA-256 hashes; source revision/dirty state accompanies the frozen protocol. No arbitrary custom environment, host sandbox, clinical validation or causal estimator is claimed.

DOI resolution and Crossref/DataCite deposited metadata comparison are exposed through CLI and SDK tools. Tests exercise real HTTP fixtures, field conflicts, initial-name compatibility, ambiguous surnames, missing records, tampered sources and forged manuscript statuses. Live retrieval verified the example Mensh/Kording DOI and all supplied bibliographic fields. Matching metadata does not establish scientific claim support, novelty, corrections or author identity beyond name compatibility.

The evaluator defines twenty synthetic microtasks, defaults to ten independent repetitions, retains protocol/trace/receipt hashes, and independently audits stored grades. Two hundred reference-fixture trials check infrastructure only and are explicitly excluded from model-performance claims. Live exploratory checks and account restrictions are recorded separately in [pilot results](research/benchmark-pilot.md). General research superiority, a controlled same-model harness experiment, blinded scientific evaluation and the full three-product suite remain unmeasured.

`repi doctor` checks connection/experiment/browser/PDF/clipboard prerequisites without model inference or clipboard access. Native installer smoke checks exercise doctor, a fixture trial/audit and real/custom protocol preparation; scientific execution on Windows/macOS remains pending. Pi's latest published SDK version checked during this work is still 1.0.0, so the documented upstream advisory remains unresolved without a vendor patch.

## Controlled research benchmark (unreleased)

Three Pi SDK profiles hold the model, provider, sampling requests and execution budgets constant while separating base instructions, ResearchPi instructions and additional scientific tools. Seven generated tasks grade numerical evidence, seed coverage, leakage, paired uncertainty, causal claims, synthetic source support and an actually executed miniature study. Frozen protocols, private traces, workspace artifacts, independent Python replay and evidence hashes support a recalculating local audit. The visual report separates quality, time, usage and catalog cost.

Six additional tests cover all 210 fixture attempts, tampering, path isolation, actual Bubblewrap Python execution and actual SDK dispatch for all profiles. The complete local project suite passed 87 tests with zero failures and skips. A real OpenCode Go DeepSeek V4.1 Flash pilot completed and audited nine attempts: all three profiles passed all three tasks. Each independently executed and reproduced a two-method, ten-seed miniature study. No quality advantage was observed. An earlier failed preparation attempt is retained and disclosed in the [pilot report](research/research-benchmark-pilot.md).

The full repeated live matrix, validation split, realistic paper replication, sealed external holdouts, scientific expert review and same-model stock-product comparisons remain pending. Scores are generated-task rubric results, not scientific certification or PhD equivalence. Costs are catalog estimates rather than billing verification. Python isolation is currently verified on Linux only. [Benchmark protocol](research-benchmark.md), [Artificial Analysis source review](research/artificial-analysis-benchmark-design.md).

### GLM-5.3 Flash follow-up

The real OpenCode Go GLM-5.3 Flash pilot attempted all 21 planned seven-task/profile cases once under the same budgets. Full passes were Pi 0/7, Pi with research instructions 2/7 and ResearchPi 1/7. Seventeen attempts exhausted the request limit; 119 recorded write-tool content-type errors dominate the diagnosis. No profile completed study reproduction. The local audit inspected all receipts and reports the retained failures as incomplete. This is operational evaluation, not isolated scientific reasoning or proof of a harness advantage. [GLM pilot](research/research-benchmark-glm-pilot.md). GitHub reproducibility checks and all four native-installer jobs passed on the benchmark branch.
