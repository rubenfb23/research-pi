# DeepSeek vs GLM: official scientific CPU pilot

Run `ce3c8216-e1bb-4bae-9132-03d1fc9ae821`. Full native ResearchPi CLI, OpenCode Go. One attempt per model/task; exploratory feasibility subset, not official suite scores.

| Task | Model | Local completion | Agent seconds | Requests | Speedup / replay |
|---|---|---:|---:|---:|---|
| vectorization | deepseek-v4.1-flash | True | 518.4 | 31 | 315.48x |
| vectorization | glm-5.3-flash | True | 271.9 | 15 | 360.22x |
| capsule-8610546 | glm-5.3-flash | True | 424.9 | 16 | completed |
| capsule-8610546 | deepseek-v4.1-flash | True | 255.4 | 16 | completed |
| capsule-8185407 | deepseek-v4.1-flash | True | 158.8 | 20 | completed |
| capsule-8185407 | glm-5.3-flash | True | 254.4 | 17 | completed |

The HTML report contains settings, caveats and per-attempt receipts. Official answers are scored separately from additional local completion endpoints. Raw traces, candidate artifacts and reference answers remain in the ignored workspace.

Protocol SHA-256: `69b5753c3bf2ca07477fa6c44cb22b4b2bdf49075b2dd62d5b63d107192cd87c`.

See [reproduction commands](../../scripts/official-bench/README.md), [source provenance](official-benchmark-preflight.md), and [sanitized results](deepseek-vs-glm-official-pilot.json).
