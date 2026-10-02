# Contributing to ResearchPi

Report reproducible bugs or discuss substantial changes in [Issues](https://github.com/rubenfb23/research-pi/issues). Small fixes can go directly to a pull request. Contributions to original ResearchPi code are made under the repository's MIT license; retain third-party notices and disclose the provenance of adapted material.

## Development

Use Node >=22.19, npm, and Python 3.14 with venv support for experiments:

```sh
npm ci
node repi setup --experiments
npm run check
node repi --project ./contributor-demo demo
node repi --project ./contributor-demo audit
```

Use a new project directory after code or dependency changes. Never discard failed receipts, rewrite measured metrics, or describe simulated model output as a real scientific response. Do not commit credentials, `.env` files, conversations, local experiment state, or generated installers.

## Architecture

| Location | Responsibility |
| --- | --- |
| `repi`, `src/cli.ts`, `src/chat.ts` | Startup, command interface, and interactive conversation |
| `src/connections.ts` | Provider setup and local credential handling |
| `src/tools.ts` | Bounded authority granted to the model |
| `src/protocol.ts`, `src/experiments.ts`, `python/experiment.py` | Protocol validation, execution, metrics, and evidence |
| `src/science.ts`, `resources/library/` | Scientific library and causal planning |
| `src/papers.ts` | Outlines, drafts, and claim provenance |
| `scripts/package-native.mjs`, `.github/workflows/` | Native installers and release checks |

To add an experiment, update the bounded protocol schema, Python worker, prediction validation, metrics, and incompatibility tests together. Do not silently relax the ten-seed policy or convert local integrity checks into claims of scientific validity.

Scientific notes require authors, URL/DOI, the section actually read, edition/date, scope, limitations, and a distinction between the source's recommendation and your interpretation. Mark material verified only after reviewing the cited passage. Summarize with attribution; do not copy whole books or papers. Venue profiles must identify the year and track and link to official sources.

## Pull requests

Create a topic branch and describe the problem, resulting behavior, and relevant verification. `main` requires a pull request, passing scientific and four native installer checks, resolved conversations, and an up-to-date branch. These rules also apply to administrators. No mandatory external approval is configured while the repository has a single maintainer; review is still encouraged. Force pushes and deletion of `main` are blocked.

Native packages are checked on GitHub runners; local packaging requires the matching OS and builder. See [installation](docs/installation.md) and [release process](docs/releases.md). Tests use offline model transport; provider authentication and live inference require separate evidence.
