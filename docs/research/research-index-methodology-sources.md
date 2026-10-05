# Research index methodology: primary-source findings

Reviewed: 2026-10-05. This is a design note, not a new evaluation result. No model calls, scores, graders, or existing reports were changed for this note.

## What Artificial Analysis actually does

**Intelligence Index v4.3.2** combines ten evaluations with fixed category weights: Agents 30%, Coding 20%, Scientific Reasoning 20%, General 30%. Individual weights are AA-Briefcase 15%, GDPval-AA 10%, AutomationBench-AA 5%, Terminal-Bench 10%, SciCode 10%, AA-Omniscience 15%, GDP.pdf 10%, AA-LCR 5%, HLE 10%, CritPt 10%. AA-Omniscience separates accuracy and non-hallucination contributions. Two pairwise components use frozen Elo ratings transformed by `clamp((Elo - 500) / 2000)` into the index. Their anchors are GPT-5.5 medium at 1000 for AA-Briefcase and DeepSeek V4.1 Flash max at 1600 for GDPval-AA. These are fixed reference anchors, not the current leaderboard winner. AA may revise calibration parameters as capability progresses. The documentation does not require that the leading model score 100 or that 100 be impossible. [Official methodology, index table and integration sections](https://artificialanalysis.ai/methodology/intelligence-benchmarking).

**Coding Agent Index v1.5** is the equal-weight average of DeepSWE v1.1, Terminal-Bench 4.0, and SWE-Atlas-QnA. The suite has 303 tasks, each with three attempts. It averages attempts within a task, tasks within a benchmark, then the three benchmark scores. Rows identify agent variants including behavioral settings. Efficiency metrics are reported separately. Its documentation describes harder updated tasks and removal of saturated/problematic tasks, rather than compressing every perfect score below 100. A pass@1 index of this form can theoretically reach 100. [Official agent methodology, index components and scoring sections](https://artificialanalysis.ai/methodology/coding-agents-benchmarking).

## The scale requirements are different design choices

The following are mathematical observations, not Artificial Analysis claims:

- A leader-relative ratio `100 * S / max(S)` gives the leader exactly 100 whenever the denominator is positive. It cannot simultaneously make 100 impossible.
- A fixed-reference mapping can leave today's leader below 100 without changing every older score whenever a new model enters. An achievable ideal score remains possible in a finite perfectly solved suite.
- A sigmoid of finite latent strength approaches 100 without attaining it mathematically. It is a rating transformation, not the percentage of research problems solved. It does not create information when all agents solve all tasks; fitted strengths can also be poorly identified when there are no separating outcomes. Display rounding can still print 100.
- Setting the leader to 80 or 99 is a display convention. It does not fix ceiling effects or supply evidence of superiority.

Recommended presentation: one fixed-version absolute Research Index, plus a separate gap to the current leader and an optional explicitly labeled relative rating. Preserve raw domain scores and confidence intervals. A relative rating against a frozen reference could be defensible if its interpretation is explicitly a modeled pairwise preference probability, subject to judge calibration and sufficient comparisons. It should not be advertised as percent PhD capability.

## Optional anchored pairwise rating

Chen et al. give the Bradley-Terry relationship `P(i preferred to j) = sigmoid(s_i - s_j)`, explain its translation invariance, and discuss regularization when the comparison graph does not admit a finite maximum-likelihood solution. Their Crowd-BT extension accounts for annotator quality. [Original author/publisher-hosted paper, Sections 3 and 3.2](https://www.microsoft.com/en-us/research/wp-content/uploads/2013/02/wsdm2013-preference-chen-et-al.pdf).

A ResearchPi design could therefore report `100 * sigmoid(s_i - s_reference)` against a frozen launch reference, with the reference at 50. This formula is a proposed use of the model, not an AA index formula. An unscaled fitted natural-log-strength difference already determines the preference probability; inserting an arbitrary extra slope would change that interpretation. Document and validate any regularization or prior before testing. For finite fitted strengths the mathematical score lies strictly between 0 and 100; floating-point arithmetic and formatting need separate handling. Anchor identity, preserved reference submissions, benchmark version, and comparison protocol must remain fixed. Calibration should be checked on held-out pairs. Handle ties explicitly with a preregistered rule or tie-aware model, and assess whether one strength ordering adequately captures performance across research domains.

This rating can satisfy a finite sub-100 scale and a relative reference interpretation. It does not satisfy “the current leader equals 100,” and it cannot make indistinguishable saturated results informative. Reporting a rating of 70 would mean a modeled 70% pairwise preference probability against the specified reference under this protocol, not 70% scientific correctness.

## Statistical and calibration support

METR reports a three-level hierarchical bootstrap over task families, tasks, and attempts for its autonomous capability evaluation. Its RE-Bench aggregation uses reference-solution normalized scores and explicitly differs from ordinary first-attempt scoring: longer budgets can combine shorter runs with a best-of selection. This supports documenting the sampling hierarchy, reference points, and retry/selection policy rather than pooling every run as independent. [METR's evaluation methodology](https://metr.org/evaluations/claude-3-7-report/).

Agarwal et al. show that aggregate point estimates with few runs can yield misleading benchmark conclusions, and recommend interval estimates, performance profiles, and robust aggregate statistics. The work concerns reinforcement learning; applying its lesson to agent benchmarks is an inference, not an established guarantee for every agent task distribution. [Original paper](https://arxiv.org/abs/2108.13264).

The OECD/JRC composite-indicator handbook treats weights as value judgments, warns that equal item weighting can inadvertently favor domains containing more items, and calls for uncertainty and sensitivity analyses over normalization, weights, and aggregation. Its original application is country indicators; its principles inform this proposed benchmark design by analogy. [Handbook, weighting and sensitivity chapters](https://www.oecd.org/content/dam/oecd/en/publications/reports/2008/08/handbook-on-constructing-composite-indicators-methodology-and-user-guide_g1gh9301/9789264043466-en.pdf).

METR recommends validating tasks with an independent human using comparable resources and checking grader responses to incorrect, partial, and good solutions. Difficulty should reflect valid work, rather than missing files, impossible instructions, or grader loopholes. [Task quality assurance guidance](https://taskdev.metr.org/quality-assurance/).

## Proposed evidence standard for ResearchPi

These are proposed design decisions, not results established by the cited sources:

1. Freeze the task set, domain weights, budgets, validity gates, error policy, and primary endpoint before evaluating the held-out set. Use a separate development set for harness tuning.
2. Rank models while fixing ResearchPi and the evaluation conditions. Label rows with model, provider, reasoning setting, harness commit, and benchmark version.
3. Estimate harness contribution with the same backend model and comparable conditions across ResearchPi and competing compatible harnesses. Comparing their default models instead evaluates complete products and cannot isolate the harness effect.
4. Include a portable-policy baseline: give competing harnesses equivalent scientific instructions. Report whether improvement survives this control.
5. Publish paired score differences with task-family-aware uncertainty. Preserve the task pairing when resampling; account for repeated attempts within tasks. Select trial counts by desired precision and plausible effect sizes, rather than declaring ten runs universally sufficient.
6. Score independently reproducible results, justified experimental/causal choices, verified evidence and citations, and supported conclusions. Evaluate writing with blinded calibrated reviewers. Keep cost, time, and human intervention visible instead of hiding them in post-hoc weights.
7. Use genuinely diverse difficult tasks and independent withheld checks. A perfect score on a narrow test must remain visible as saturation. It cannot become broad research evidence through a nonlinear transform.
8. To make a human-level claim, add qualified human baselines under documented comparable conditions and scope the claim to the evaluated tasks. Model-versus-model comparisons alone do not establish equivalence to a PhD researcher.

## Limitations

This note verifies methodology text, not AA's private implementation or datasets. The live pages can change; pin their versions in a benchmark release. It does not establish valid Research Index weights, sample size, judge agreement, reference calibration, competing harness compatibility, or human baselines. Those remain work to validate before a defensible leaderboard or superiority claim.
