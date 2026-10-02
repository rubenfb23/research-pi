# Persistent manuscript policy integration

Reviewed on 2026-10-02 against ResearchPi's current source and its pinned Pi SDK 1.0.0. This note records design findings, not implemented capabilities or a reference-verification result.

## Recommended integration

Store the English manuscript policy as a bundled resource and compose it into `ResourceLoader.getSystemPrompt()` alongside `resources/system.md` in `openResearchSession`. Apply the same composition for every project, fresh conversation, resumed session and provider. ResearchPi already owns its custom resource loader; no Pi fork or default directory discovery is needed. Pi's official SDK documents this boundary and provides a checked example for replacing or appending system instructions. [Pi SDK 1.0.0](https://github.com/earendil-works/pi/blob/v1.0.0/packages/coding-agent/docs/sdk.md), [custom prompt example](https://github.com/earendil-works/pi/blob/v1.0.0/packages/coding-agent/examples/sdk/03-custom-prompt.ts).

This is preferable to storing mandatory rules only in the scientific library: retrieval depends on the model deciding to call a tool, and retrieved notes are evidence rather than the application's behavioral instructions. Keep detailed examples and venue snapshots in optional retrieval; keep the compact mandatory policy in the system prompt. This is an engineering recommendation, not a guarantee that any LLM will comply.

Pi builds its base prompt from the loader, prepares the prompt/tool loadout before accepted runs, and changes the model without clearing those base options. Its session manager checkpoints the current structured system message when compacting; replay includes that checkpoint before the summary. These mechanisms support persistent rules after resumption and compaction. Updating a resource on disk does not imply hot reloading an already open ResearchPi process; reopen or explicitly reload the session. [AgentSession source](https://github.com/earendil-works/pi/blob/v1.0.0/packages/coding-agent/src/core/agent-session.ts), [SessionManager source](https://github.com/earendil-works/pi/blob/v1.0.0/packages/coding-agent/src/core/session-manager.ts).

## Policy wording and scope

Translate preferences into concrete editorial actions rather than copying conversational wording. Apply them silently: do not announce the policy, repeat its checklist at greetings, or add a compliance preamble. Silent application concerns presentation; it does not justify hiding missing evidence, substantive limitations or failed verification.

- State the same evidence-supported contribution clearly in the abstract, the introduction's closing contribution paragraph, and the conclusion. Follow that introductory paragraph with a short article roadmap.
- Use impersonal manuscript prose. Introduce concepts and techniques in plain language before relying on their names, and expand abbreviations on first use. Treat the abstract as independently readable. Avoid insulting assumptions about the reader; provide explicit conceptual steps.
- Use the requested empirical section sequence as a default, adapted to the article type and current venue instructions. Preserve theory, survey, dataset and systems distinctions already represented by `paper-profiles.json`.
- Avoid em dashes in generated prose. Do not alter mathematical minus signs, code, identifiers, quotations or original bibliographic titles to enforce punctuation style.
- Write limitations concisely and constructively, stating consequences and plausible mitigation or future work. Do not recast a serious weakness as a strength or omit a limitation that changes the claims. NeurIPS explicitly expects accurate contribution scope and transparent limitations and says reviewers should not penalize honesty. [NeurIPS checklist](https://neurips.cc/public/guides/PaperChecklist).

## Figures and tables

In an ordinary draft, put each figure immediately after its first mention, explain it in the surrounding text, and keep captions concise but sufficient to interpret labels, units and uncertainty. Use clear tables, explained names, selective bold emphasis and no merged cells by default.

Treat exact placement, font size and caption format as editorial defaults subject to the target template. For example, Nature's final submission order separates tables and figure legends, while its figure guide specifies final-size fonts rather than matching body text size. IEEE recommends vector graphics and checking publication dimensions. [Nature final submission](https://www.nature.com/nature/for-authors/final-submission), [Nature figure panels](https://research-figure-guide.nature.com/figures/building-and-exporting-figure-panels/), [IEEE resolution and size](https://journals.ieeeauthorcenter.ieee.org/create-your-ieee-journal-article/create-graphics-for-your-article/resolution-and-size/).

Pleasant complementary colors alone do not ensure grayscale or accessible differentiation. Prefer labels, markers and line styles before adding textures; inspect the actual final-size grayscale rendering before claiming print readability. ACM guidance recommends encoding distinctions through additional visual channels. [SIGCSE Virtual 2026 accessibility guidance](https://sigcsevirtual2026.acm.org/info/accessibility-tips-for-authors).

## References require actual retrieval

Current `reviewManifest` checks a curated note's identifier and URL. It does not check DOI existence, author identity, title, journal, volume or pages. System instructions cannot create those checks. Until a lookup tool returns evidence, a reference must remain unverified, and the assistant must not claim a Google search, DOI resolution or metadata comparison occurred.

A future verifier should retain the original citation, retrieve authoritative metadata, record retrieval date/source and compare title, authors and publication fields. Crossref exposes deposited bibliographic metadata through `/works/{doi}` and journal works by ISSN; metadata may be incomplete or incorrect, so disagreement requires publisher or repository inspection rather than silently overwriting the citation. [Crossref REST API](https://www.crossref.org/documentation/retrieve-metadata/rest-api/).

Crossref is not the registrar for every DOI: a Crossref 404 alone does not establish that a DOI is invalid. Check the registration agency and route appropriately, including DataCite when relevant. Encode DOI values safely and use bounded requests. [Crossref official API documentation](https://github.com/CrossRef/rest-api-doc), [DataCite API](https://support.datacite.org/docs/api).

As implementation policy, tolerate initials, accents and equivalent author-name forms without treating an ambiguous name as proven identity. Compare titles and bibliographic fields after harmless presentation normalization, preserving original strings; missing volume/pages or article numbers require explicit handling. For works without DOIs, a search hit establishes discoverability, while a publisher, institutional repository or library record provides stronger bibliographic evidence.

Cite original sources and relevant recent work together. Search for two or three topically relevant papers in a known target journal, but cite only papers that support the manuscript; neither recency nor venue alone is evidence of relevance. Do not invent candidates or pad citations to satisfy a quota.

## Verification targets

Inspect the effective prompt and provider request on fresh and resumed projects, after model/provider changes, and after real compaction. Check packaging includes the policy resource. Use offline transport tests to prove delivery; use scoped live evaluations to assess behavior separately. Review generated prose for clear contribution repetition, introductory roadmap, expanded abbreviations and honest limitations. Structural tests cannot establish novelty, narrative quality, author identity, source support or print readability.
