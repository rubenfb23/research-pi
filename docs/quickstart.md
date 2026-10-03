# Quickstart

Install a [native package](installation.md) or clone the repository and run `npm run install:cli` with Node.js ≥22.19. Keep a source checkout in place if using the global source link.

## Start a conversation

```sh
repi
```

Choose a connection and model. Model access and account billing depend on the provider; configured credentials alone are not a successful inference check. Use `/model`, `/help`, `/new`, `/chats` and `/copy`. Tab completes commands; arrows navigate input history. Native Markdown and supported math delimiters are rendered in the terminal. [Terminal and conversations](pi-features.md), [connections](connections.md).

```sh
repi doctor
repi --project ./my-study
repi chats list --all
```

The doctor inspects prerequisites; it does not make a model request or read your clipboard.

## Produce evidence without a model account

Install Python 3.14 with venv support, then:

```sh
repi --project ./wisconsin-study demo --dataset breast-cancer
repi --project ./wisconsin-study audit
repi --project ./wisconsin-study aggregate
```

The first execution prepares pinned scientific dependencies. Expect twenty fits and an audit reporting `complete`. Inspect `wisconsin-study/.research-pi/results.csv`, `aggregate.json`, `runs/`, `artifacts/`, `protocol.json` and `paper.md`. A paper scaffold remains pending scientific/editorial review.

A completed directory resumes its existing runs. Use a new directory after code/dependency changes. Training seeds describe training variability on the fixed split; they do not establish sufficient power or population generalization.

Continue with [CSV/custom methods, references and papers](workflows.md). If setup fails, consult [installation](installation.md), [OpenCode](opencode.md), [clipboard](clipboard.md) and [verification status](status.md).
