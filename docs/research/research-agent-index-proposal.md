# Research Agent Index: an anchored research leaderboard

Status: scientific design proposal with an experimental implementation of protocol freezing, mechanical development grading, anchored rating and reports. Independent validation and a confirmatory holdout remain pending. Prepared on 2026-10-05. No additional model calls were made for this proposal. The existing DeepSeek/GLM pilot remains unchanged.

## What the index should establish

Publish two distinct comparisons:

1. **Models within ResearchPi:** hold the ResearchPi revision, task inputs, tool access and budget fixed; vary the model and disclose its inference settings. This identifies the best tested model for this task distribution.
2. **Harness improvement within a model:** hold the exact model route and inference settings fixed; compare native ResearchPi, Pi and compatible competing harnesses. This estimates whether ResearchPi adds value. Comparisons between stock products using different models measure the combined product, not the harness alone.

Every leaderboard row identifies a complete configuration: harness revision, model ID, provider, reasoning settings, budget and evaluation version. Do not imply that a public model ID pins undisclosed model weights. Do not claim compatibility with a competing CLI until its native integration actually works.

## A meaningful 0–100 relative headline

The recommended relative headline is **Research Agent Index (RAI)**, a fitted comparative strength rating. Select a strong reference configuration using a separate development/calibration set, then freeze its identity and reference artifacts before opening the final holdout. It is the initial reference champion, not automatically the strongest configuration forever.

For blinded comparisons of scientific deliverables, fit a regularized Bradley–Terry-style model with preregistered tie handling, comparison weights and regularization. Anchor the reference strength at zero. One possible display mapping is:

```text
RAI(configuration) = 100 / (1 + exp(-(strength(configuration) - strength(reference))))
```

Here strength uses the fitted model's natural-log-odds scale. The reference is 50; higher values indicate greater fitted strength against the frozen reference. Finite fitted strengths approach, but never mathematically reach, 100. This is a comparative rating, not percentage task accuracy, percentage research competence, or probability of replacing a PhD. The exact interpretation of pairwise probabilities depends on the declared tie model.

Use a fixed regularization rule to make estimates finite under complete separation; disclose its influence and uncertainty. Never adjust regularization to make a desired contestant win. Display values near an endpoint as `<100` rather than rounding them into a claim of perfection.

Check fitted pairwise predictions on held-out comparisons, inspect preference cycles and domain-specific rank reversals, and report sensitivity to the frozen weights and regularization. A single latent strength may be an inadequate summary of heterogeneous research skills; if fit is poor, keep domain rankings and do not advertise the pooled rating as a calibrated probability.

Do not re-anchor to the current leaderboard leader after every submission. Otherwise unchanged systems get different ratings without doing anything differently. A future reference, difficulty set or scoring change creates a new index version and requires an overlap study; scores from different versions are not directly interchangeable.

**A bounded transform does not fix saturation.** If all configurations produce equivalent valid deliverables, comparisons are ties and the rating contains little discrimination. If one system wins every observed comparison, uncertainty and regularization remain important. Neither case demonstrates an infinite research capability gap. Always publish raw outcomes alongside RAI.

An alternative conventional scientific quality index is a fixed weighted average of criterion scores on 0–100. Its 100 is theoretically attainable on a finite test. Do not promise both that such a percentage has a genuine perfect-score meaning and that perfection is impossible by definition.

## Scientific evidence underneath the rating

Use five domains with initially equal comparison weight. Equal weighting is a proposed governance choice, not an empirical discovery; independent scientific reviewers should ratify or revise it on development data before freezing the final test. Tasks have equal weight within their domain, regardless of the number of rubric items or repeated attempts.

| Domain | Required evidence | Candidate evaluation material |
|---|---|---|
| Reproduction and scientific implementation | Fresh execution, numerical correctness, independent inputs, reproduced paper claims | Pinned CORE-Bench OOD, eligible MLAgentBench tasks, selected full PaperBench replications |
| Experimental design and discovery | Testable question, defensible baselines, controlled comparisons, leakage prevention, informative ablations and justified follow-up experiments | Independently authored ML/AI mini-projects with withheld outcomes |
| Statistical and causal reasoning | Correct sampling unit, uncertainty, identifiability, confounding assumptions, appropriate estimation and sensitivity checks | Authored cases with known data-generating mechanisms and expert-reviewed open-ended cases |
| Literature and evidence | Verified bibliographic identity, original evidence, correct claim-source relationships, contradictory findings and calibrated uncertainty | Frozen source packs and separately controlled browsing tasks |
| Scientific synthesis and paper writing | Findings supported by artifacts, coherent methods, readable figures/tables, honest limitations, novelty scoped to actual evidence | PaperBench rubric material where suitable plus independent blinded scientific review |

The candidate benchmarks do not already cover all five domains. Their official graders and published scores remain unchanged; new comparisons and scientific rubrics are separate local evaluations. A score on an adapted subset must not be presented as an official full-suite score. See the [evaluation v2 proposal](researchpi-evaluation-v2-proposal.md) for eligibility and primary sources.

Comparisons should prioritize task-specific scientific validity over style. Freeze these decision rules with independent reviewers. Invalid causal identification, fabricated evidence, leakage, or an unsupported central experimental claim must fail the affected scientific criterion; formatting cannot compensate for that defect. Appropriate abstention on an unidentifiable question can be correct. Missing requested artifacts count as missing evidence, not as a successful abstention. Use deterministic verifiers wherever possible, and blinded expert assessment with disagreement resolution for scientific arguments. A model judge may assist, but cannot alone certify research validity.

Publish criterion scores, domain summaries, raw official benchmark scores, valid/reproducible completion rates and reviewer agreement. Record autonomous completion and provider/session failures separately from artifact validity, under a prospectively fixed failure policy. Cost, latency, token usage and human interventions remain visible alongside quality; they are not secretly mixed into the headline.

Do not publish a complete RAI when a configuration lacks required domain coverage. Mark incomplete rows as provisional and unranked. No renormalization of missing domains, no imputed perfect outcomes, no score derived from the current three-task pilot.

## Removing the ceiling with valid research work

Use solvable, reference-validated tasks that require more than recovering a numeric answer. Include unfamiliar datasets, full-pipeline replay, distribution shifts, subtle leakage, failed hypotheses, conflicting evidence, ambiguous causal identification and requests whose correct resolution includes bounded uncertainty. Require appropriately justified decisions and artifacts, rather than verbosity or merely mentioning a preferred method.

Maintain a mix of difficulty levels selected on development data. Add long-horizon paper replication and a small extension beyond the supplied result where compute permits. Have independent researchers validate task feasibility, grading and difficulty. Do not create impossible instructions or buggy tests simply to lower scores.

Split task families and paper sources across development, validation and final holdout. ResearchPi may be improved on development feedback; final tasks, expected outcomes and reviewer decisions stay outside model context and tuning. Public benchmark exposure cannot be ruled out, so disclose it and add independently authored holdout tasks. Public release of a final test eventually makes it development material for a later version.

## Fair evidence of harness improvement

- Run a native harness baseline, plus a strong baseline given the same portable research guidance and comparable scientific resources. This separates a useful prompt/library from an improvement in orchestration or tooling. Equal access does not require identical tool APIs; disclose every consequential difference.
- Match resource constraints and model settings. Record consumed resources and native retry behavior; never allow unreported fallback models. Use a common time/compute budget for the primary comparison and report a separate cost-constrained sensitivity analysis when affordable.
- Randomize or counterbalance execution order within task/model blocks. Start with clean conversations and workspaces; keep private graders and reference answers inaccessible. Independently replay submitted artifacts.
- Blind reviewers to model and harness identity, balance presentation order, and publish the judging protocol and reviewer disagreement. Human comparison criteria must assess scientific content, not whether a submission copies ResearchPi's wording.
- Estimate uncertainty by resampling independent task families, retaining all conditions and repeated attempts within each sampled block. Preserve within-task pairing. For a fitted rating, refit inside bootstrap samples. With very few task families, label intervals and ranking as exploratory.
- Predeclare the strongest-baseline comparison, minimum meaningful effect, failure policy and analysis. Use multiplicity-aware inference for claims of beating every baseline. If uncertainty includes negligible or negative improvement, report an inconclusive comparison rather than a decisive winner.

Report harness lift first in interpretable units: paired differences in independently valid/reproducible completion and scientific rubric scores. A rating difference is secondary evidence; it is not a causal proof by itself.

## Seeds, attempts and sample size

Ten experimental training seeds are the lab policy when that experiment is appropriate; keep data/split randomness separate and use the correct independent sampling unit. Ten training seeds are not ten independent research tasks, nor ten agent conversations.

Use fresh agent sessions to measure stochastic execution reliability. Three sessions per condition can support a feasibility/calibration phase; ten can be planned for a confirmatory study, but the final task count and repeat count must follow variance and power estimates rather than a universal rule. More independent, diverse research tasks can be more informative than repeatedly solving the same easy task. Paired trials share task inputs and evaluation blocks; identical nominal random seeds do not guarantee identical sampling across provider APIs.

## What a public claim can say

Defensible template, with placeholders only:

> On Research Agent Index v1's frozen ML/AI/CS holdout, ResearchPi improved independently verified research outcomes by X points against baseline Y using model Z under equal declared budgets (95% interval [L, U]). All scored attempts and adaptations are disclosed.

To claim superiority over every tested harness, the preregistered comparisons must support that conclusion for each baseline. Generalizing beyond one model requires evidence across multiple model families. To claim PhD-level task performance, add an independently recruited and compensated researcher baseline with comparable task instructions, resource accounting and blinded grading. Even then, conclusions apply to the tested work and constraints, not to replacing a PhD's full role or proving open-ended originality.

## Implementation sequence and present status

1. Freeze the scientific domain rubrics, task families, validity rules and judging process with independent researchers.
2. Extend the existing native evaluation runner and add verified compatible harness adapters; validate graders against both correct and incorrect reference artifacts without model calls.
3. Run a development calibration study, select and freeze the reference, and preregister the confirmatory task list, budgets, repeats and analysis.
4. Execute the untouched holdout, independent replays and blinded grading. Fit the rating only after complete required coverage; generate both model and harness views with uncertainty and provenance.
5. Tune ResearchPi using development evidence and evaluate the next frozen version on a new or still untouched holdout.

At present, DeepSeek V4.1 Flash and GLM 5.3 Flash each produced correct local completion artifacts on the three-task native CPU pilot, with one attempt per task. GLM also had a late provider/session failure after producing a valid artifact. That pilot is a feasibility check with a saturated binary endpoint, not enough evidence to select a research champion, validate this index, or claim harness superiority. See the [retained report](deepseek-vs-glm-official-pilot.md).

## Artificial Analysis precedent

Artificial Analysis's current Coding Agent Index averages benchmark success rates; its Intelligence Index combines fixed category weights and some frozen, anchored Elo components. Neither methodology makes the current leader automatically score 100. This proposal adopts explicit conditions, component disclosure and stable references; the proposed RAI logistic display is a local design, not Artificial Analysis's published formula. See the [source review](research-index-methodology-sources.md), [intelligence methodology](https://artificialanalysis.ai/methodology/intelligence-benchmarking), and [coding-agent methodology](https://artificialanalysis.ai/methodology/coding-agents-benchmarking).

## Implementation note

The `repi bench index` commands now implement the frozen protocol, input/receipt hashes, domain/family-balanced mechanical grading, regularized comparative rating, bootstrap eligibility gate and HTML/JSON reports. Development rows use `developmentRating`; final `rai` remains null. The native calibration pack is explicitly public and does not implement independent expert review or a sealed test. Reference 50 is prespecified for this development run rather than selected as an established champion. New pairwise evidence can legitimately revise fitted strengths; retain leaderboard revision history rather than silently changing previous exports. See [commands](../../scripts/research-index/README.md).

The first five-domain development run has now been executed: ten attempts, with one GLM provider/transport failure. A uniform post-run amendment removed an ambiguous bootstrap/initialization seed criterion; originals remain retained. The development ratings tie at 50; different mechanical quality means are not a validated research ranking. See the [development report](research-agent-index-development.html).
