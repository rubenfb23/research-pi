# GLM-5.3 Flash research pilot

Date: October 4, 2026. Exploratory development run on OpenCode Go `glm-5.3-flash`. All seven generated tasks and all three controlled SDK profiles were attempted once, for 21 attempts. No conditions or graders were changed during the run.

Settings: requested thinking off, temperature 0.2, 150-second task deadline, ten model stream invocations per attempt, 4,096 output tokens per response and a 120,000 reported-token inter-request threshold. These match the successful DeepSeek pilot settings; the GLM pilot includes four additional tasks, so aggregate cross-model scores are not directly comparable. The provider/backend is not independently attested.

| Controlled SDK profile | Full passes | Rubric score | Model requests | Median task seconds | Estimated catalog USD |
| --- | ---: | ---: | ---: | ---: | ---: |
| Pi base instructions | 0/7 | 9.52% | 63 | 32.722 | 0.022687 |
| Pi + research instructions | 2/7 | 28.57% | 62 | 37.836 | 0.028838 |
| ResearchPi instructions + scientific tools | 1/7 | 14.29% | 64 | 32.070 | 0.033420 |

There is no 100% ceiling in this run. Pi with research instructions passed leakage detection and paired uncertainty; ResearchPi passed leakage detection; Pi base submitted a partially correct seed-coverage answer. ResearchPi did not outperform the instruction-only condition. One attempt per task provides no repeat-based uncertainty interval or reliable superiority claim.

## Dominant operational failure

Seventeen attempts exhausted the ten-request limit. Retained events contain 119 `write_file` validation errors because the model supplied a JSON object as `content`, although the schema requires a string. There are two additional tool errors. This measures end-to-end artifact completion and tool-schema handling, not scientific reasoning independently of execution. A correct answer discussed in chat is not a submitted artifact. No profile completed the executed/replayed study task.

All 21 receipts were audited. The audit correctly reports `incomplete` with the 17 failed attempts; no additional evidence consistency errors were reported. The run's nonzero CLI exit is its failure status, not an OpenCode authentication failure. There were no reruns or selectively discarded results.

## Evidence and next comparison

Run ID: `eb0bf245-ff16-4198-85d3-437b4a745b60`.

[Aggregate JSON](research-benchmark-glm-pilot.json) contains settings, category scores, costs and receipt/protocol hashes. Private traces and local paths are excluded. Catalog costs are estimates, not independently verified OpenCode Go invoices or subscription charges.

The next development experiment should improve common tool-schema guidance or add an explicit structured-JSON writer to every condition, retain this baseline, and rerun both models on the same seven-task matrix. This should not be a ResearchPi-only accommodation. Challenging unseen papers and repeated validation are still needed after operational failures are addressed. The existing public generated tasks are not a sealed holdout.

```sh
repi --project ./bench-glm bench research run \
  --provider opencode-go --models glm-5.3-flash \
  --harnesses pi,pi-research,repi --trials 1 \
  --timeout 150 --max-requests 10 \
  --max-output-tokens 4096 --max-reported-tokens 120000
```

See the [benchmark protocol](../research-benchmark.md) and [DeepSeek development pilot](research-benchmark-pilot.md).
