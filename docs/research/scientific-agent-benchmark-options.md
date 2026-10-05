# Scientific agent benchmark options

Verified against primary sources on 2026-10-05. This document is a design recommendation, not a report of benchmark runs. No evaluation APIs were called and no external benchmark was installed or executed for this investigation.

## Recommendation

Keep the seven existing synthetic cases as regression tests. To measure ResearchPi's contribution, move the main evaluation to independently published, executable scientific tasks and evaluate the actual ResearchPi CLI alongside actual competing CLIs. The useful outcome is correctly reproduced research with defensible evidence per unit of time and cost, rather than a more elaborate final answer.

Start with the current **CORE-Bench Extended/OOD** release for real paper-code reproduction, add **verified ScienceAgentBench** for scientific data-processing and analysis, and use a resource-screened **MLAgentBench** subset for iterative ML experimentation. Add **PaperBench** as a small, harder capstone after the execution infrastructure works. Use **Terminal-Bench** as an external general-agent control, not the main definition of research competence.

This selection is a proposal. It does not imply these public tasks are uncontaminated for today's models, that ResearchPi will win, or that any of them establishes the ability to replace a researcher.

## What Artificial Analysis actually measures

Artificial Analysis's current Coding Agent Index v1.5 combines DeepSWE v1.1, Terminal-Bench 4.0, and SWE-Atlas-QnA. Its methodology describes three attempts per task, separately reported efficiency metrics, task-specific verification, and integrity checks against obtaining expected outputs or tampering with verifiers. Terminal-Bench is the closest fit here because it includes terminal-driven ML and scientific computing. A selected scientific subset is a local evaluation, not the full AA index or an official leaderboard score. [AA coding-agent methodology](https://artificialanalysis.ai/methodology/coding-agents-benchmarking).

AA also uses SciCode for scientific Python generation, with background information, subproblem scoring, and isolated execution. That measures a useful component skill, but the published AA prompting protocol does not exercise a full research agent's planning, experiment management, recovery, memory, and evidence workflow. Adapting it to interactive agents changes the protocol and must be labeled. [AA intelligence methodology](https://artificialanalysis.ai/methodology/intelligence-benchmarking).

## Candidate benchmarks

| Benchmark | Verified public scope | Best local use | Main limitation |
|---|---|---|---|
| CORE-Bench v1.1 / Extended | Corrected reproduction tasks from paper code; 39 mainline and 19 OOD capsules | First real CLI comparison; recovery, correctness, reliability, efficiency | Legacy version is saturated; OOD is public and still not full novel research |
| ScienceAgentBench, verified | Scientific data workflow programs from publications | Executed analysis and figures with independent grading | Primarily multidisciplinary component tasks, rather than ML papers end to end |
| MLAgentBench | 13 end-to-end ML experimentation environments | Iterative model improvement and experiment management | Small task diversity; old dependency/provider interfaces; some dataset access requirements |
| PaperBench | 20 ICML 2024 replication projects | Hard research capstone with hierarchical partial credit | Hours of work, GPU reproduction, grading costs, complex access requirements |
| RE-Bench | Seven open-ended AI R&D environments with expert comparison | Later GPU research-engineering evaluation | Expensive hardware, few independent tasks, special anti-overfitting request |
| ResearchBench | Inspiration retrieval, hypothesis composition, hypothesis ranking | Optional ideation/literature component | Does not execute or validate discoveries; reference-hypothesis and judge dependence |
| SciCode-Verified | Corrected scientific-programming problems and audit trail | Numerical correctness control | Corrected modern-model results also approach saturation |

### CORE-Bench: use the new release, not the old leaderboard

The original benchmark contains 270 tasks from 90 papers and provides an interface for custom agents. Its original repository now directs users to HAL and says its own harness is no longer actively maintained. Code is MIT licensed; individual scientific capsule materials retain their upstream provenance. [Original repository](https://github.com/siegelz/core-bench).

The authors' current reproduction instructions point to the HAL `feat/corebenchv2-prefect` branch. This release specifies 39 mainline capsules and 19 OOD capsules, with code, data, and environments packaged as capsules. Answers depend on generated outputs. Keep the decrypted grader outside the agent container; its encryption is packaging, not protection from an agent that can read the grader's filesystem. [Current HAL release instructions](https://raw.githubusercontent.com/princeton-pli/hal-harness/feat/corebenchv2-prefect/README.md).

HAL explicitly declares the legacy CORE-Bench solved after manual grading corrections. The June 2026 paper introduces CORE-Bench v1.1 and Extended/OOD, and argues for measuring shortcuts, generalization, efficiency, reliability, scaffold effects, and human-agent collaboration even after accuracy saturates. This is especially relevant to the current ResearchPi ceiling problem. [HAL announcement](https://hal.cs.princeton.edu/corebench_hard), [author paper](https://arxiv.org/abs/2606.26158), [author analysis repository](https://github.com/nnadgi01/corebench-analysis).

**Proposal:** screen the 19 OOD capsules for local hardware requirements, establish that the authors' reference work executes, and freeze eligible IDs before running any evaluated agent. Report excluded tasks and reasons. Evaluate mainline separately for efficiency and repeated reliability. The dataset downloads were linked by the authors but not fetched in this investigation; their task-specific RAM, GPU, and licensing requirements still need inspection.

### ScienceAgentBench: verified scientific workflows

The official repository describes 102 tasks from 44 peer-reviewed publications, each producing a self-contained Python program. A verified release announced on 2026-04-30 corrects false-negative grading; use its verified split and artifacts. Docker evaluation supports selected instance IDs. Some visualization grading requires a model API. Code is MIT; most tasks are CC BY 4.0 with retained exceptions. The authors request that decrypted benchmark artifacts not be redistributed. Its default metric script selects the best of three runs, so use individual attempt scores for our primary pass@1 and label any best-of-three figure explicitly. [Official repository and current release notice](https://github.com/OSU-NLP-Group/ScienceAgentBench).

**Proposal:** use a frozen 15–20 task resource-screened pilot spanning numerical processing, modeling, analysis, and visualization. Keep program-execution tests primary; audit ambiguous visual judgments independently and blind graders to agent identity. This is useful research workflow coverage, but cannot by itself prove ML/AI research quality.

### MLAgentBench: practical ML experimentation

MLAgentBench has 13 tasks in which agents develop or improve ML models using files and experiments. The documented metrics include the proportion of runs obtaining more than 10% improvement over the starter baseline and improvement among valid submissions. The benchmark keeps evaluation scripts separate from the visible environment. Some tasks need Kaggle credentials and competition-rule acceptance. It supports Docker and uses older Python/provider interfaces; adapting an external CLI is engineering work, not just selecting a model flag. The code license is MIT. [Official repository](https://github.com/snap-stanford/MLAgentBench), [license](https://raw.githubusercontent.com/snap-stanford/MLAgentBench/main/LICENSE).

**Proposal:** identify 4–6 feasible ML tasks before evaluation and keep official held-out scoring unchanged. Add a separately reported ResearchPi process rubric for validation/test separation, seed coverage, logged failures, ablations, and reproducible conclusions. A benchmark's fixed original training protocol must not be silently replaced by our ten-seed policy while retaining its official score label.

### PaperBench: strongest capstone, not the cheapest first step

PaperBench asks agents to replicate 20 ICML 2024 Spotlight/Oral papers. Author-developed hierarchical rubrics decompose the work into 8,316 gradable requirements. [Official announcement](https://openai.com/index/paperbench/).

The current code is in `openai/frontier-evals/project/paperbench`. Its full pipeline separates agent work, fresh-container GPU reproduction, and grading. Code-Dev skips reproduction and checks implementation requirements only; it therefore cannot establish correct execution or matching results. Some papers require extra API access or gated model/data access. The project uses an LLM judge and supplies JudgeEval to assess judge performance. Repository code is MIT, but supplied papers and external data need their own notices and access checks. [Current implementation](https://github.com/openai/frontier-evals/blob/main/project/paperbench/README.md), [repository license](https://raw.githubusercontent.com/openai/frontier-evals/main/LICENSE.md).

**Proposal:** choose 2–3 papers by declared topic/resource criteria before observing competing-agent results, run the full reproduction stage, and retain requirement-level partial credit. Treat this as a capstone case series, not a statistically conclusive overall win. A Code-Dev pilot can validate adapters cheaply, provided the report clearly says it did not reproduce experiments.

### RE-Bench: later, with budget and intent review

RE-Bench has seven open-ended ML research-engineering tasks. The published evaluation uses machine access ranging from one to six H100 GPUs and compares to eight-hour human expert attempts. Metrics include runtime, loss, and win-rate improvements, with reference-based normalization. These continuous objectives are useful when binary tasks saturate; the seven task environments still give limited independent task diversity. [Author paper](https://arxiv.org/html/2411.15114v1).

The setup requires Docker, NVIDIA/CUDA tooling, and significant storage. GPU manifests can be changed, but changed hardware must be reported and invalidates direct hardware-dependent score comparisons. The MIT repository additionally asks users not to publish unprotected solutions or use the evaluation material to improve frontier models outside the intended evaluation purpose. Respect those requests and do not make it ResearchPi's open tuning set. [Repository](https://github.com/METR/RE-Bench), [official setup](https://raw.githubusercontent.com/METR/RE-Bench/main/setup/README.md).

### ResearchBench: optional ideation, not proof of discovery

ResearchBench's official release covers inspiration retrieval, hypothesis composition, and hypothesis ranking. It has an OpenAI-compatible client and a 12-sample smoke split; hypothesis composition includes judge-based scoring. Code is MIT but data is CC BY-NC 4.0 and source-derived materials have further terms. [Official repository](https://github.com/ankitala/ResearchBench), [data license](https://raw.githubusercontent.com/ankitala/ResearchBench/main/DATA_LICENSE.md).

**Proposal:** reserve it for a separate hypothesis/literature track. Similarity to an existing published hypothesis is a proxy, not confirmation of novelty, correctness, or practical scientific value. A 2024+ paper filter cannot establish absence of contamination in models deployed in October 2026.

### SciCode: corrected scores change the recommendation

The August 2026 SciCode-Verified author audit reports many original defects and substantially higher performance after correction, including 84–98% subproblem and 69–92% main-problem accuracy for the twelve tested model snapshots. These are the authors' results, not our models' measurements. They undermine the assumption that low old SciCode scores guarantee a difficult, valid benchmark. Use the corrected version and its audit trail for component checks, not old scores as a target to beat. [SciCode-Verified paper](https://arxiv.org/abs/2608.04975), [release repository](https://github.com/flyingwagner/scicode-verified).

## Proposed controlled protocol

1. Keep separate **scaffold contribution** and **product comparison** tracks. The first holds model, endpoint, sampling/effort, compute, input data, and budget constant across compatible harnesses. The second evaluates native products and clearly names each model, enabled feature, and billing regime. A product win with a different model cannot identify the effect of ResearchPi alone.
2. Use a common outer container runner with one thin adapter per actual CLI. Give each agent equivalent shell, file, package-install, dataset, GPU, and documentation access. Preserve its native prompting/planning/tools where those are the treatment. Record external/subagent model calls and include their cost and budget.
3. Freeze benchmark version, task IDs, exclusions, retry policy, budgets, and graders first. First verify references in the same compute environment. Do not select cases because competitors fail them.
4. Use three independent agent attempts per task for an exploratory pilot and ten for a preselected repeated-reliability subset. Agent attempts are separate from an experiment's training seeds. More repeats do not replace more independent scientific tasks.
5. Grade artifacts in a fresh environment with expected outputs and grader credentials inaccessible during agent work. Record task-level success, continuous official scores, critical scientific errors, independently reproduced claims, time/cost to verified success, failed attempts, human intervention, and repeated consistency. Do not collapse all of these into an invented weighted score initially.
6. Bootstrap by independent task or paper, retaining paired agent attempts, and publish paired effect sizes with intervals. Analyze ceiling cases using lower fixed budgets, efficiency and pass-all-repeats, rather than arbitrary extra penalties. Any change to task difficulty is a new version applied to all agents.
7. Tune on development tasks. Freeze prompts/tools before a separate final task set; have external reviewers create or audit a fresh private research set for strong novelty, causal validity, and methodology claims. Public official benchmarks provide external comparability, not a genuinely secret holdout.

## Budget and readiness

There is no verified fixed current price for this proposed experiment. Provider charges, inference retries, judge calls, compute rental, package downloads, and failure recovery all contribute. First run 3–5 infrastructure calibration tasks per adapter, record actual usage and wall time, then calculate the full matrix cost before expanding. Published historical dollar totals are not quotes for our model/provider combination.

The initial resource-screened scientific set should contain approximately 30–50 distinct tasks, not seven templates with many repeated seeds. Two models, three compatible harnesses, and three attempts on 40 tasks already means 720 agent attempts; an additional four-product native comparison expands that substantially. These counts are planning examples, not scheduled runs.

Adapters, task downloads, references, license review, and scoring checks are still required. This investigation does not establish that today's ResearchPi sandbox can run these environments: its current bounded toy runner needs a separate full-CLI container track to support package installation, longer experiments, and genuine competing harnesses.
