# Structured JSON writer verification

Date: October 5, 2026. The common benchmark tools now expose `write_json(path, data)` for JSON objects/arrays. The tool serializes data itself, rejects nonfinite numbers and limits serialized UTF-8 output to 256 KB before truncation. It shares path, symlink and input-protection checks with `write_file`. The latter remains a string-only text/code writer; its description now explicitly directs JSON submissions to `write_json`. Python guidance does the same. This change applies equally to all three controlled profiles.

Build and full local tests: 88 passed, zero failures or skips. Tests check nested Unicode data, arrays, immutable evidence, traversal, symlink escapes, oversize rejection without truncating existing data, nonfinite values, and real SDK dispatch in every profile.

## Exploratory real GLM check

OpenCode Go GLM-5.3 Flash, metrics-audit only, one session per profile. Same task and limits as the previous full GLM pilot: requested thinking off, temperature 0.2, 150 seconds, ten stream invocations, 4,096 output tokens and 120,000 reported-token threshold.

| Profile | Before: full pass / requests | After: full pass / requests | After task seconds |
| --- | --- | --- | ---: |
| Pi base | No / 10 | Yes / 5 | 18.594 |
| ResearchPi without scientific tools | No / 10 | Yes / 5 | 6.982 |
| ResearchPi with scientific tools | No / 10 | Yes / 5 | 5.612 |

All three profiles used `write_json`; there were three successful JSON writes and zero tool errors across twelve total tool calls. The local consistency audit passed. This demonstrates successful structured submission on this task, with fewer requests than the previous failed attempts. It does not establish universal compliance, a statistical speed advantage, isolated causality of the new tool versus improved descriptions, or full-suite scientific performance. It is a development follow-up; the old failed runs and scores remain unchanged.

`write_json` adds one common tool schema and local serialization, with no mandatory extra model request. Serialized artifact size is capped. Total model/context overhead is not independently isolated by this pilot. No latency or billing guarantee is claimed.

Run: `cf59faa0-ee39-4a12-bce2-3922d3940b93`. [Aggregate evidence](json-writer-glm-pilot.json). Full seven-task reruns with both models and output-contract corrections remain pending. The near-ceiling and precision/type defects in the older tasks have not been silently revised.
