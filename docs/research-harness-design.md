# Research harness on Pi: initial design

Confirmed scope: machine learning, AI and computer science. Prepared on 2026-10-02. This is the English translation of the original architecture and acceptance proposal, not independent proof of implementation. The proposed name was **ResearchPi**, with repository `research-pi`; the remote did not yet exist at the time of the proposal. See [implementation status](status.md) for current results.

## Pi reuse and licensing

Pi's reviewed license is MIT, copyright Mario Zechner. It permits use, modification and distribution while requiring preservation of copyright/license notices in copies or substantial portions. It does not require a fork or publication of original application code. Prefer an independent repository using the SDK; fork the core only when a required change belongs there. ResearchPi's own license can be chosen independently. [Pi license](https://github.com/earendil-works/pi/blob/main/LICENSE), [MIT terms](https://choosealicense.com/licenses/mit/).

Preserve Pi's license in third-party notices when redistributing and review licenses of actual bundled dependencies. Papers, datasets, weights and library documents retain their own rights; Pi's license grants no rights over them.

## Objective and components

Convert a scientific question into an explicit protocol, execute or coordinate experiments, retain evidence and help write a paper traceable to that evidence. Apply user policies, consult a curated scientific library and adapt procedures to the study and venue.

Use `@earendil-works/pi-coding-agent` with selected resources and tools. Pi provides sessions, models, extensions and resource loading; ResearchPi supplies scientific protocols and verification. A Pi package could first test resources before a custom interface. [SDK](https://pi.dev/docs/latest/sdk), [Pi packages](https://pi.dev/docs/latest/packages).

| Component | Responsibility | Verifiable artifact |
| --- | --- | --- |
| Policies | Laboratory rules, venue requirements and completion criteria | Versioned configuration and exception records |
| Library | Primary sources, original notes, expert guidance and venue profiles | Authored document with source, date, scope and version |
| Protocols | Conditional steps for scientific tasks | Plan with inputs, assumptions, methods and exit criteria |
| Tools | Experiments, analysis, retrieval and writing | Records, data, tables and references |
| Verification | Automatic checks and scientific review | Report separating mechanical compliance from pending judgment |

These research capabilities must be implemented on Pi; they are not a finished scientific product supplied by Pi itself.

## Policies and verification

Separate three levels:

1. Code-verifiable rules: seed counts/uniqueness, compatible configurations, completed runs, resolvable references, existing results and recalculable tables.
2. Reasoning-dependent protocols: metric selection, suitable baselines, causal identification, methodology quality and generalization limits.
3. Personal preferences: style, language, folder organization and presentation.

Mechanical failures can block verified status. An automatic report does not establish scientific validity: an assumptions field does not prove those assumptions are defensible.

User policies and external requirements retain provenance. Report conflicts rather than silently changing a policy. Session-learned changes remain proposals until incorporated into stable policy by the user. The subsequent product language decision sets English as the interface and default output language.

## The ten-seed rule

The requested policy is **ten distinct, predefined seeds per stochastic experimental configuration**, including stochastic primary baselines. Theory or deterministic analyses must justify non-applicability rather than fabricate identical repetitions. Reducing the count requires an explicit user exception.

State which factors vary: initialization, minibatch order, sampling, environment, split or their combination. Separate training seeds from data/split seeds. Paired comparisons require comparable conditions and splits; sharing an integer does not establish pairing by itself.

Retain each seed, configuration, code/data version, environment, state, metrics and artifacts, including failures and retries. Report coverage without silently dropping failures or selecting the best runs.

Ten seeds are a user policy, not a universal conference rule. NeurIPS asks authors to explain variability, uncertainty and conditions but does not impose this count. Training repeats are not independent new population samples; intervals must state the uncertainty they describe. [NeurIPS checklist](https://neurips.cc/public/guides/PaperChecklist).

Fixed seeds do not guarantee identical outcomes across devices, platforms or versions. Record libraries, hardware and nondeterministic operations. [PyTorch reproducibility](https://docs.pytorch.org/docs/stable/notes/randomness.html).

## Initial protocols

### ML experiments

Question/hypothesis → data/splits → primary metric → baselines and comparable budgets → ten-run design → preflight validation → execution → aggregation → justified ablations → bounded interpretation.

Freeze configuration before confirmatory evaluation. Changes to hypotheses, metrics or selection after seeing results are exploratory. Do not select hyperparameters on test data. Fit learned transformations on the corresponding training data, including inside each fold. [scikit-learn pitfalls](https://scikit-learn.org/stable/common_pitfalls.html).

Classification, regression, RL, LLMs, vision, NLP and systems need different protocols. Ten seeds do not replace suitable datasets, evaluation units, metrics or controls.

### Causal analysis

Before selecting a library or estimator:

1. Define intervention/exposure, outcome, population, time horizon and target effect.
2. Specify study design, domain knowledge and assumptions; use a DAG or suitable representation.
3. Determine whether the effect is identifiable from those data and assumptions.
4. Choose compatible estimation, diagnose design issues and quantify uncertainty.
5. Perform relevant sensitivity and robustness analyses.
6. Bound conclusions by assumptions and evidence.

This adapts DoWhy's separation of modeling, identification, estimation and refutation. Automation must be able to report non-identifiability rather than invent a causal estimate. Robustness checks do not prove every assumption. [DoWhy](https://www.pywhy.org/dowhy/main/user_guide/causal_tasks/estimating_causal_effects/index.html).

Curate chapter-specific notes from Hernán and Robins' *Causal Inference: What If*, recording which recommendations apply to each study class. [Authors' website](https://miguelhernan.org/whatifbook).

### Papers and methodology

Provide an adaptable empirical ML outline: title, abstract, introduction, related work, problem formulation, method, evaluation, discussion, limitations, conclusions, references and appendices. Theory, dataset, systems and survey papers need different profiles.

Build methodology from the protocol and actual records: data, preprocessing, splits, algorithm/architecture, training, hyperparameter search, selection, baselines, seeds, metrics, uncertainty, resources and reproduction. Distinguish planned from executed work.

Link each key claim to a table, figure, proof or reference. Flag unsupported numbers and unverified references; never fill nonexistent results. Editorial review checks whether the question, contribution and evidence form a clear argument. Mensh and Kording provide initial attributed writing guidance. [Article](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1005619).

## Scientific library and experts

Each note retains author, title, URL/DOI, edition/date, source section, original summary, extracted guidance, use cases, limitations, conflicts and last review. Separate source content, interpretation and laboratory policy.

A methodology question retrieves relevant notes and compares them with the study protocol. Load relevant material on demand; begin with lexical search and topic indexes and add semantic retrieval when scale justifies it. Pi's on-demand skills fit this design. [Pi skills](https://pi.dev/docs/latest/skills).

Add attributable documents rather than unchecked expert quotations. A new trained model is not required to consult the library; this does not guarantee correct reasoning from it.

## Conferences and journals

An initial catalog can start with NeurIPS, ICML, ICLR, JMLR and TMLR, then grow by subfield. Distinguish venue, year/edition, track and article type.

Record topic scope, audience, contribution types, official template, length, anonymity, checklist, code/data/artifact policy, AI use, dates, official sources and verification date. Recheck deadlines, fees and submission rules before recommendations or submission preparation.

Explain contribution/venue fit without promising acceptance. Start with limited coverage and add theory, systems and software profiles as projects require them. Initial sources: [NeurIPS](https://neurips.cc/public/guides/PaperChecklist), [TMLR](https://jmlr.org/tmlr/author-guide.html), [ACM artifact policy](https://www.acm.org/publications/policies/artifact-review-and-badging-current).

## Recommended implementation

Use a TypeScript controller with Pi and Python tools for scientific methods. These are application design choices, not requirements imposed by Pi.

Initial tools: source search, note retrieval, protocol creation/validation, ten-seed planning, run execution/status, metric aggregation, reference checks, paper outlining and verification reporting.

The launcher explicitly selects tools/resources. For strict controls, keep executions and receipts outside unrestricted model writing through append-only records or separate permissions. Ten agent-fabricated files do not prove ten experiments. Pi offers extension/configuration mechanisms; ResearchPi must implement its extra integrity boundary. [SDK](https://pi.dev/docs/latest/sdk), [Pi security](https://pi.dev/docs/latest/security).

Track question, literature, protocol, experiments, results, manuscript and audit with transitions and evidence. Code, data or protocol changes invalidate affected checks.

## First version and acceptance criteria

Begin with one empirical ML workflow, ten-seed policy, basic causal protocol, curated initial library and two checked venue profiles. Keep modules extensible for RL, LLM evaluation, datasets and systems.

Demonstrate that the system:

- Detects nine required runs and duplicate seeds.
- Rejects incompatible configurations and preserves failed-run history.
- Recalculates tables from records and distinguishes uncertainty types.
- Requires strategy and assumptions before treating causal conclusions as supported.
- Separates verified/pending references and measured/planned numbers.
- Preserves protocols/evidence through resume and compaction.
- Detects changes invalidating earlier audits.

Test with a small reproducible synthetic study and deliberately incomplete cases. Scientific review remains distinct from these mechanical checks.
