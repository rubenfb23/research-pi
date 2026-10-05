# Official scientific CPU pilot

This runner compares **DeepSeek V4.1 Flash** and **GLM-5.3-Flash** through the full native ResearchPi CLI and the existing OpenCode Go connection. It does not compare harnesses or compute an official full-suite leaderboard score.

Three public tasks are selected before model runs: MLAgentBench `vectorization`, CORE-Bench Extended/OOD `capsule-8610546` and `capsule-8185407` at medium difficulty. See [source acquisition, revisions and licenses](../../docs/research/official-benchmark-preflight.md). Capsule code/data and original license files stay in ignored local workspaces and are not redistributed here.

Install Docker and Node 22, then obtain the upstream files using the commands in that preflight document. The source directory must contain `MLAgentBench`, `core_ood.json`, both capsule archives and the decrypted `corebench-current.py`. Preparation refuses an existing output directory.

```bash
npm ci
npm run build
node --test scripts/official-bench/relay.test.mjs
python3 scripts/official-bench/prepare.py \
  /tmp/repi-benchmark-preflight \
  .local-workspace/official-scientific-pilot \
  "$PWD"
docker build -t repi-official-pilot:20261005 \
  .local-workspace/official-scientific-pilot/image
repi bench official --dataset .local-workspace/official-scientific-pilot
```

Running the last command makes real model requests under your existing OpenCode Go account. It does not replace your global model selection or credentials. Each launch creates a new run directory; every started attempt, failure, request receipt, native JSONL trace, artifact hash and separate grading/replay output is retained. Runtime and protocol hashes are frozen before the first call. The image ID is recorded; the shared Python package versions are locked.

Each task/model gets one fresh session, 600 seconds, 40 HTTP requests, at most 8,192 requested output tokens per response, two CPU cores and 3 GiB RAM. Model order alternates across tasks. Requested thinking is `medium`; receipts record the actual outgoing reasoning fields, returned model ID and reported usage. Requested settings do not prove identical internal computation across different models. Auto-compaction and retry remain native harness behaviors and consume the same request budget. Agent attempts are distinct from stochastic training seeds.

Agent containers receive only public task files, a frozen app image and fresh isolated state. An internal Docker network allows inference through a host relay that holds the real credential. The relay permits only the frozen model and inference route. Agents cannot reach public websites, install packages over the network, mount Docker or access the official answer manifest, upstream grader, reference executions or another attempt. This is a local environment adaptation; the scientific Python stack differs from the archived Code Ocean images. Legacy dependency repair is part of the task.

CORE scoring uses the unchanged upstream numeric grading methods and answer tolerances. The methods are extracted from the privately held pinned source to avoid requiring HAL's orchestration dependencies. Reference execution and known-correct/wrong-answer checks must pass before paid runs. A second isolated container replays the submitted `reproduce.sh` after deleting generated results, credentials and conversation state. Replay consistency alone does not rule out hardcoded calculations or certify scientific validity; inspect code changes and evidence before making research claims.

For vectorization, the unchanged official evaluator reports the CSV's claimed runtime. A separate probe executes baseline and candidate in different containers on six correctness cases and three fresh large inputs. The additional local endpoint requires changed code, a valid claimed runtime, correct outputs and at least 1.10x median measured speedup, so small timing fluctuations in unchanged code cannot count as improvement. Baseline files and expected outputs are never mounted with candidate code. This is a reproducibility audit, not a hardened defense against deliberately malicious submissions.

The `private` directory includes gold answers; keep it and raw traces private. Publish only reviewed aggregate results and provenance, never task gold, credentials or unrelated user files. One attempt on three feasibility-selected tasks cannot establish model superiority, ResearchPi's value over another harness, or broad PhD-level competence. Expand distinct tasks and repeated sessions before inference; full PaperBench and GPU experiments are outside this CPU pilot.
