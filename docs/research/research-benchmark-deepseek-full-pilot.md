# DeepSeek seven-task research pilot

Date: October 4, 2026. OpenCode Go `deepseek-v4.1-flash`; seven tasks × three profiles × one independent session = 21 attempts. Requested thinking off, temperature 0.2, 150-second task deadline, ten model stream invocations, 4,096 output tokens per response and 120,000 reported-token inter-request threshold. These match the GLM seven-task pilot. No tools, task instructions or grading rules were changed between the two runs.

## Profiles are component ablations

These are three controlled Pi SDK configurations, not three separate products:

- `pi`: base Pi instructions and common bounded workspace/Python tools.
- `pi-research`: ResearchPi instructions and those same common tools. This is **ResearchPi without additional scientific tools**.
- `repi`: the same ResearchPi instructions plus selected scientific tools. This is **ResearchPi with additional scientific tools**.

This separates instruction effects from additional tool effects. Neither ResearchPi profile includes every unrestricted feature of the normal CLI. SDK identifiers remain unchanged to preserve recorded protocols and cross-run comparisons.

## Frozen rubric results

| Profile | Full passes | Rubric score | Model requests | Median task seconds | Estimated catalog USD |
| --- | ---: | ---: | ---: | ---: | ---: |
| Pi base | 6/7 | 95.24% | 29 | 10.413 | 0.006664 |
| ResearchPi without scientific tools | 5/7 | 91.67% | 32 | 11.547 | 0.009302 |
| ResearchPi with scientific tools | 6/7 | 95.24% | 30 | 12.359 | 0.008266 |

All 21 attempts completed, and the independent local consistency audit returned complete with no errors. All profiles generated, executed and independently reproduced the two-method × ten-seed miniature study, for sixty toy classifier runs. This is not real-paper replication. Catalog costs are estimates, not verified OpenCode subscription charges or invoices.

## Evaluation defects discovered

All three profiles correctly found the missing seed and duplicate record. However, they returned a list under `complete`, while the grader requires a boolean. The task did not disclose that field's type. Each therefore lost one third of the seed task's score. This is an underspecified output-contract penalty, not evidence of failed coverage reasoning.

ResearchPi without scientific tools returned sample SD `0.018319` for the expected `0.018319267331297823`. The six-decimal value is a correct rounded representation but fails the grader's absolute `1e-8` tolerance. Task instructions did not specify that precision. This accounts for its additional quarter-point task penalty and does not establish a meaningful scientific deficit.

Frozen scores above are retained unchanged. Before confirmatory evaluation, specify every output field's type and required precision, apply the same contracts to every profile, version the tasks and rerun both models. Do not silently regrade old results or reinterpret these artifacts as evidence that one research harness is superior.

The suite still has a practical ceiling for this model: most tasks are easy and remaining penalties concern output contracts. More difficult unseen paper studies, open-ended evidence assessment and repeated trials are needed. There is no statistically supported harness advantage from one session per task.

## Evidence and reproduction

Run ID: `bb5e60a2-2af8-40a3-99f9-a403a582f39b`.

[Aggregate JSON](research-benchmark-deepseek-full-pilot.json) retains the protocol hash, settings, scores and receipt hashes; private traces are excluded.

```sh
repi --project ./bench-deepseek-full bench research run \
  --provider opencode-go --models deepseek-v4.1-flash \
  --harnesses pi,pi-research,repi --trials 1 \
  --timeout 150 --max-requests 10 \
  --max-output-tokens 4096 --max-reported-tokens 120000
```

[Benchmark protocol](../research-benchmark.md), [same-matrix GLM pilot](research-benchmark-glm-pilot.md), [earlier three-task DeepSeek pilot](research-benchmark-pilot.md).
