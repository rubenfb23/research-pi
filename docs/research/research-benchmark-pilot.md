# Controlled DeepSeek research pilot

Date: October 4, 2026. Status: exploratory development pilot, not confirmatory validation.

All conditions used OpenCode Go `deepseek-v4.1-flash`, requested thinking off, temperature 0.2, 150-second task deadline, ten model stream invocations, 4,096 output tokens per response and a 120,000 reported-token inter-request threshold. Three generated tasks, one independent session per task and profile, produced nine attempts. The tasks audited predictions, grounded a synthesis in synthetic passages and executed a miniature classifier study.

| Controlled SDK profile | Full task passes | Median task seconds | Model requests | Reported tokens | Estimated catalog USD |
| --- | ---: | ---: | ---: | ---: | ---: |
| Pi base instructions | 3/3 | 13.753 | 13 | 35,475 | 0.003893 |
| Pi + research instructions | 3/3 | 15.401 | 13 | 74,786 | 0.004213 |
| ResearchPi instructions + scientific tools | 3/3 | 14.451 | 12 | 80,444 | 0.004700 |

**Quality is tied.** ResearchPi used one fewer model request, but this small pilot does not establish a reliable efficiency advantage. Catalog estimates are not verified invoices or OpenCode subscription charges. Prompt/tool overhead increased reported usage. There are no confidence intervals with only one attempt per task.

Each profile generated and executed its own Python study with two methods and ten training seeds per method. Outputs were independently reexecuted in a fresh Linux Bubblewrap sandbox and checked against the task oracle. These sixty miniature classifier runs establish execution and traceability on this toy task, not real-paper reproduction or scientific superiority. The local evidence audit completed without errors. The full project suite passed 87 tests, with no failures or skips on this Linux host.

## Preparation attempt retained

Before this pilot, run `e90e8d73-936a-4f0d-b096-eef25af6d4de` attempted the Pi prediction audit with a six-request limit. It exhausted that limit after passing inline code to a filename-only tool and attempting to write from read-only Python. It submitted no final artifact; the remaining eight planned conditions were missing. Its evidence is retained locally and is not treated as a successful run. Shared tool descriptions were clarified for every profile and the common request budget was raised to ten before the new pilot. This is development tuning, not an independent validation result.

## Reproduction and evidence

Run ID: `b5ea0421-7019-4abf-9b44-8c8251fba317`.

Protocol hash: `74539f5307fcceed478ca365e262c3320d962768a625f33730bb58a3d68e5925`.

[Aggregate JSON](research-benchmark-pilot.json) publishes scores, settings and receipt hashes. Private traces are not published, so the export alone does not allow an independent evidence audit. Use the [benchmark commands](../research-benchmark.md) to generate and audit a new local run. Provider behavior and timings can change.

The complete seven-task, ten-repeat matrix, generated validation split, real unseen paper studies, blinded expert grading and same-model full-product comparisons remain pending. These SDK profiles are not stock Claude Code, Codex or OpenCode CLI products.
