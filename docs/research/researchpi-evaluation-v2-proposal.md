# ResearchPi evaluation v2: research outcomes over format compliance

Proposal prepared October 5, 2026. This is a design recommendation, not a completed evaluation or a superiority claim. The existing seven generated tasks remain regression/smoke tests. Their near-ceiling results and output-contract defects do not substantiate ResearchPi's research value.

## Recommended first experiment

Use native CLI harnesses inside isolated, equivalent environments. Do not rank products using the current restricted SDK profiles: they disable native capabilities and only test component ablations.

Start with a version-pinned, domain- and compute-eligible subset of **MLAgentBench** and the current **CORE-Bench Extended/OOD** release. MLAgentBench supplies end-to-end ML experimentation environments; the CORE release supplies actual paper-code reproduction capsules. Add verified ScienceAgentBench when analysis/figure coverage is needed; its corrected evaluation artifacts were released in April 2026. Select 12 diverse feasible tasks before comparing agents, with three fresh sessions per task/condition for an exploratory pilot. This selection is a proposed local subset, not either benchmark's official full score. Feasibility, dependency availability and grading must be checked first; no assertion that every task runs on CPU is made. [MLAgentBench](https://github.com/snap-stanford/MLAgentBench), [CORE current release pointers](https://github.com/nnadgi01/corebench-analysis), [verified ScienceAgentBench](https://github.com/OSU-NLP-Group/ScienceAgentBench).

Keep **PaperBench** as the decisive paper-replication stage: two or three preregistered feasible papers initially, then broader coverage if results warrant it. Its paper-specific rubrics and separate code reproduction align closely with ResearchPi's purpose. Full reproduction can need GPUs and substantial agent/judge resources. Code-Dev is useful for inexpensive integration checks but cannot prove experimental reproduction. Reduced time or a paper subset must be labeled as a local adaptation, never compared directly with published full-budget scores. [PaperBench implementation](https://github.com/openai/frontier-evals/tree/main/project/paperbench).

A corrected **CORE-Bench v1.1** suite is useful for reproducibility/reliability; its authors' **OOD/Extended** tasks are preferable when seeking generalization beyond the solved legacy set. Use only after pinning the intended computational-reproducibility benchmark and verifying eligibility; another unrelated benchmark shares the CORE-Bench name. [Authors' saturation study](https://arxiv.org/abs/2606.26158), [released analysis and dataset pointers](https://github.com/nnadgi01/corebench-analysis).

## What to borrow from Artificial Analysis

Use scientific/ML **Terminal-Bench** tasks as an operational control, not the primary research measure. Artificial Analysis currently evaluates end-to-end coding agents on a three-benchmark index and reports individual evaluation results and efficiency. Its SciCode evaluation measures scientific Python subproblem coding, which can calibrate numerical implementation but does not capture a complete research project. [Agent methodology](https://artificialanalysis.ai/methodology/coding-agents-benchmarking), [intelligence methodology](https://artificialanalysis.ai/methodology/intelligence-benchmarking).

Do not equate lower scores with better difficulty. The SciCode-Verified authors document faulty specifications/graders and much stronger performance after correction. Pin and inspect evaluator validity before paying for a large run; use development-only checks to remove defects, not to select tasks where ResearchPi wins. [Audit study](https://arxiv.org/abs/2608.04975).

**Harbor** is a sensible execution layer to investigate because its project contains installed-agent adapters for Claude Code, Codex and OpenCode and supports custom agents. ResearchPi would need a native CLI adapter; this integration has not been built or tested here. It must export artifacts/traces without altering the agents' internal tools to match ResearchPi. [Harbor agent instructions](https://github.com/harbor-framework/harbor/blob/main/AGENTS.md), [OpenCode adapter](https://github.com/harbor-framework/harbor/blob/main/src/harbor/agents/installed/opencode.py).

## Fair comparison matrix

Two separate tracks answer different questions:

1. **Same-model harness effect.** Match exact backend/model snapshot, endpoint, requested reasoning, resource envelope and initial task materials where supported. A practical first family is ResearchPi/native Pi/OpenCode with the existing DeepSeek/GLM provider. A Claude family can compare ResearchPi/OpenCode/Claude Code; an OpenAI-model family can compare ResearchPi/OpenCode/Codex. Each cell requires actual connection and tool/streaming verification; none is assumed available from a model name alone.
2. **Complete-product utility.** Each product runs its normal supported configuration under a comparable time/compute/spend envelope. Label this model-plus-harness comparison. It cannot isolate harness effects when models differ.

Codex documents Responses as its current custom-provider wire protocol; Claude Code's gateway guide specifies Anthropic/provider formats and capability handling. A four-way DeepSeek comparison through format translation is an experimental gateway condition, not automatically equivalent to native execution. Record and validate translation, background models, retries, cache and usage accounting. Subscriptions do not make observed cost zero. [Codex configuration](https://learn.chatgpt.com/docs/config-file/config-reference), [Claude Code gateway protocol](https://code.claude.com/docs/en/llm-gateway-protocol), [OpenCode providers](https://opencode.ai/v2/docs/providers).

To test whether ResearchPi is more than portable instructions, include a strengthened baseline: another harness with the same research/editorial guidance supplied as its native context/skill files. Do not distribute grader answers. Compare defaults, strengthened baselines and full ResearchPi separately. If this strengthened baseline eliminates the gain, the useful result may be a portable research skill rather than a unique runtime advantage.

## Outcomes that matter

Report official benchmark success/quality scores unchanged and separately from any new research-rigor rubric. Do not create a favorable weighted headline after seeing results.

For the additional research track, preregister:

- Measured results reproduced in a clean environment; predicted test performance independently graded on an inaccessible split.
- Valid preprocessing/sampling/model selection, including patient/group/time structure where applicable.
- Uncertainty appropriate to the claim; training randomness is not population uncertainty. Seed requirements are task-specific, not universally imposed on official coding benchmarks.
- Claims supported by measured artifacts and actual cited passages; distinguish failed/negative experiments from unsupported positive conclusions.
- Recovery from an interrupted session without lost/duplicated observations, when that perturbation is part of a separately defined track.
- Time, model usage/cost and required human corrections per valid completed task.

A proposed primary endpoint is **scientifically valid, independently reproducible completion within budget**, with a separate continuous official task score. Numerical verifiers should be calibrated against reference artifacts with explicit types/tolerances. Narrative/causal/citation assessment needs blinded independent reviewers and disagreement resolution; an LLM judge alone should not certify scientific validity.

Published tasks are not a sealed holdout. Add a separately authored, prospectively frozen set of realistic ML/AI projects covering leakage, negative results, causal limits and evidence-backed writing. Have reviewers design/grade it independently of ResearchPi tuning; all agents receive the same brief, data and scientific obligations. This custom track must be identified as new rather than an official benchmark. It complements existing benchmarks because successful predictive optimization alone does not establish rigorous science.

## Avoid another misleading ceiling

Run a small infrastructure pilot, then freeze versions/tasks/conditions and a validation set. Expand distinct tasks before buying many repeats of trivial templates. Use an a priori power analysis based on development variance for any claimed superiority; three repeats are a starting point for exploration, not guaranteed statistical sufficiency.

Pair conditions within task/model blocks, rotate or randomize execution order across harnesses and models, and report task-cluster uncertainty for paired differences with repeated sessions nested within tasks. Bootstrap agent sessions are not training seeds. Preserve every failure and predeclare handling of provider outages; never replace only unfavorable attempts. Audit reference-code/test access and keep verifier credentials, hidden tests and expected outputs outside agent workspaces.

If scores saturate, compare validity-preserving efficiency, reliability and human intervention rather than deliberately breaking specifications or selecting only difficult failures. Require a repeatable benefit against the strongest compatible baseline on multiple tasks/models, or report that the difference is inconclusive. Do not optimize ResearchPi to disclosed validation answers.

## Implementation order

1. Fix/document the existing smoke-test contracts in a new version; retain old protocols.
2. Add native CLI/container adapters and provider compatibility checks.
3. Verify benchmark licenses/data access and reference grading, then freeze the 12-task exploratory subset.
4. Run matched-model comparisons and inspect failure mechanisms; scale only with an explicit resource budget.
5. Freeze independent validation, add PaperBench reproductions and blinded rigor review, and report both positive and null results.

No external benchmark, new gateway or paid agent run was launched for this recommendation.
