# ResearchPi: next-level assessment

Assessed 2026-10-03 against ResearchPi 1.4.1, commit `0035a3e757d9007dc1b3e58e17059107cba54256`. This is a proposal, not an implementation or benchmark result. Repository files, scientific protocol validation, and public repository metadata were inspected. Existing verification records were reviewed; tests and paid model inference were not rerun for this assessment.

## Product direction

Recommended promise: **Reproducible research, from question to evidence.**

ResearchPi should demonstrate a reliable scientific workflow: define a question, retrieve and attribute sources, specify a study, execute it, inspect the measurements, and produce an evidence-linked artifact. General coding agents can also perform research and accept custom instructions. ResearchPi's proposed advantage must therefore be established through measurable outcomes and reproducible examples.

## Current foundation and gaps

The repository already has MIT licensing, retained Pi notices, contribution/security documents, CI, native installers, and release checks. The README explains authentication and verification boundaries. It currently has badges and a text terminal example, but no product screenshots, logo/banner, recorded walkthrough, or dedicated visual assets. Public repository metadata has no homepage, and Discussions are disabled. No dedicated roadmap, citation file, issue templates, or code of conduct was found.

The audited runner currently accepts synthetic binary classification, logistic SGD and random forest, ten predefined training seeds per configuration, fixed data/split seeds, and sample standard deviation. Native file/shell tools allow other research code, but that execution path does not automatically receive the runner's receipts or audit guarantees. Causal review checks plan completeness rather than establishing identification or executing estimators. The curated library contains six notes; venue coverage and real-account/model checks remain partial. These boundaries are documented in [status](../status.md), [integrity](../integrity.md), and implemented in `src/protocol.ts` and `src/science.ts`.

## Priority 1: make the working product visible

- Add a restrained SVG identity, README banner, and social preview. Use English throughout.
- Capture the actual native interface and actual experimental outputs. A 30–60 second walkthrough should show a question, an executed experiment, aggregation and evidence inspection. Label offline examples as offline and proposed actions as proposed.
- Shorten the README entry path: product promise, real demo, installation, first useful result, three use cases, comparison, documentation and contribution links. Keep compatibility and important boundaries discoverable.
- Add three runnable walkthroughs: a reproducible experiment, literature retrieval with checked references, and an evidence-linked manuscript. State prerequisites, exact commands, expected artifacts and current limitations.
- Add a roadmap, issue forms, a citation file, a code of conduct, and a release-oriented changelog. Consider Discussions for support and research workflow proposals. Publish a small documentation site only after its examples are reproducible.

Acceptance: a new visitor can explain the product and reach a verified result without traversing the full reference manual. Screenshots and recordings must come from actual runs and exclude credentials or private project data.

GitHub recommends that READMEs explain purpose, usefulness, setup and support, with extended documentation elsewhere. Its community profile also considers participation documents. [README guidance](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes), [community profiles](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/about-community-profiles-for-public-repositories). For a social preview, use a solid-background image, ideally 1280×640 and below 1 MB. [Social preview guidance](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/customizing-your-repositorys-social-media-preview).

## Priority 2: generalize the evidence workflow

Build a supported adapter for real datasets and user research code before adding many unrelated research domains. Record dataset versions/checksums, source revision and working-tree changes, environment, commands, declared metrics, seeds, split definitions, failures, retries and artifact links. Keep exploratory and confirmatory runs distinct. Introduce regression and appropriate validation/uncertainty workflows incrementally.

The research contract should live in structured project state. A prompt guides the assistant; execution validators and artifact checks enforce supported invariants. Preserve ten training seeds for stochastic configurations as laboratory policy, with explicit applicability rules for deterministic or other study types. Ten seeds alone do not establish statistical adequacy.

Separate the execution authority and evidence store from unrestricted agent edits if stronger integrity is required. A hash chain accessible to the same user is a consistency check, not adversarial proof.

Acceptance: a real dataset study can be interrupted, resumed and reproduced; reports are regenerated from raw outputs; changed inputs and incomplete configurations cannot silently pass the supported audit.

## Priority 3: strengthen literature and paper support

Implement structured bibliographic verification with per-field results and source evidence: DOI resolution, title/authors/venue/volume/pages, permissible metadata normalization, conflicts, and pending status when evidence is unavailable. Retrieval alone is not complete reference verification. Check publication dates and versions; check retraction/correction notices where authoritative evidence is available. Select references for relevance rather than a journal-specific citation quota.

Expand the curated library through attributed, section-specific notes and domain-specific skills loaded when relevant. Add manuscript checks that link important numerical claims to measured artifacts. Support LaTeX/BibTeX workflows, reproducible figures and rendered inspection incrementally; terminal math rendering is not publication layout validation. Describe material limitations clearly without exaggerating or hiding them.

Acceptance: a deliberately incorrect DOI/title pairing is flagged, an unresolved reference stays pending, a numerical claim identifies its originating run, and rendered figures/tables can be inspected.

## Priority 4: operational reliability

Add a single diagnostics command for model access, credentials presence, experiment environment, browser/PDF prerequisites and clipboard. Separate prerequisite checks from actual successful operations. Broaden live provider coverage with consented, budgeted tests; improve actionable provider errors. Address the documented Pi transitive advisory through a supported upstream update and validation. Investigate signing/notarization and permissions/isolation for routine research execution. Native installer smoke coverage does not establish graphical clipboard or scientific execution on every OS.

## Comparison with Claude Code and Codex

Claude Code already edits files, runs commands, supports reusable skills/project instructions, hooks, MCP, plugins and specialized subagents. [Overview](https://code.claude.com/docs/en/overview), [extension guide](https://code.claude.com/docs/en/features-overview). Codex CLI also supports repository editing/execution, reusable skills/plugins, MCP, saved sessions, review, web context and configurable permissions. [Official Codex CLI documentation](https://learn.chatgpt.com/docs/codex/cli).

Both can be configured for research. A public comparison should distinguish built-in, custom-configured and experimentally verified behavior. Do not describe a capability as absent simply because it is not the product's default research workflow. Do not equate permission prompts with an operating-system sandbox; Claude's documented local sandbox specifically covers shell commands and subprocesses, with other tools controlled separately. [Claude sandbox scope](https://code.claude.com/docs/en/sandboxing).

### Proposed benchmark

Start with 20–30 research tasks and ten independent trials per task/condition, with a pilot and explicit budget before full execution. Agent evaluations measure a model together with its harness; multiple trials and outcome-based grading are appropriate. Resource limits can change outcomes. [Agent evaluation guidance](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents), [infrastructure experiments](https://www.anthropic.com/engineering/infrastructure-noise). The following protocol is a recommendation derived from these sources, not an existing benchmark result.

1. **Harness experiment:** where compatible, compare Pi, Pi with the same research instructions, and ResearchPi using the same model/version and effort. This separates prompt effects from research tools/state/validators.
2. **Product experiment:** compare ResearchPi, Claude Code and Codex using their supported configurations. If models differ, report the result as a product comparison, not a pure harness effect. Include research-configured competitor baselines with equivalent laboratory instructions.
3. Freeze task inputs, dataset/repository versions, source snapshots, environment, tool permissions, network policy, time/token/compute budgets, graders and scoring before confirmation. Publish any unavoidable differences.
4. Include leakage detection, missing/duplicate-seed detection, metrics recalculation, interrupted experiment recovery, incorrect DOI metadata, unsupported causal claims and evidence-backed methods/results writing. Grade actual artifacts and supported conclusions, not fluent prose.
5. Measure completion, numerical/citation accuracy, reproducibility, unsupported claims, recovery, human interventions, duration and observed usage/cost where available. Report failures and uncertainty across tasks/trials. Prefer blinded scientific review for judgments that cannot be mechanically checked.
6. Trial repetitions are not necessarily controllable model RNG seeds. Record supplied seed support, sampling settings and run IDs; use ten training seeds separately when a task requires stochastic training. Do not claim identical model randomness across providers.
7. Publish definitions, graders, versions, traces, artifacts and exclusions. Keep tuning tasks separate from held-out evaluation. Make no superiority claim before running the protocol.

## Suggested delivery order

1. Visual README, recorded workflow, concise quickstart and community files.
2. One real dataset/custom-code execution path with consistent evidence and recovery.
3. Bibliographic verification and artifact-linked manuscript checks.
4. Public pilot benchmark, then a frozen larger evaluation.

Success should be assessed by whether an external researcher can install ResearchPi, complete a real study, reproduce its evidence, and understand what was verified.
