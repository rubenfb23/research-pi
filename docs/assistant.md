# ResearchPi assistant contract

The assistant combines a curated ML/AI/CS system prompt, Pi's provider adapters, persistent conversations and host-validated scientific tools. Version 1.4.0 adds the full native Pi interface and conversation manager; the supported experiment runner is documented separately and has a specific execution scope.

## Interaction

A greeting receives a short greeting and invitation to discuss the research question. The model applies scientific protocols to relevant tasks rather than listing every policy at startup. English remains the response language. Existing session history is preserved: previous assistant messages can still influence a model, so evaluate the new greeting in a fresh project when comparing prompts.

In simple mode, the terminal streams answers immediately on stdout. Native mode uses Pi’s complete renderer, editor, model/settings menus and provider reasoning controls. Provider-exposed reasoning or summaries appear separately on stderr, followed by answer and tool activity blocks. ResearchPi does not request or fabricate hidden reasoning. Model/provider support determines what is visible. Terminal control sequences from streamed content are filtered, including sequences split across chunks. Colors require a capable terminal and respect `NO_COLOR` and `TERM=dumb`.

`/thinking` shows supported effort levels; `/thinking medium` selects a supported level. Default effort is medium on reasoning models and off on other models, subject to SDK clamping. `/reasoning on` and `/reasoning off` control display independently of computation. Preferences are stored in project `.research-pi/ui.json`, preserved on resume, and applied after switching models. Reasoning can include sensitive research context; hide its display when recording terminal sessions if appropriate.

## Keyboard editing and input history

Version 1.1.0 adds native readline editing, Tab completion, double-Tab candidate lists, and ↑/↓ history navigation. Completion covers slash commands, provider IDs, the active SDK model catalog and model-supported reasoning levels; pickers complete their own choice IDs. A typed prefix filters ↑/↓ history and is restored when returning to the draft. Ctrl+U clears the current input. The prompt is redrawn correctly during editing and terminal resize.

Only submitted interactive chat input enters history. The latest 500 distinct entries are restored per project from `.research-pi/input-history.json`, created atomically with mode 0600 on POSIX inside the private project state directory. Setup and hidden credential input have no history or completion access. Leading whitespace opts a line out of input history; it remains part of the submitted conversation. Piped input is excluded. The history is plaintext research context and is ignored by Git with the other project state. Corrupt history does not block startup; valid new input recovers it.

The implementation uses the documented [Node 22 readline completion and history APIs](https://nodejs.org/docs/latest-v22.x/api/readline.html). Tests distinguish actual Tab keystrokes from pasted tab characters, which readline intentionally treats differently. No shell command is executed by completion.

## Research behavior

- Experiments: formulate question/hypothesis, select baselines and evaluation, prevent leakage, prespecify ten distinct training seeds per stochastic configuration, separate seed roles, freeze before confirmatory execution, retain failures and deviations, and aggregate measured evidence.
- Causality: define estimand and population, state graph/assumptions, establish identification, choose a compatible estimator, plan uncertainty/sensitivity, and bound conclusions. Plan completeness is checked mechanically; it is not proof of identification.
- Literature: retrieve attributed notes when relevant, distinguish source claims from inference, disclose missing external verification, and keep citation identity and scope explicit.
- Papers: adapt empirical/theory/dataset/systems/survey structure; write methodology from the design and executed work, link results to audited artifacts, and verify current official venue requirements.

See [system.md](../resources/system.md) and [manuscript-policy.md](../resources/manuscript-policy.md) for the authoritative instructions, and [status](status.md) for tested execution scope. The bundled research, manuscript and web resources are composed into every session's system prompt, including resumed conversations, without forking Pi. Restart `repi` or use `/reload` after editing these resources. Keep workflow references tied to tools the host actually registers. The model can implement and execute requested code with native file/shell tools, while distinguishing actual measurements from proposals and the bounded runner audit.

## Manuscript policy

Version 1.2.0 loads a mandatory English editorial policy in all projects and providers. It applies implicitly when drafting or reviewing manuscripts, rather than announcing rules or adding a checklist to greetings. The policy covers consistent contribution statements in the abstract, introduction and conclusion; an introduction roadmap; impersonal prose; explained concepts and acronyms; venue-adapted sections; clear figures, tables and captions; print/grayscale checks; and primary, recent, relevant references. It avoids em dashes in generated prose while preserving scientific identifiers and quoted evidence.

Limitations are concise and constructive but retain facts that affect interpretation. Novelty must be supported rather than invented. Venue requirements can override layout defaults. Bibliographic verification requires retrieved DOI/publisher metadata or a credible record for works without DOIs; initials are permitted only when identity remains consistent. Version 1.3.0 provides direct web retrieval, local browser tools and Crossref discovery for collecting actual source evidence. Its curated-note manifest check still does not automatically validate title, authors, journal, volume or pages. Compare retrieved records explicitly and retain unresolved fields; retrieval alone does not certify a reference.

The empirical outline and evidence scaffold follow the section defaults, introduce table terms before the table, and leave novelty and editorial completion explicitly pending. This is not automatic manuscript certification. See the [integration study](research/manuscript-policy-integration.md) for primary-source rationale and the policy's scientific boundaries.

## Verification boundary

Automated tests verify SDK prompt loading, streaming before completion, reasoning/answer channel separation, terminal control filtering, persistent effort/display settings, model selection and existing scientific integrity checks. Scripted transport does not evaluate scientific judgment or guarantee model compliance. The basic live Go text check is documented in [OpenCode](opencode.md); systematic prompt evaluations across research tasks and providers remain future work.

## Local web tools 1.3.0

The host registers direct reading, local browser navigation, paper discovery, public search and source recovery as SDK tools. The [web workflow](../resources/web-policy.md) is always loaded alongside the research and manuscript policies. Source text is untrusted evidence, and pages cannot replace the host instructions. A blocked search is not proof that literature is absent. Check status, completeness, metadata scope and original sources before citing. [Web setup and execution scope](web.md).

## Native Pi interface 1.4.0

The native terminal is now the default for interactive input/output. `/new`, `/chats`, `/resume`, `/name`, `/fork`, `/clone` and `/tree` manage conversations. The runtime recreates project-bound tools and resources on a cross-project switch. Ctrl+T controls provider reasoning, `/settings` selects themes and context/retry settings, Enter steers a response, and Alt+Enter queues a follow-up. Native settings and history follow Pi's persisted conventions. The sections describing readline and `.research-pi/ui.json` above apply to `--plain`, which remains the default for piped input/output.

File/shell tools, codemode, tool_search and configured MCP are activated alongside scientific tools. Skills, templates, themes, context files and extensions use the default SDK resource loader. Automatic compaction and model retries are enabled; recorded experimental failures still need explicit retries. [Complete controls and configuration](pi-features.md).
