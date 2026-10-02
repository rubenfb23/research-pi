# Codex implementation brief: ResearchPi

Build ResearchPi, a research harness for machine learning, AI and computer science, in the owner's `research-pi` repository. Use the accompanying [research harness design](research-harness-design.md) as the product specification. Keep both documents in `docs/`.

Deliver executable, tested software in milestones. The general design describes the destination; the milestones define implementation order. Document actual capability status and any limitation preventing an acceptance criterion from being met. This is the English translation of the original brief; later implementation decisions are recorded in [status.md](status.md).

## Before implementation

Inspect existing repository files and instructions and preserve the user's work. If the repository does not exist, prepare a local `research-pi` directory. GitHub creation/publication depends on session access and the user's visibility choice; do not present local files as published.

Use `@earendil-works/pi-coding-agent` as an SDK dependency in an independent repository. Read documentation for the selected published version, pin it and record the lockfile. Implement control and extensions in TypeScript; use Python for experiments and scientific analysis where appropriate.

Pi is MIT licensed. Preserve its copyright/license notices and notices for adapted code; record attribution in third-party notices. Retain any license already chosen for ResearchPi. If none is selected, record MIT as a proposal rather than a requirement imposed by Pi. Explain a missing SDK capability before turning the product into a core fork. [Pi license](https://github.com/earendil-works/pi/blob/main/LICENSE), [SDK](https://pi.dev/docs/latest/sdk). ResearchPi subsequently adopted MIT in 0.2.1.

## Milestone 1: actual Pi integration

Implement a custom CLI, provider/model configuration, explicit scientific resource loading and persistent sessions. Keep scientific project state separate from conversation state: compaction must not lose protocols, runs or evidence.

Provide installation, configuration, usage and verification commands in the README. Default tests use simulated provider transport. Separately document real-provider checks when credentials are available; never invent live integration results.

Acceptance: a runnable CLI, loaded scientific resource and resumable session preserving project state. Simulated tests must pass; real-provider verification must be recorded as completed or pending with its reason.

## Milestone 2: a complete ML experiment

Implement a structured protocol containing question, hypothesis, datasets and splits, metrics, methods, hyperparameters, budget, ten distinct seeds and an uncertainty plan. Freeze the protocol version before execution.

Build a runner, execution registry and aggregator. Retain configuration, seed, code/data/environment version, state, metrics and artifacts. Represent failures and retries explicitly. Verify ten seeds per stochastic configuration and compatibility with the same protocol. When seeds do not apply, record why. Reducing the required count needs an explicit user exception.

Include a small synthetic classification demo with reproducible splits and two stochastic methods trained ten times each on CPU. Calculate metrics, dispersion and tables from actual runs. Explain the measured variability; any interval requires a suitable documented method and assumptions.

Acceptance: twenty real runs produce records, an aggregate table and a compliance report that can be recalculated independently of model-generated prose.

## Milestone 3: scientific library and protocols

Add original documents with author, URL/DOI, date, scope and source section; lexical and topic retrieval; and protocols for experimental design, methodology and causal analysis. Distinguish user policy, publication requirements and sourced guidance.

Causal protocols require a target effect, assumptions, identification, estimation and robustness. Produce bounded conclusions or insufficient-information states as appropriate. Distinguish field completion from scientific justification.

Acceptance: test queries retrieve relevant sources with provenance; an incomplete causal request identifies missing requirements before presenting a result as supported.

## Milestone 4: papers, venues and traceability

Implement extensible profiles by paper type and venue/year/track. Start with two profiles checked against official instructions. Record verification dates and flag information that can become stale.

Generate outlines and methodology from the protocol and actual execution. Link key numbers and claims to tables, figures, proofs or references. Unverified references remain pending; nonexistent results remain planned work.

Acceptance: the demo generates a draft with traceable methods/results and a missing-items report distinguishing automatic checks from pending scientific review.

## Required tests

- Nine seeds, duplicate seeds and failed runs cannot obtain complete status.
- Incompatible configurations or changed protocols invalidate affected aggregation/auditing.
- Recalculated tables match original records.
- Unverified references and unsupported numbers remain pending.
- Resume and compaction preserve persistent scientific state.
- Cancellation leaves recoverable state without marking a run complete.
- The library preserves recommendation provenance.

For strict integrity, the runner must generate records outside unrestricted model editing. Document the implemented boundary: an agent-editable results folder is not tamper-resistant evidence.

## Delivery

After each milestone, run relevant checks and fix failures before advancing. Maintain `docs/status.md` with verification, decisions and remaining work. CI must check locally without paid API consumption or credentials. Keep secrets, private datasets and large results out of Git.

Deliver reproduction commands, verified capabilities, limitations and actual GitHub publication status. A capability is not implemented merely because an instruction or screen mentions it.

The brief follows official guidance on milestones and validation for sustained work: [OpenAI long-horizon tasks](https://developers.openai.com/blog/run-long-horizon-tasks-with-codex).
