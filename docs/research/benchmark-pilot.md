# Exploratory numerical microtask pilot

Recorded 2026-10-03 with ResearchPi 1.5.0 work in progress, Pi 1.0.0 and Codex CLI 0.156.1 on Linux. The [public evidence export](benchmark-pilot.json) retains every completed exploratory run, answers, grades, condition fingerprints and original receipt/trace digests. Raw provider traces remain private. This is **one numerical task**, not a ranking of research quality.

## Audited condition after the infrastructure correction

The task supplies four binary labels, predictions and a reported accuracy. A correct response recalculates accuracy as `0.5` and sets `reportMatches: false`. Each agent received identical task input and shared laboratory instructions in ten fresh processes/projects. The grader accepts a JSON object or a single JSON code fence and checks the two required fields; additional prose fails format grading. Model RNG seeds are not controllable through these adapters.

| Configuration | Planned | Completed | Passed required fields/format | Local evidence audit |
| --- | ---: | ---: | ---: | --- |
| ResearchPi / OpenCode Go / observed `glm-5.3-flash` | 10 | 10 | 8 | Complete |
| Codex CLI / requested `gpt-5.5` | 10 | 10 | 10 | Complete |
| Claude Code | Not rerun | 0 | Unmeasured | Existing OAuth session expired |

The Codex event stream did not expose an actual model ID, so it remains null in receipts; `gpt-5.5` is the requested configuration. Models, effort, tool boundaries and user/provider settings differ. Some runs overlapped scientific tests on this machine, so elapsed times are observations rather than a controlled latency comparison. These results support only the recorded task and conditions. They do not establish a harness effect, general reliability, statistical superiority or complete scientific capability.

Run IDs: ResearchPi `75701971-05c0-4832-addb-932013cee570`; Codex `af7c8553-eeb1-4de7-a155-896fd5de8ece`. Their full frozen condition fingerprints and per-trial evidence are in the export. Both local audits independently recalculated grades and checked retained protocol/request/receipt/trace consistency.

## Earlier exploration and fixes, retained rather than overwritten

- An initial ResearchPi response computed the right number but appended prose. It failed format grading. The general output-format instruction was then strengthened; this is prompt tuning, not a held-out confirmatory result.
- A later ten-trial ResearchPi run passed 6/10: three wrong accuracy values and one extra-prose failure. Its local audit passed. It is retained as a separate earlier condition and is not removed or pooled to improve the score.
- Claude Code failed because its existing OAuth session had expired and could not refresh. No authentication state was changed and no scientific score is inferred.
- Codex's account rejected its default requested model. An explicit `gpt-5.5` request returned a valid answer; a subsequent ten-trial run returned ten passing answers.
- Auditing those earlier Codex runs exposed an evaluator bug: optional undefined CLI arguments contributed to the in-memory protocol hash but disappeared in JSON storage. Earlier affected protocols fail audit and are excluded from verified results. The correction removes undefined options before hashing, has a failing-then-passing regression check, and the ten-trial runs above were executed again against the corrected runner. Original files were preserved.
- One additional launch failed before any trial when instruction fingerprints were missing from the protocol. It produced no model-performance observation; the field was added and covered by the evaluator tests.

The corrected ResearchPi run still has two failures. They are visible in the exported answers/grades and must not be treated as successful trials. The same-model experiment, twenty-task × ten-trial suite for all three products, held-out tasks, scientific artifact evaluation and blinded review remain pending. See the [evaluation protocol](../benchmarks.md) and [capability comparison](../comparison.md).
