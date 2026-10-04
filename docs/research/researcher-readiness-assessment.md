# ResearchPi: readiness for autonomous research

Assessment date: 2026-10-04. Inspected working revision: `4edace2` (Pi SDK 1.0.2; ResearchPi package version 1.5.0, SDK updater not yet released). This assessment reads source, protocols and existing verification records; it does not rerun scientific experiments or measure a new model. The previous update verification reports 81 passing local tests. All five PR #12 checks were observed passing during this assessment. Software checks do not establish scientific competence.

## Judgment

ResearchPi currently provides useful infrastructure for a research assistant, with a stronger evidence workflow for its supported classification runner. The inspected evidence does not establish autonomous PhD-equivalent research ability. A defensible nearer-term objective is a specialized research collaborator that reproduces papers, designs bounded extensions, executes auditable experiments and produces source-grounded reports under progressively reduced supervision.

This is an engineering recommendation, not a prediction of when a model will replace a researcher. Novelty, useful question selection, causal assumptions, mathematical correctness and interpretation remain distinct from code execution and fluent writing.

## Evidence from the current implementation

| Area | Observed support | Remaining scientific gap |
| --- | --- | --- |
| Agent infrastructure | Pi native tools, sessions, resource loading, persistent state, web and update checks | No tested long-horizon research controller with artifact acceptance criteria and global compute/token budgets |
| Experiments | Frozen real/CSV/custom Python classification, predictions, ten distinct training seeds, hashes and receipts | Audited schema only supports binary classification, stratified holdout, accuracy/log loss, fixed-data/split training SD and CPU execution |
| Literature | Public-source retrieval, six attributed notes, lexical retrieval and DOI metadata checks | No demonstrated systematic full-text synthesis, passage-level claim support, contradiction map or novelty assessment |
| Causality | Required-field checks, explicit non-identifiability states | No executed identification algorithm, estimators or sensitivity analysis; declared identification is not independently proved |
| Writing | Scientific policies, editorial profiles, measured-result scaffolds and claim manifests | No general manuscript semantic review or complete reproducible LaTeX/figure/layout pipeline |
| Comparative evaluation | Twenty synthetic microtasks and one audited exploratory numerical-task condition | No held-out end-to-end research evaluation, matched-model ablation or blinded expert review |
| Execution authority | Runner receipts, recomputed metrics and host credential filtering for scientific workers | Arbitrary shell/custom code runs with user permissions; no independent evidence authority or OS isolation |

Implementation evidence: [protocol schema](../../src/protocol.ts), [worker](../../python/experiment.py), [scientific checks](../../src/science.ts), [system policy](../../resources/system.md), [literature retrieval](../../src/web-tools.ts), [integrity boundaries](../integrity.md), [pilot](benchmark-pilot.md), [verification status](../status.md).

The audited pilot reports ResearchPi/Go/observed GLM-5.3-Flash passing 8/10 attempts on one supplied-label accuracy task, versus 10/10 for Codex with a different requested model. This is exploratory, configuration-specific evidence, not a product ranking. It motivates deterministic numerical tools and model selection measured on the same task suite. It does not establish that any current model would produce the same outcome.

## Proposed priorities and acceptance criteria

### 1. Make scientific decisions explicit and calculations executable

Add structured records for research questions, hypotheses, relevant literature, assumptions, decision rationales, counterexamples, experiment plans and claim-to-evidence links. Distinguish proposal, execution, mechanical audit and scientific review states. A claim must not become verified merely because the agent wrote that word.

Compute statistics from retained data through typed tools. Build unit-of-analysis and uncertainty selection into protocols; preserve the ten-training-seed laboratory policy without applying it blindly to deterministic proofs or confusing it with ten independent samples. Add independent tests for deliberately wrong interpretations, leakage and contradictory evidence.

Acceptance: a false numerical claim or missing evidence blocks a supported conclusion; restarting or compacting cannot erase unresolved objections or silently change a confirmatory protocol.

### 2. Generalize auditable execution before expanding every research domain

Define a versioned experiment adapter contract recording datasets/sampling units, split manifests, dependency/environment manifests, commands, source hashes, RNG sources, metrics, failures and artifacts. Add regression and multiclass workflows first; then grouped/temporal splits and nested selection. Extend to PyTorch/GPU and LLM evaluation only with domain-specific protocols and actual test coverage.

Use validation data for selection, reserve test data for confirmation, preserve negative results and distinguish exploratory from confirmatory runs. Add effect sizes, justified paired comparisons, appropriate intervals and multiplicity policies rather than generic significance tests.

Acceptance: a second environment reproduces a submitted experiment without relying on chat state; changed dependencies/data and leaked selection are detected; an interrupted run resumes with retained failures and no duplicated successful attempts.

Multiple sources of variation can affect ML comparisons, including sampling, initialization and hyperparameter selection. Ten initialization seeds alone are therefore not a complete uncertainty design. [Bouthillier et al., Accounting for Variance in Machine Learning Benchmarks](https://arxiv.org/abs/2103.03098).

### 3. Build a local, source-grounded research memory

Maintain a local searchable library with full-text/version metadata, page or section anchors, exact supporting passages, methods, datasets, limitations and relationships between claims. Start with native local storage and full-text indexing; embeddings may supplement retrieval, but do not themselves verify support. Preserve source provenance and keep retrieved content separate from executable instructions.

Support backwards/forwards citation discovery, competing explanations, negative evidence and authoritative correction/retraction notices. Separate bibliographic identity from source-to-claim support. Relevance should govern citations; venue-specific citation quotas do not establish scholarship.

Acceptance: for an unfamiliar paper, an important claim links to the inspected source passage; unsupported claims and contradictory results remain visible; an unavailable full text is not represented as read.

### 4. Add a bounded research loop with independent review

Use a durable task graph: scope question → retrieve/read → identify competing hypotheses → specify discriminating experiments → execute/debug → inspect robustness → revise claims → draft → independent review. Track dependencies, acceptance criteria, checkpoints, budgets and reasons to stop. Resuming a job should be an execution operation rather than a request to reconstruct a plan from conversation.

Specialized roles can help when they have distinct deliverables: literature evidence, experimental code, statistical review and adversarial scientific review. Additional personas alone do not provide independence; reviewers need raw evidence and methods for challenging the author. Test whether role separation improves outcomes relative to one equally resourced agent.

Add per-run environment isolation, resource limits and a separate evidence authority before granting unattended long-running arbitrary code execution. Local hashes remain consistency checks when the same actor can rewrite all records.

Acceptance: a reviewer rejects a plausible but unsupported conclusion; spending/time limits stop work reliably; a crash resumes from durable state; changing the research goal or interpreting contradictory evidence requires an explicit recorded decision.

### 5. Evaluate research outcomes, then improve writing and domain breadth

Begin with a narrow ML area, for example reproducible tabular predictive modeling. Build held-out tasks including paper replication, realistic data leakage, a strong baseline, an informative ablation, literature contradictions and evidence-backed reporting. Freeze grading before evaluation. Publish successes, failures, interventions and configuration details.

Compare the same model under plain Pi, Pi plus research instructions, and ResearchPi where compatible. Separately compare products with matched budgets and disclose unmatched models/tool access. Calibrate automated judges against blinded expert judgments. Fresh agent trials are not controllable training seeds.

PaperBench's full protocol separates agent code production, execution in a fresh GPU environment, and grading against paper-specific rubrics. This is a useful evaluation pattern; it should not be replaced by merely checking whether generated code appears complete. [Official PaperBench repository](https://github.com/openai/frontier-evals/blob/main/project/paperbench/README.md).

After reliable execution and review, add complete LaTeX/BibTeX projects, data-generated plots/tables, rendered publication checks and evidence-linked reviewer response workflows. For causal work, implement identification and compatible estimation/sensitivity under explicit assumptions; avoid advertising general causal validity.

## Proposed next milestone

Deliver one complete paper-replication workflow in a chosen subfield: ingest an unfamiliar paper, extract a source-grounded specification, implement its baseline, freeze an experiment, execute ten training seeds where applicable, diagnose discrepancies, run a prespecified ablation, reproduce outputs in a fresh environment and write a bounded report. Use several held-out papers selected with an external researcher, rather than one developer-tuned example.

Measure rubric completion, statistical/numerical errors, citation support, reproducibility, human interventions, runtime/usage and retained failure recovery. Original research competence needs an additional blinded novelty/usefulness assessment; successful replication alone does not prove it.

The associated [primary-source review](autonomous-research-sources.md) distinguishes executed reproduction, code-only benchmarks, selected workshop outcomes and autonomous discovery claims. No PhD-substitution claim is supported by ResearchPi's existing evidence.
