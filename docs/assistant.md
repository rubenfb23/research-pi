# ResearchPi 1.0 assistant contract

The assistant combines a curated ML/AI/CS system prompt, Pi's provider adapters, persistent conversations and host-validated scientific tools. Version 1.0.0 defines this CLI and research workflow; the supported experiment runner is documented separately and has a specific execution scope.

## Interaction

A greeting receives a short greeting and invitation to discuss the research question. The model applies scientific protocols to relevant tasks rather than listing every policy at startup. English remains the response language. Existing session history is preserved: previous assistant messages can still influence a model, so evaluate the new greeting in a fresh project when comparing prompts.

The terminal streams answers immediately on stdout. Provider-exposed reasoning or summaries appear separately on stderr, followed by answer and tool activity blocks. ResearchPi does not request or fabricate hidden reasoning. Model/provider support determines what is visible. Terminal control sequences from streamed content are filtered, including sequences split across chunks. Colors require a capable terminal and respect `NO_COLOR` and `TERM=dumb`.

`/thinking` shows supported effort levels; `/thinking medium` selects a supported level. Default effort is medium on reasoning models and off on other models, subject to SDK clamping. `/reasoning on` and `/reasoning off` control display independently of computation. Preferences are stored in project `.research-pi/ui.json`, preserved on resume, and applied after switching models. Reasoning can include sensitive research context; hide its display when recording terminal sessions if appropriate.

## Research behavior

- Experiments: formulate question/hypothesis, select baselines and evaluation, prevent leakage, prespecify ten distinct training seeds per stochastic configuration, separate seed roles, freeze before confirmatory execution, retain failures and deviations, and aggregate measured evidence.
- Causality: define estimand and population, state graph/assumptions, establish identification, choose a compatible estimator, plan uncertainty/sensitivity, and bound conclusions. Plan completeness is checked mechanically; it is not proof of identification.
- Literature: retrieve attributed notes when relevant, distinguish source claims from inference, disclose missing external verification, and keep citation identity and scope explicit.
- Papers: adapt empirical/theory/dataset/systems/survey structure; write methodology from the design and executed work, link results to audited artifacts, and verify current official venue requirements.

See [system.md](../resources/system.md) for the authoritative instructions and [status](status.md) for tested execution scope. Editing that file changes the prompt loaded by new sessions without forking Pi. Keep workflow references tied to tools the host actually registers. The model may propose methods/code beyond the runner's scope, but must distinguish proposals from execution.

## Verification boundary

Automated tests verify SDK prompt loading, streaming before completion, reasoning/answer channel separation, terminal control filtering, persistent effort/display settings, model selection and existing scientific integrity checks. Scripted transport does not evaluate scientific judgment or guarantee model compliance. The basic live Go text check is documented in [OpenCode](opencode.md); systematic prompt evaluations across research tasks and providers remain future work.
