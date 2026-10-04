# Controlled research workflow benchmark

The `repi bench research` track measures submitted artifacts and small executed research workflows. It complements the original twenty JSON microtasks; it does not certify scientific expertise, novelty or PhD equivalence.

The [exploratory DeepSeek pilot](research/research-benchmark-pilot.md) records actual results and the retained failed preparation attempt.

The [GLM-5.3 Flash full-task pilot](research/research-benchmark-glm-pilot.md) records 21 attempts and the dominant tool-schema failure.

## Same-model conditions

| Profile | Instructions | Tools |
| --- | --- | --- |
| `pi` | Pi SDK base system prompt | Shared bounded workspace read/write and isolated Python, when available |
| `pi-research` | ResearchPi research/editorial/web instructions | Exactly the same shared tools |
| `repi` | The same ResearchPi instructions | Shared tools plus selected read-only research protocols/library/causal-review tools and deterministic numerical tools |

These are **controlled SDK profiles**, not untouched product CLIs. Native shell, external extensions, user/project instructions, skills, MCP and unrestricted network tools are disabled. ResearchPi's normal unrestricted tools remain available outside this benchmark. The same provider/model route, requested temperature/effort and limits are used in all conditions. Effective model, endpoint, effort, tool names and system prompt hashes are retained per trial. SDK model identity does not independently attest a backend checkpoint.

Use the paired conditions to distinguish research instructions from the additional research tools. A separate product comparison with Claude Code/Codex remains in the original microtask adapter. Their adapters do not support a controlled DeepSeek comparison; passing a model label would not make it one.

## Tasks and scoring

Seven generated synthetic tasks cover:

1. Recalculating accuracy/log loss from predictions and detecting a false report.
2. Detecting incomplete and duplicate ten-seed coverage.
3. Diagnosing subject, preprocessing, temporal-feature and test-selection leakage.
4. Computing paired differences and correctly bounding training-seed uncertainty.
5. Rejecting an unjustified observational causal claim.
6. Synthesizing three explicitly synthetic passages with verifiable supporting quotations.
7. Implementing and executing a miniature threshold-classifier study with two methods and ten seeds; reexecuting `analysis.py` independently in a fresh sandbox.

Every task requires `answer.json`; a chat response or promise does not count as a submitted artifact. The grader checks prescribed fields, numerical agreement, passage grounding and, for replication, actual execution and independently reproduced outputs. Baseline repetition in the miniature deterministic method tests coverage, not a claim that deterministic science requires ten seeds.

Each category contributes equally to the quality score. Full task passes, completed attempts and category scores are also reported. Every planned failure or missing attempt contributes zero; unavailable telemetry remains null. Generated tasks are narrow and rubric checks do not grade arbitrary scientific prose, real literature synthesis, mathematical proofs or novel hypotheses.

## Development and validation

`--split dev` is for debugging and improving the harness. `--split validation` uses a separately generated variant. Public generators and repeated templates mean this is **not a sealed external holdout**. Freeze conditions and grading before validation, retain all attempts, and never choose prompts or weights to improve a validation result. Human-curated held-out paper studies and blinded scientific review remain future work.

Model IDs accept a comma-separated matrix. Within each task/repeat/model block, harness order rotates deterministically to reduce fixed ordering effects. This does not eliminate cache, provider load or temporal effects. Repetitions are independent agent sessions, not controllable model RNG seeds. Ten actual training seeds belong to the study task separately.

```sh
# Inspect task descriptions without exposing stored answers
repi bench research tasks

# Test all seven graders: 3 profiles × 7 tasks × 10 fixture trials
repi --project ./bench-fixture bench research run --fixture

# Small exploratory same-model pilot, using existing credentials
repi --project ./bench-deepseek bench research run \
  --provider opencode-go --models deepseek-v4.1-flash \
  --harnesses pi,pi-research,repi \
  --tasks metrics-audit,source-synthesis,replicate-study \
  --trials 1 --timeout 150 --max-requests 10 \
  --max-output-tokens 4096 --max-reported-tokens 120000

# Repeated full development suite; consumes real model/account usage
repi --project ./bench-development bench research run \
  --provider opencode-go --models deepseek-v4.1-flash \
  --split dev --trials 10

# Audit a retained run
repi --project ./bench-deepseek bench research audit <run-id>
```

The default uses the configured provider/model, all three profiles, all seven tasks and ten attempts per condition: **210 planned attempts**, with potentially multiple requests each. Start with the explicit small pilot. A fixture fills stored expected answers and is clearly excluded from model performance; it does not execute a live model or prove actual study execution.

## Isolation and budgets

Shared Python execution requires a working Linux Bubblewrap installation and `/usr/bin/python3`. On Ubuntu/Debian, install `bubblewrap` if missing. Executed replication fails preflight when isolation is unavailable; it never falls back to unrestricted host execution. Other tasks can run without Python, with that tool difference recorded.

The sandbox has no network or host home/evaluator/credential mounts. It reads the task workspace, has writable `/tmp`, uses installed Python's standard library, and has CPU/address-space/file/output/process limits plus a wall deadline. Scripts print results; the agent uses `write_file` to submit `answer.json`. There is no universal guarantee against OS/kernel compromise. Workspace tools reject traversal/symlinks and preserve supplied input files.

Every agent attempt has a process deadline, a maximum number of model stream invocations and a requested per-response output-token limit. Automatic session retries/compaction are disabled. A reported-token threshold is checked between requests and can be exceeded by one in-flight response; it is not a hard total-token or dollar cap. Provider adapters may have internal retry behavior. Runtime checks cannot certify provider adherence to every requested sampling parameter.

Provider/session or reported-model failures stop the run, retaining missing planned attempts. A request/token limit or task timeout is retained as a failed attempt and later planned conditions continue. Trials do not automatically retry. Ctrl+C aborts ongoing work.

## Reports and Artificial Analysis ideas

The run directory is `.research-pi/research-benchmarks/<run-id>/`. It contains a frozen protocol/schedule, per-case requests, private SDK events/metadata/receipts, workspace artifacts, reproduction outputs, a recalculated summary and an offline `report.html`.

The report separates rubric quality, complete-task passes, wall time, reported tokens, estimated task cost and category failures. It includes a quality-versus-time plot and paired same-model uplift. A descriptive task-cluster percentile-bootstrap interval is shown only with at least three task clusters, at least two repeats and complete compared conditions. The interval is conditional on this synthetic suite and is not evidence of universal superiority. Pilot intervals remain unavailable.

Timing distinguishes task wall time, first observed SDK streaming delta and first answer-text delta. Approximate output throughput uses reported native output tokens over the observed delta span. These are not provider-attested TTFT, normalized cross-tokenizer throughput or direct reproductions of Artificial Analysis performance numbers.

Costs use SDK catalog pricing, including exposed cache/output usage. They are estimates rather than independently verified invoices or OpenCode subscription charges. Missing or zero-price telemetry stays unavailable. Raw traces can contain private reasoning and are never automatically published.

Design inspirations: [fixed-model component swaps](https://artificialanalysis.ai/methodology/search-api), [agent variant reporting](https://artificialanalysis.ai/methodology/coding-agents-benchmarking), [separate latency/throughput measures](https://artificialanalysis.ai/methodology/performance-benchmarking). The [source review](research/artificial-analysis-benchmark-design.md) separates observed Artificial Analysis practices from our adaptations. ResearchPi's scores use its own transparent rubric, not the Artificial Analysis Intelligence Index.

## Improving ResearchPi

Retain a baseline, categorize development failures, make general improvements to tools/instructions, rerun the same-model development matrix and then freeze a separate validation condition. Keep failed attempts and changes visible. A win must arise from better evidence/artifacts under common budgets; do not remove difficult tasks, change weights after results, expose answers to the agent or select only favorable runs.

Before claiming broader superiority, add external unseen datasets/papers, realistic interrupted studies, correction/retraction cases, reviewer-calibrated citation semantics, same-model comparisons against additional compatible harnesses and blinded scientific review.
