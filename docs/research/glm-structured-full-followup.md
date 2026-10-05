# GLM structured-writer seven-scenario follow-up

October 5, 2026. Same seven generated task definitions and requested settings as the retained earlier model pilots, with `write_json` and clearer common tool descriptions enabled for every profile. This differs from DeepSeek's retained tool version; it is not a controlled new model ranking.

The initial 21-case schedule attempted 18 cases before the instruction-only source-synthesis session returned `Streaming response failed: [server_error] upstream service timeout`. The first run remains incomplete. No failed task was retried. A separate three-case run executed only the previously unattempted replication cells. Together they provide one actual attempt per requested scenario/profile, with the timeout retained as zero. Combined summaries are explicitly derived exports, not a new audited 21-case run.

| Profile | New rubric score | Full passes |
| --- | ---: | ---: |
| Pi base | 95.24% | 6/7 |
| ResearchPi without scientific tools | 73.81% | 4/7 |
| ResearchPi with scientific tools | 95.24% | 6/7 |

Pi base and ResearchPi with scientific tools reproduced correct twenty-run studies. The instruction-only profile executed and reexecuted its script, but its run data failed the oracle and its submitted artifact disagreed with the fresh output. Source synthesis in that profile retains the provider timeout. All profiles correctly found missing/duplicate seeds while receiving the historical underspecified-boolean penalty.

Tool telemetry across the 21 actual attempts: 21 `write_json` calls; 10 `write_file` content-type errors (versus 119 before); two filename-contract errors in `run_python`. All JSON calls completed without tool errors. This improves interface compatibility but does not eliminate all tool-use problems or establish isolated causality of any one change.

The first run audit records the known provider failure and three missing study receipts. The continuation's independent consistency audit passed without errors. Original inputs/settings were checked equal to the earlier frozen DeepSeek tasks; study inputs also matched the continuation. One attempt per cell, no uncertainty intervals or general research superiority claims. Existing type/precision defects remain unchanged.

- Initial run: `4cd55dd7-2e46-41f8-90fb-0c5f33e03694`, [aggregate export](glm-structured-full-run.json).
- Unattempted-study continuation: `1e61447f-d16e-4dfc-9756-8563fdfa42ea`, [aggregate export](glm-structured-study-continuation.json).
- [Derived combined results](glm-structured-combined-results.json).
- [Updated visual comparison](deepseek-vs-glm-research-pilot.html).

Private event traces, reasoning, credentials and local paths are not published. Catalog cost estimates are not independently verified account billing.
