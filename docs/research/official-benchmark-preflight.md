# Official scientific benchmark preflight

Date: 2026-10-05. This is a source and download feasibility investigation, not a completed model evaluation. No task code was executed, no global dependencies were installed, and no paid model requests were made in this investigation.

## Recommended executable starting point

Use the original **MLAgentBench `vectorization` task** plus **CORE-Bench Extended/OOD hard tasks `capsule-8610546`, `capsule-8185407`, and `capsule-5172670`**, subject to an isolated environment preflight. This produces four heterogeneous tasks: numerical optimization, stochastic control reproduction, legacy scientific environment repair, and probabilistic sentiment-model reproduction. It is a feasibility subset, not a representative full-benchmark estimate. The three CORE candidates have written numeric questions and do not require a separate vision-model judge.

For a first low-resource launch, `vectorization` and `capsule-8610546` have the simplest dependency sets. Add the remaining tasks once their original dependencies can be installed or repaired fairly by both agents. Preserve any excluded/infrastructure-failed task and the exclusion reason. At least three independent agent attempts per model are preferable; ten training seeds are a different axis and must not be confused with ten agent attempts. Do not silently alter an official task's fixed parameters or impose ten training seeds as if the official benchmark required them.

All statements about CPU feasibility below are based on inspected code and original environment specifications. **Actual runtime, peak RAM, original image availability, and clean replay remain unverified.** No GPU packages or GPU calls were found in these three CORE tasks. A small archive does not imply a short computation.

## Pinned sources and download provenance

- [MLAgentBench source](https://github.com/snap-stanford/MLAgentBench/tree/5d71205cc20a8e95d43aa7cb7120e89ca3323e31), downloaded at commit `5d71205cc20a8e95d43aa7cb7120e89ca3323e31`. The clone occupies about 5.8 MiB locally. Its [license](https://github.com/snap-stanford/MLAgentBench/blob/5d71205cc20a8e95d43aa7cb7120e89ca3323e31/LICENSE) is MIT, with the upstream placeholder copyright retained as provided.
- [CORE-Bench Extended/OOD dataset](https://huggingface.co/datasets/agent-evals/core-bench-v1.1-ood/tree/00cfba0d8d83c093eac856f39b4f450a0c8aad9f), pinned revision `00cfba0d8d83c093eac856f39b4f450a0c8aad9f`. The public ungated repository contains 19 capsule archives and `core_test.json`; total repository storage reported by the Hugging Face API is 1,341,517,176 bytes. The downloaded manifest SHA-256 is `ad09c0cc164fd6d73b3891e2c42e8e04eee28aed861cb5a8e57a2a9f74f668c5`.
- [Official corrected HAL harness](https://github.com/princeton-pli/hal-harness/tree/0dd6962c23147a11ee12751db85f28328dadd50f), branch `feat/corebenchv2-prefect`, commit `0dd6962c23147a11ee12751db85f28328dadd50f`. The authors' [analysis README](https://github.com/nnadgi01/corebench-analysis) points to this branch and calls the new split CORE-Bench Extended (OOD). The original CORE-Bench repository explicitly directs users to HAL and says its old harness is no longer actively maintained.
- Dataset [Croissant metadata](https://huggingface.co/datasets/agent-evals/core-bench-v1.1-ood/blob/00cfba0d8d83c093eac856f39b4f450a0c8aad9f/croissant.json) declares CC BY 4.0 for the benchmark metadata. Individual capsule source/data licenses must remain intact; that metadata declaration does not replace their licenses. The metadata citation still contains a TODO author field, so use the actual authors' published benchmark paper/repository citation rather than fabricating a completed BibTeX entry.

### Reproducible acquisition

These commands fetch official artifacts only. Extraction must validate archive member paths and links before placing them in an agent workspace.

```bash
git clone https://github.com/snap-stanford/MLAgentBench.git /tmp/repi-benchmark-preflight/MLAgentBench
git -C /tmp/repi-benchmark-preflight/MLAgentBench checkout 5d71205cc20a8e95d43aa7cb7120e89ca3323e31

git clone --branch feat/corebenchv2-prefect https://github.com/princeton-pli/hal-harness.git /tmp/repi-benchmark-preflight/hal-harness
git -C /tmp/repi-benchmark-preflight/hal-harness checkout 0dd6962c23147a11ee12751db85f28328dadd50f

curl -fL https://huggingface.co/datasets/agent-evals/core-bench-v1.1-ood/resolve/00cfba0d8d83c093eac856f39b4f450a0c8aad9f/core_test.json \
  -o /tmp/repi-benchmark-preflight/core_ood.json

for capsule in 8610546 8185407 5172670; do
  curl -fL "https://huggingface.co/datasets/agent-evals/core-bench-v1.1-ood/resolve/00cfba0d8d83c093eac856f39b4f450a0c8aad9f/capsules/capsule-${capsule}.tar.gz" \
    -o "/tmp/repi-benchmark-preflight/capsule-${capsule}.tar.gz"
done

gpg --batch --yes --passphrase reproducibility \
  --decrypt /tmp/repi-benchmark-preflight/hal-harness/hal/benchmarks/corebench.py.gpg \
  > /tmp/repi-benchmark-preflight/corebench-current.py
```

The decryption passphrase is publicly documented by HAL. It is a contamination deterrent, not a secret. **The manifest contains reference answers; the decrypted grader contains answer aliases/tolerances. Keep both outside all agent mounts, prompts, searches, and accessible filesystem paths.** Download and inspect them only in the evaluator environment.

## CORE-Bench tasks inspected

Original instructions and question keys are available in the pinned [manifest](https://huggingface.co/datasets/agent-evals/core-bench-v1.1-ood/blob/00cfba0d8d83c093eac856f39b4f450a0c8aad9f/core_test.json). A sanitized agent task must preserve those strings and omit every answer value.

| Capsule | Original requested execution | Questions | Compressed / expanded bytes | Source environment and concerns |
|---|---|---|---|---|
| `capsule-8610546` | Run `experiments.py` | `Report the cost for the optimal method.` | 245,065 / 351,926 | Python 3.8; NumPy 1.18.1, SciPy 1.4.1, Matplotlib 3.1.3 in original Dockerfile. README allows Python 3.5+, tested 3.7.3. MIT, Benjamin Gravell 2020. Main executes both the model-based experiment and a model-free network experiment with 10 trials and 5,000-step rollouts. The cost answer is written to a generated text table; preserve execution of the full original script. |
| `capsule-8185407` | From `data`, execute five scripts under `code`: `extract.py`, `eta_freq_sweep.py`, `power_sweep.py`, `merge_s1p.py`, `calc_power.py` | `Report the load power (Pload) for Transducer F from the measured data results. Ignore units.` | 1,497,753 / 4,345,623 | Original CodeOcean Miniconda Python 2.7.14 image with `mwavepy==1.5`; NumPy/SciPy/Matplotlib imports and CSV/Touchstone measurements. GPLv3 code, CC0 data. Dependency and Python-version repair are real task difficulties; replacing the calculation with a hand-built toy case would not be CORE-Bench. |
| `capsule-5172670` | Run `5.em_R.py` | `Report the accuracy of the analysis of the movie.` and `From the distribution of the HBF in the analysis of the movie, report the % positive.` | 64,224,995 / 74,051,909 | Python 3.8. Original environment pins NLTK 3.6.2, scikit-learn 0.24.2, gensim 4.0.1, pandas 1.3.2, Matplotlib 3.4.3, stanfordcorenlp 3.9.1.1, xlutils 2.0.0, xlrd 2.0.1, autocorrect 2.5.0. EM uses supplied preprocessed data; `tool.py` still imports broad NLP dependencies. MIT-style source license with Yili Fang/Ting Zhou attribution; bundled Stanford CoreNLP has separate GPL notices, and data has a separate license. |
| `capsule-9419423` | Run `RandomForest.py` | `Report the mean accuracy.` and `Report the mean F1 score.` | 401,156,698 / 701,805,395 | Useful ML expansion. CPU scikit-learn random forest with subject-wise GroupKFold and a precomputed feature-pickle requirement. README asks to generate features and specify data paths. NumPy/pandas/SciPy/statsmodels/PyYAML and additional plotting imports. MIT source, Zhe Yang 2022. More storage/preprocessing than the three initial tasks. |
| `capsule-0571975` | Run `satcom.py` with Python 3 | `Report the max gain % of planar IRS.` | 171,982 / 331,155 | CPU NumPy/SciPy/pandas/Matplotlib; GPLv2. Original NumPy 1.19.1 and pandas 1.1.1 avoid removed `np.complex` and `DataFrame.append`. Defaults MC=10 and Tpoints=500 over a very large reflecting surface. Despite its tiny archive, not a confidently short-runtime choice. README permits lowering parameters, but doing so changes the official computation and must be labelled an adaptation rather than the canonical task. |

Archive SHA-256 values:

```text
capsule-8610546  9bd241870521aa68e67aded4b18c54d05b9a9513b488efcd39d4159b20ebac1c
capsule-8185407  2d9ba605b5c36051896caedc555e8d330dd7bd0392c9d3e60813b79d8d0e9d0e
capsule-5172670  5cdc2c1c5fe33dca5221d9f19280322c6721dda11f779434df0448af346b0042
capsule-9419423  f493d6ac835155a9d2e0dd1d0b82e78ad94e1f61a13e1d4f3358af02fc7fbc67
capsule-0571975  09504b29fdea223da87ea2ef9067cc534ec2c59babe2afa91a0a1b21f6bb9466
```

### Canonical hard-task construction and grading

Use the pinned HAL `CoreBenchHard` task-construction/filtering logic, not the deprecated initial CORE grader. The hard prompt describes computational reproduction, includes the original task command and exact question keys, and instructs requirement installation. HAL strips existing `results/`, `REPRODUCING.md`, original `environment/`, `code/run.sh` or `code/run`, selected training-data files, cache directories, checkpoints, and Python caches. The parent evaluator must apply the entire upstream filter, preserve the ordinary README/source/data files, and start each attempt from a fresh identical workspace.

HAL's corrected private `__eval_result_json`:

- Parses answer dictionaries; normalizes numeric values and percent signs.
- Uses reference numeric runs to form a 95% Student-t prediction interval, then adds decimal-resolution tolerance and accepts boundary `numpy.isclose` matches.
- Applies capsule-specific string/list aliases and boolean-equivalent normalization.
- Returns written/vision question counts and correct counts; canonical whole-task success requires all questions correct.

For native ResearchPi, writing an `environment/report.json` artifact with exact question keys is a practical bridge to this grader. Keep canonical answer correctness separate from an additional execution audit: a memorized correct answer is not evidence the code actually ran. Save commands, stdout/stderr, exit status, changed files, generated result hashes and a clean replay. Do not expose the evaluator manifest or encrypted/decrypted grading module through ResearchPi's filesystem/web tools.

The original [CORE harness](https://github.com/siegelz/core-bench) uses privileged Docker for Docker-in-Docker at medium difficulty. That privilege is not necessary merely to perform a native hard task in a container, and an adapter should not inherit it without need. The current HAL branch expects capsule directories already present and skips missing ones; it does not reliably fetch only requested tasks automatically. Explicit pinned downloads avoid both silent omissions and old Princeton URL failures.

## MLAgentBench CPU feasibility

### `vectorization`: immediately manageable, but grader must be supplemented

The official [problem](https://github.com/snap-stanford/MLAgentBench/blob/5d71205cc20a8e95d43aa7cb7120e89ca3323e31/MLAgentBench/benchmarks/vectorization/scripts/research_problem.txt) asks to run the supplied `train.py`, then improve the NumPy convolution `forward` function by vectorizing the nested loops. The [input](https://github.com/snap-stanford/MLAgentBench/blob/5d71205cc20a8e95d43aa7cb7120e89ca3323e31/MLAgentBench/benchmarks/vectorization/env/train.py) is self-contained (NumPy plus Python standard library), with a random batch of shape `(32,64,64,3)` and a convolution layer with eight filters, kernel three, stride two and padding two. No data download, model weights, Kaggle consent or GPU is needed.

The official [grader](https://github.com/snap-stanford/MLAgentBench/blob/5d71205cc20a8e95d43aa7cb7120e89ca3323e31/MLAgentBench/benchmarks/vectorization/scripts/eval.py) reads a claimed time from the first column header of `submission.csv`; missing/invalid output returns `1e10`. **It does not verify numerical correctness or rerun the submitted code.** Keep that official score as a labelled metric, but separately remeasure wall time and compare the submitted `forward` output against immutable original code across multiple shapes, strides, padding settings, activation settings and random inputs. Timing the same workload on the same allocated CPUs avoids a fake speedup from changing the benchmark. Do not replace the task with synthetic loop code: use the original source and label supplementary checks as ResearchPi audits, not official MLAgentBench grading.

### Further original ungated tasks

- [CIFAR-10](https://github.com/snap-stanford/MLAgentBench/tree/5d71205cc20a8e95d43aa7cb7120e89ca3323e31/MLAgentBench/benchmarks/cifar10): original `torchvision.datasets.CIFAR10` download, small LeNet-style CNN and explicit CPU fallback; train at most ten epochs and emit probabilities for every test example. CPU-capable, but training and ten-seed reruns are substantially more expensive than vectorization. Official grader computes held-out class accuracy from `submission.csv`; the input script itself exposes test labels and evaluates them, so clean held-out rigor needs a separately labelled controlled variant. It must not be claimed the unmodified benchmark hides test labels.
- [OGBN-Arxiv](https://github.com/snap-stanford/MLAgentBench/tree/5d71205cc20a8e95d43aa7cb7120e89ca3323e31/MLAgentBench/benchmarks/ogbn-arxiv): ungated OGB download with an original explicit CPU fallback, but requires PyTorch Geometric/neighbor-sampling dependencies and sizeable graph training. Original maximum ten epochs. Better expansion once those dependencies are verified.
- [IMDb](https://github.com/snap-stanford/MLAgentBench/tree/5d71205cc20a8e95d43aa7cb7120e89ca3323e31/MLAgentBench/benchmarks/imdb): ungated Hugging Face data, but official task explicitly requires DistilBERT fine-tuning; a TF-IDF substitute would violate that task. CPU technically possible, not a short first-run target.
- CLRS requires JAX/Haiku/Optax and TensorFlow dataset machinery. BabyLM requires language-model training/evaluation. These are not minimal CPU preflight targets.
- House-price, spaceship-titanic, feedback, fathomnet, contrails and Parkinson tasks use Kaggle downloads and/or consent. Do not bypass competition agreements or silently substitute data. Their original preparation scripts require a Kaggle account and explicit competition consent.

## Fair comparison and limits

Freeze the same ResearchPi commit, prompt, native tools, sandbox, initial files, model endpoint, request/token limits, reasoning setting, CPU/memory caps and wall budget before comparing `deepseek-v4.1-flash` and `glm-5.3-flash` through OpenCode Go. Alternate model order per task/repetition. Never repair the task only for one model, replace a difficult official input, give one model precomputed outputs, or drop failures after seeing scores.

This first comparison can establish which model navigates these genuine reproduction/code tasks better **inside ResearchPi**. It cannot establish that ResearchPi beats Claude Code, Codex or OpenCode. Those require full-agent adapters and matched-task comparisons later. Three or four selected tasks also cannot support a full official leaderboard claim or a general autonomous-research claim.
