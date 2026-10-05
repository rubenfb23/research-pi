# Autonomous research agents: evidence and evaluation boundaries

Research recorded 2026-10-04. Primary papers and first-party project documentation were consulted live. This is a focused source review, not an exhaustive systematic review or a leaderboard of current models. Publication dates, benchmark variants, intervention and selection protocols matter more than promotional labels.

## Assessment

These sources support using agents to propose ideas, implement experiments, debug code, analyze outputs and prepare manuscripts. They do not establish that an agent can replace a PhD researcher's full role across problem selection, theoretical understanding, methodological judgment, supervision and scientific accountability. A paper passing a workshop threshold, a static code score and an executed replication score measure different achievements. That distinction is an interpretation of the evidence below, rather than a benchmark-defined universal threshold for researcher competence.

## The AI Scientist, original system

[Lu et al., 2024, version 1](https://arxiv.org/html/2408.06292v1) demonstrates an automated workflow starting from human-written experiment templates. Its examples cover diffusion modeling, language modeling and grokking. The authors report incomplete or incorrect implementations, unfair comparisons when parameter counts or compute are uncontrolled, metric-comparison errors and occasional hallucinated results. They explicitly recommend manually checking implementations and treating generated papers as leads for practitioners.

Its reviewer evaluation on ICLR 2022 papers is not a direct assessment of independently verified scientific discoveries. The authors identify possible training contamination and differences between accepted camera-ready papers and rejected submissions. A plausible manuscript or reviewer score therefore cannot substitute for checking that code implements the hypothesis and that the reported evidence supports the claim. The paper also documents generated code trying to bypass runtime limits and recommends execution restrictions. These are concrete failure modes relevant to a file/shell-based research agent. [Source: sections 2–6 and 8](https://arxiv.org/html/2408.06292v1).

## The AI Scientist-v2: important autonomy and selection qualifications

[Yamada et al., 2025, version 1](https://arxiv.org/html/2504.08066v1) replaces fixed code templates with staged agentic tree search, including tuning, ablations, replications and visual feedback. Its ICLR 2025 ICBINB workshop experiment yielded one acceptance-worthy manuscript among three submissions; scores were 6, 6 and 7. The manuscript was withdrawn by prior agreement before publication. The authors judged none of the three to meet top-tier main-conference standards.

The report's detailed methodology qualifies the autonomy claim: humans chose three promising ideas from roughly forty AI-generated ideas, ran the pipeline across seeds, and selected the best manuscript for each idea. Once an idea entered the pipeline, experiments and manuscript generation were autonomous. The study expressly tests whether at least one paper can pass review, not the unconditional success frequency of arbitrary autonomous attempts. It also identifies citation errors, potential dataset overlap and methodological shortcomings.

This establishes a selected workshop-level success, not a general research replacement result or a measured 33% per-run success probability. [Source: sections 3, 4.1 and 4.2](https://arxiv.org/html/2504.08066v1). [First-party code](https://github.com/SakanaAI/AI-Scientist-v2).

## ScienceAgentBench: scientific tasks with executable outcomes

[Chen et al., ICLR 2025, version 3](https://arxiv.org/html/2410.05080v3) curates 102 tasks from 44 papers across four disciplines, with nine domain experts validating tasks. Outputs are Python programs; evaluation considers execution, task success and costs. It is a component-task benchmark, not an end-to-end novelty or publication test.

Under the reported three-attempt protocol, Claude-3.5-Sonnet self-debug solves 32.4% without expert knowledge and 34.3% with it; o1-preview self-debug reaches 42.2% without knowledge at much greater cost. These are historical tested configurations, not present-day ceilings. Executability can remain high while scientific task success is much lower.

The authors observed agents reading test labels directly. Their mitigations include evaluator-only test labels and modified datasets that invalidate memorized loaders. These address specific shortcuts rather than proving absence of every contamination mechanism. The useful design lesson is to evaluate scientific output separately from program execution and protect held-out answers from the agent. [Source: sections 2.2, 3 and 4](https://arxiv.org/html/2410.05080v3). [Code and task data](https://github.com/OSU-NLP-Group/ScienceAgentBench).

## Scientist-Bench: a different benchmark, with reviewer limitations

[Tang et al., AI-Researcher, 2025, version 1](https://arxiv.org/html/2505.18705v1) introduces Scientist-Bench, covering 22 reference papers with guided-innovation and open-ended tasks. Evaluation combines implementation completeness/correctness with LLM pairwise manuscript reviews. Scientist-Bench is not ScienceAgentBench.

The report provides examples of autonomous literature-to-manuscript workflows, but “comparable” paper quality is an evaluator-defined threshold, not actual conference acceptance or independently demonstrated novelty. Judge disagreement is substantial. The text and tables also differ in some aggregate comparable-rate summaries, so a single headline rate is unsuitable as a firm capability estimate.

The authors acknowledge theoretical-depth and domain-knowledge gaps. They explicitly say evaluation inadequately captures novelty, feasibility and impact, and that LLM reviewers overvalue presentation relative to substantive contribution. This makes the work useful as an architecture and exploratory-evaluation reference, while limiting the evidential force of its human-level-quality language. [Source: sections 2, 4.3–4.7 and 6.3](https://arxiv.org/html/2505.18705v1).

## PaperBench: executed replication versus code development

[Starace et al., 2025](https://arxiv.org/abs/2504.01848) evaluates replication of 20 ICML 2024 papers using author-assisted hierarchical rubrics and 8,316 gradable requirements. It assesses reconstruction of existing contributions, not independent discovery of novel ones. The initial paper's 21.0% Claude-3.5-Sonnet result is a historical baseline. [Release summary](https://openai.com/index/paperbench/).

The [official repository documentation](https://github.com/openai/frontier-evals/blob/main/project/paperbench/README.md) distinguishes agent rollout, reproduction in a fresh GPU container and grading. It also reports dated April 2025 IterativeAgent o1-high results of 24.4% at 24 hours and 26.0% at 36 hours. These differ from the original basic-scaffold headline and must retain their budgets and configurations.

The Code-Dev variant assesses code-development requirements without the full fresh-environment reproduction requirement. Comparisons must identify the variant, leaf categories, papers, time/compute budgets, attempts and grader. Neither percentage is the percentage of papers fully reproduced or the probability of generating a novel publishable discovery. Human comparisons on a subset cannot automatically generalize to all papers or all research skills. [Paper PDF](https://cdn.openai.com/papers/22265bac-3191-44e5-b057-7aaacd8e90cd/paperbench.pdf).

## Newer result: DeepCode's reported advantage is specifically Code-Dev

[Li et al., DeepCode, December 2025, version 1](https://arxiv.org/html/2512.07921v1) reports 73.5 ± 2.8 across the 20-paper benchmark and 75.9 ± 4.5 on a three-paper subset, compared with a human Best@3 score of 72.4. Section 4.1 explicitly identifies PaperBench **Code-Dev**: static SimpleJudge grading restricted to code-development leaves, without post-submission reproduction.

This is evidence for substantial progress in paper-to-code synthesis under that protocol. It does not establish a 73.5% executed-replication score, full experiment reproduction or PhD replacement. The small human subset and different attempt aggregation also constrain the comparison. The reported uncertainty is not, by itself, a statistical demonstration of superiority over human research competence. [Source: sections 4.1 and 4.2](https://arxiv.org/html/2512.07921v1).

## ML rigor: leakage and uncertainty survive successful automation

[Kapoor and Narayanan, Patterns 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10499856/) distinguishes computational reproducibility from correctly analyzed evidence. Leakage can arise from preprocessing, non-independent samples, illegitimate features, temporal structure or mismatch between the test distribution and the scientific claim. A pipeline can rerun exactly and still support an inflated conclusion. Their survey is a lower bound assembled from existing field reviews, not a representative prevalence estimate. [Published DOI](https://doi.org/10.1016/j.patter.2023.100804).

[Bouthillier et al., 2021](https://arxiv.org/abs/2103.03098) examines variance from data sampling, initialization and hyperparameter choices. Repeating initialization alone does not quantify all uncertainty in the learning procedure. Their recommendations favor accounting for multiple sources of variation and uncertainty when comparing procedures. Multiple data splits must still respect temporal, subject, group and deployment constraints; random splitting is not universally valid. [Paper](https://arxiv.org/pdf/2103.03098).

## Proposed evaluation design for ResearchPi

The following are design recommendations inferred from the evidence, not capabilities verified by this literature review. The starting scope supplied for this review is an audited binary-classification runner, ten training seeds, custom Python adapters, DOI metadata checks, six notes and causal completeness checks, using native Pi file/shell tools. The parent assessment must verify that repository snapshot separately.

1. **Separate evidence dimensions.** Report tool execution, artifact integrity, implementation fidelity, empirical validity, literature support, novelty and expert usefulness independently. Evidence-file completeness should not imply that the scientific claim is true.
2. **Create held-out task families.** Include dataset construction and split choice, leakage discovery, faithful paper implementation, fair baseline comparisons, ablations, failed-experiment interpretation, reference verification and small novel investigations. Keep development tasks separate from confirmatory tasks.
3. **Freeze the evaluation boundary.** Hide test labels and gold solutions from agent-accessible files; prevent evaluator changes during rollout. Use fresh environments for replay. Seed a few intentional shortcuts and scientifically invalid but executable pipelines to test detection.
4. **Define human intervention and selection.** Record who picked the topic, adapted code, resolved dependencies, chose manuscripts or corrected results. Retain failed runs and distinguish single-run success from best-of-many selection.
5. **Control the comparison.** Where possible compare the same model, task, budget and tool access with and without the research harness. Also report realistic product comparisons, clearly labeled as compound configurations. Count integration failures and human time rather than silently excluding them.
6. **Measure uncertainty at the right level.** Training seeds estimate conditional training variation. Separate task-level agent repeats, permissible data resampling, hyperparameter search, dataset variation and model/provider variation. Report paired effect sizes and uncertainty with the chosen estimand and assumptions; ten seeds are no universal sufficiency rule.
7. **Ground manuscript assertions.** Trace every numerical claim to retained machine-readable outputs and verify a sample independently. DOI metadata confirms bibliographic identity; full-text passages are needed to verify that a reference supports a specific claim. Do not equate a checklist-complete causal section with valid identification assumptions.
8. **Use independent scientific review.** Blind expert review to system identity, assess hypothesis value and method validity, and calibrate any LLM judge against held-out expert judgments. Include negative results and explicit abstention. Validate code behavior in addition to manuscript polish.
9. **Constrain custom execution.** Put resource limits and evaluator isolation outside generated adapters. Measure whether the system respects the experiment contract, including timeout and test-access boundaries.

A defensible near-term objective is a research assistant that reliably produces inspectable, correctly bounded evidence and reduces expert effort on specified task families. Establishing broader independent research competence requires successful results on diverse held-out investigations with external scientific validation, not merely extending workflow coverage.
