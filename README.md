# ResearchPi

[![Checks](https://github.com/rubenfb23/research-pi/actions/workflows/check.yml/badge.svg)](https://github.com/rubenfb23/research-pi/actions/workflows/check.yml)
[![Native installers](https://github.com/rubenfb23/research-pi/actions/workflows/packages.yml/badge.svg)](https://github.com/rubenfb23/research-pi/actions/workflows/packages.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**A research harness for machine learning, AI, and computer science, built on the [Pi SDK](https://github.com/earendil-works/pi).**

Start a research conversation with `repi`, run reproducible experiments, and connect measured results to manuscript drafts. ResearchPi combines an interactive assistant with bounded scientific tools and persistent experiment evidence.

The experiment runner currently supports synthetic binary classification with logistic SGD and random forest. Causal protocols guide and validate planning; they do not execute causal estimators. Basic live chat has been verified with OpenCode Go (`glm-5.3-flash`); provider/model coverage and scientific reasoning quality remain limited. See [verification status](docs/status.md) for the evidence and limitations.

## Install

Download a native installer from [GitHub Releases](https://github.com/rubenfb23/research-pi/releases). Each package includes Node.js, the compiled CLI, scientific resources, production dependencies, and license notices.

| Platform | Package | Architecture |
| --- | --- | --- |
| Ubuntu / Debian | `.deb` | x64 |
| Windows | `.exe` | x64 |
| macOS | `.pkg` | Apple Silicon (arm64) and Intel (x64) |

On Ubuntu / Debian, install the downloaded package:

```sh
sudo apt install ./research-pi_<version>_amd64.deb
```

On Windows and macOS, open the installer. Open a new terminal afterwards:

```sh
repi --help
repi
```

The installers are currently unsigned; macOS packages are not notarized. Python **3.14** with venv support is required only for experiments and must be installed separately. See the [installation guide](docs/installation.md) for requirements, data locations, checksums, and uninstall instructions.

### Install from source

Requires Node.js **22.19 or later** and npm:

```sh
git clone https://github.com/rubenfb23/research-pi.git
cd research-pi
npm run install:cli
repi
```

This links `repi` into your npm prefix. Keep the checkout in place and ensure the prefix's executable directory is on your PATH. You can also launch directly with `node repi` or `npm start`. The former `research-pi` command remains a compatibility alias. The project is not published to npm.

## Connect a model

The first launch offers connection setup and remembers the selection. You can also choose explicitly:

```sh
repi connect codex
# or:
repi connect claude
repi connect openai
repi connect opencode
repi connect opencode-go
```

| Connection | Authentication | Status |
| --- | --- | --- |
| `codex` | Sign in with ChatGPT through Pi's OpenAI provider | Access depends on your account, authorization, and model; real-account inference is pending verification. |
| `claude` | Anthropic API key | API billing applies; Claude Pro/Max subscription login is not implemented. |
| `openai` | OpenAI API key | API billing applies; shares the provider credential entry with `codex`. |
| `opencode` | OpenCode Zen API key | Uses Pi's native OpenCode gateway adapters; account access and API billing apply. |
| `opencode-go` | OpenCode Go API key | Uses the Go endpoint and plan; intended for coding-agent traffic, subject to account limits. |
| `offline` | None | Deterministic harness testing; no scientific reasoning or model inference. |

`codex` connects to OpenAI through the SDK; it does not launch the Codex CLI. See [connections and credentials](docs/connections.md) for provider documentation, storage, and recovery. See the [OpenCode guide](docs/opencode.md) for Zen/Go configuration and verified scope.

```sh
repi chat 'Help me design a reproducible classification experiment'
repi models claude
repi --project ./my-study
repi --offline
```

### A terminal built for research

Version **1.0.0** adds a colored, responsive terminal with streamed answers, a separate provider reasoning stream, and visible tool activity. It uses a scrolling conversation so evidence stays in your terminal history. Colors are disabled for redirected output, `NO_COLOR`, or `TERM=dumb`.

```text
────────────────────────────────────────────────────────────
  ResearchPi  v1.0.0 · ML / AI / Computer Science

  Model      opencode-go/glm-5.3-flash
  Project    /path/to/my-study
  Reasoning  medium · stream on

  /help commands   /model select model   /exit quit
────────────────────────────────────────────────────────────
repi ❯ Help me design an ablation study
```

Use `/model` to open the picker, `/model <id>` to switch directly, and `/models` to inspect the catalog. `/thinking low` adjusts reasoning effort; `/thinking` shows the levels available for your model. `/reasoning off` hides the reasoning stream without disabling model reasoning. These settings persist per project. The default effort is `medium` on reasoning models and `off` on other models. Providers may expose reasoning text or summaries, or no visible reasoning at all; ResearchPi displays only what they send. Higher effort can increase latency and usage.

Other commands: `/help`, `/status`, `/connect`, `/compact`, `/exit`. Ctrl+C cancels an active response. Ctrl+D or `/exit` closes the session. Answers go to stdout; reasoning and tool activity go to stderr, so `repi chat 'question' > answer.md` captures the answer. Hide reasoning in chat first if you do not want it in terminal logs.

The [curated research instructions](resources/system.md) apply ten-seed experiment policy, causal identification order, source attribution, methodology and paper workflows when relevant. Greetings stay brief; research tasks receive the detail they need. See the [assistant contract](docs/assistant.md).

## Reproduce the experiment demo

With Python 3.14 available, no model account is required:

```sh
repi --project ./demo-study demo
repi --project ./demo-study audit
repi --project ./demo-study aggregate
```

The demo runs **20 real CPU fits: two configurations × ten distinct training seeds**. Data-generation and split seeds remain fixed. ResearchPi creates the isolated Python environment and installs the pinned scientific dependencies when needed.

The project stores its evidence under `demo-study/.research-pi/`:

| Output | Purpose |
| --- | --- |
| `protocol.json` | Frozen experiment design and code fingerprint |
| `runs/`, `artifacts/`, `journal.jsonl` | Attempt history, predictions, measurements, and integrity links |
| `results.csv`, `aggregate.json` | Means and sample standard deviations linked to receipts |
| `audit.json` | Completeness and integrity checks |
| `paper.md`, `paper-manifest.json`, `paper-review.json` | Draft manuscript and numerical provenance review |

`demo` resumes completed work. Use a **new project directory** to reproduce from scratch or after changing code or dependencies; existing evidence is retained and audited against its original fingerprint. Seed variation describes training variability on a fixed dataset and split, not a population confidence interval. Hashes detect inconsistencies; they do not certify scientific validity or protect against a user rewriting all local evidence.

## Scientific tools

```sh
repi search 'writing a methodology'
repi protocol experimental
repi protocol causal
repi protocol methodology
repi venues
repi outline --type theory
repi causal --file examples/causal-incomplete.json
repi review-manifest --file examples/manuscript-pending.json
```

- **Experiments:** frozen protocols, ten distinct training seeds per configuration, pinned environments, explicit retries, prediction-derived metrics, and traceable aggregation.
- **Scientific library:** attributed summaries and source links with scope, verification metadata, and Spanish/English lexical search.
- **Causal planning:** structured protocols and missing-field checks. Estimation and identification assessment remain future work.
- **Papers:** empirical, theory, dataset, systems, and survey outlines; methodology and results drafts; evidence-linked numerical claims.
- **Venues:** initial, edition-specific profiles for NeurIPS and TMLR. Coverage is partial; recheck current official requirements before submission.

The last two examples intentionally exit with status `1` to report missing information. A complete causal form is ready for human review, not a certification of identification or causality.

The assistant receives bounded tools; it has no arbitrary shell or unrestricted file-writing tool. See [integrity and dependency limits](docs/integrity.md). An upstream Pi transitive dependency advisory remains documented; the project does not claim a clean dependency audit.

## Development and contributions

```sh
npm ci
node repi setup --experiments
npm run check
node repi --project ./dev-demo demo
node repi --project ./dev-demo audit
```

Tests exercise the SDK with a simulated transport and run real scikit-learn experiments without paid APIs. Native CI additionally installs, exercises, and removes packages on Linux, Windows, and both macOS architectures. Published releases run scientific and installer checks before uploading packages and SHA-256 checksums.

Read [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow, scientific resource requirements, and architecture. Bug reports and feature proposals are welcome in [Issues](https://github.com/rubenfb23/research-pi/issues). Release maintainers should follow the [release guide](docs/releases.md). Security concerns can be reported through [GitHub private vulnerability reporting](https://github.com/rubenfb23/research-pi/security/advisories/new); see [SECURITY.md](SECURITY.md).

## Documentation

- [Installation and platform support](docs/installation.md)
- [OpenCode Zen and Go](docs/opencode.md)
- [Model connections and credentials](docs/connections.md)
- [Verified capabilities and remaining work](docs/status.md)
- [Integrity model and dependency advisory](docs/integrity.md)
- [Research harness design](docs/research-harness-design.md)
- [Third-party notices](THIRD_PARTY_NOTICES.md)

The interface, documentation, scientific notes, paper templates and default generated content are in English. Scientific search also recognizes selected Spanish query terms; user-supplied text and existing evidence are preserved.

## License

Original ResearchPi code is released under the [MIT License](LICENSE), copyright © 2026 Ruben Fernandez Boullon.

ResearchPi uses Pi as an SDK dependency and does not fork its core. Pi's MIT notice is preserved in [docs/Pi-LICENSE.txt](docs/Pi-LICENSE.txt). Bundled runtimes and dependencies retain their own notices. Scientific publications, datasets, and other referenced material retain their respective rights; ResearchPi's license does not grant rights over them. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
