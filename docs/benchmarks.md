# Research microtask benchmark

For controlled Pi/Pi-with-research-instructions/ResearchPi comparisons, submitted artifacts and independently reexecuted study code, use the new [research workflow track](research-benchmark.md): `repi bench research run`. It supports the configured OpenCode Go DeepSeek model and explicit multi-model matrices, with separate development/generated-validation conditions and an offline visual report.

The initial suite contains **twenty synthetic, closed-input tasks** across seed coverage, numerical correctness, leakage, causal claim scope and bibliographic compatibility. It is a constrained microtask evaluation, not a benchmark of complete papers, experiments or research expertise. Each condition defaults to ten independent trials per task. Trial IDs are repetitions, not controllable model RNG seeds.

## Verify the evaluator

```sh
repi bench tasks
repi --project ./bench-smoke bench run --agent fixture
```

The fixture condition returns stored reference answers, runs 200 grading trials, and sets `fixtureOnly: true`. It checks infrastructure and is excluded from model-performance claims. Tests also reject incorrect/empty answers.

## Evaluate real agents

These commands use existing authentication and consume provider/account usage. Use a small exploratory pilot before the complete suite:

```sh
repi --project ./bench-repi bench run --agent repi --tasks metrics-2 --trials 10
repi --project ./bench-claude bench run --agent claude --tasks metrics-2 --trials 10
repi --project ./bench-codex bench run --agent codex --tasks metrics-2 --trials 10
```

Omit `--tasks` for all twenty tasks. `--model`, ResearchPi's `--provider`, `--condition` and `--mode product|same-model` describe a condition. `same-model` requires an explicit model ID; the researcher must actually match versions, effort, sampling, tools and permissions across runs. This label alone does not establish a controlled experiment. The initial adapters do not provide stock-Pi or prompt-ablation conditions.

```sh
repi --project ./bench-explicit bench run --agent repi \
  --provider opencode-go --model glm-5.3-flash --tasks metrics-2 --trials 10 \
  --condition "ResearchPi with shared laboratory instruction"
```

Exact defaults: timeout 60 seconds per trial (1–300 supported), fresh project/process per trial, shared task/laboratory instructions, no automatic retries. Infrastructure failure stops the run by default, retaining the failed attempt and missing planned trials; use `--continue-on-error` explicitly to continue. Claude is requested to use no built-in tools, strict empty MCP configuration, no persisted session, two turns and a $0.25 per-trial API cap. Codex uses ephemeral sessions and a read-only sandbox. ResearchPi exposes its normal native tools; the prompt requests closed-input work. These tool boundaries are **different**, so the initial runner is a product microtask comparison, not proof of a harness effect. Current user/provider settings may also differ. Review the recorded commands and condition labels.

The runner enforces wall-clock deadlines and terminates process groups on POSIX. There is no universal token/dollar cap or complete tool isolation. `--budget-usd` applies through Claude's API cap only; other agents may charge independently. SDK/CLI providers expose different usage fields; unavailable model/usage/cost fields remain null or requested/default, never estimated as observations. Windows installed executables must be runnable by Node without a shell; `.cmd`-only competitor launchers require an executable wrapper. Full Windows/macOS benchmark execution is pending.

## Evidence and interpretation

Every run freezes a protocol with task definitions, requested condition, ResearchPi code fingerprint, agent version, controls and limitations. Per-trial requests, raw private traces, receipt hashes, answers, errors, elapsed time, exposed usage and model IDs live under `.research-pi/benchmarks/<id>/`. `repi bench audit <id>` recalculates grades and checks protocol, requests, receipts, traces and summary hashes. A summary retains expected/completed/passed trials and errors by category. Interrupted/failed trials remain failures; no completion or performance is inferred from an absent answer. Do not publish raw traces without checking for private data and provider reasoning.

A completed summary means trials returned, not that they all passed. Missing account access counts as infrastructure failure and does not prove poor scientific reasoning. Ten trials on a microtask do not support general rankings or universal model reliability. The grader checks required answer fields; it does not grade scientific prose semantics. Task definitions/graders are public, so contamination and deliberate grader access are limitations. Freeze a held-out suite before confirmatory claims.

## Next evaluation stage

Add held-out end-to-end tasks: real interrupted-run recovery, dataset/code provenance, independent prediction recalculation, source-supported synthesis and methodology writing. Include stock Pi, identical-instruction baselines and scientific-tool ablations using the same supported model where possible. Grade actual artifacts, calibrate blinded scientific reviewers, prespecify exclusions and report effect sizes/uncertainty, failures, time, observed cost and human interventions.

The design follows primary guidance that agent performance measures a model together with its harness and depends on execution resources. [Anthropic evaluation guidance](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents), [infrastructure experiments](https://www.anthropic.com/engineering/infrastructure-noise). No superiority claim is made without the corresponding experiment and published evidence.
