# Research Agent Index development calibration

RAI is a regularized, fixed-reference comparative rating, not percentage scientific correctness. The reference is 50. A display transform cannot manufacture differences in saturated evidence. Official scores and existing pilot receipts are preserved.

```bash
npm ci
npm run check
repi bench index --help
# Requires the prepared scientific CPU Docker runtime documented in ../official-bench/README.md.
repi bench index prepare --output .local-workspace/rai-dev --trials 1 --timeout 300
repi bench index run --dataset .local-workspace/rai-dev
```

`prepare` retrieves real Crossref bibliographic metadata and makes no inference calls. It creates five public development tasks with separate private mechanical reference values. `run` uses the existing OpenCode Go key on a host inference relay, and executes the full native ResearchPi CLI in fresh Docker containers. It incurs real account usage. The agent cannot access credentials, private references or the public internet. Budgets, image, inputs, task prompts, evaluation source and model configurations are frozen before calls. Every started attempt is retained; no selective retry replaces failures. Native retries remain visible in request receipts. A late session failure and a completed artifact are recorded separately.

The pack covers bootstrap regression with ten candidate training seeds and independent replay on perturbed data; grouped experiment design; clustered uncertainty and positivity-limited causal inference; real citation metadata auditing; and evidence-grounded writing with a results figure. These are locally authored development checks, not official full benchmark scores or independently validated research tasks. Four domains still require independent expert review. Automated checks verify JSON calculations and basic artifacts, not scientific originality, quality of arguments, graph readability or paper validity.

One task family per domain and one agent attempt per model are deliberately labeled feasibility calibration. They cannot yield a meaningful generalization interval or an established winning model. Ten experimental seeds differ from agent attempts and independent task families. Domain quality uses family-balanced means, and the rating gives repetitions no extra independent-family weight. Fitted ratings are regularized half-win-tie Bradley–Terry strengths; regularization, tie tolerance and weights are explicit protocol choices. Domain quality can reach 100. The rating approaches 100 for finite strengths, but this does not solve an easy or saturated test.

## Import a future preregistered study

Prepare protocol JSON conforming to `IndexProtocol` in `src/research-index.ts`, then freeze it. Evidence must conform to `IndexEvidence` with every rubric criterion, scientific integrity gate, assessment method and receipt/artifact digests.

```bash
repi bench index freeze --input protocol-draft.json --output protocol.json
repi bench index score --protocol protocol.json --evidence evidence.json --output index-report
```

Missing domains or attempts remain unranked. Development results have only a labeled development rating; the final `rai` field is null. Holdout results cannot publish final ratings until all required expert reviews include identity and blinded-review attestations. These attestations require an external audit; the software does not authenticate a reviewer's qualifications or independently certify research correctness. Review decisions can be rescored without more inference, preserving the original receipts and new evidence hash.

Intervals require at least three independent task families in every domain and two attempts per condition. They use a seeded, paired, domain-stratified family bootstrap and remain exploratory. A planned confirmatory superiority claim needs task/power planning, qualified independent grading, uncertainty and multiplicity-aware baseline comparisons. Same-model harness lift is reported only for identical provider/model/settings with different harnesses; it is a descriptive comparison, not an automatic significance claim. Stock product runs using different models are not a controlled harness comparison.

Raw model traces and source results stay in ignored private workspaces. Only reviewed aggregates should be exported publicly, without reusable reference answers. See the [index proposal](../../docs/research/research-agent-index-proposal.md).
