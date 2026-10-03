# ResearchPi, Claude Code and Codex

Checked 2026-10-03. This compares documented capabilities and ResearchPi's implementation, not measured superiority. Versions, account access, extensions and provider choices affect behavior.

| Area | ResearchPi | Claude Code | Codex CLI |
| --- | --- | --- | --- |
| Primary workflow | Research protocols, execution evidence and manuscript support | Coding workflows; customizable for research | Coding/repository workflows; customizable for research |
| Files and commands | Native Pi tools with host-user permissions | Built-in code/file/command tools | Built-in repository/file/command tools |
| Research rules | Bundled scientific/editorial instructions and supported runner validators | Configurable project instructions, skills and tools | Configurable project instructions, skills and tools |
| Experiment evidence | Dedicated ten-seed classification runner, receipts, predictions and aggregation; CSV/custom Python supported | Can implement/integrate an evidence workflow through code/tools | Can implement/integrate an evidence workflow through code/tools |
| Bibliography | DOI/metadata checks with recorded Crossref/DataCite sources; semantic support remains human review | Can use configured tools or implement equivalent checking | Can use configured tools or implement equivalent checking |
| Extensibility | Pi resources, skills, extensions, MCP and RPC | Skills, hooks, plugins, MCP and subagents | Skills, plugins, MCP, automation and subagents |
| Model access | Pi-supported providers; tested coverage is partial | Claude and documented supported provider routes | OpenAI and documented supported provider routes |
| Execution control | No host sandbox; custom code requires review | Permissions and configurable shell sandbox, with documented scope | Configurable permissions and sandbox boundaries |
| Comparative evidence | Microtask runner and scoped verification records | No comparative score asserted here | No comparative score asserted here |

Claude Code already provides code execution, skills, hooks, MCP, plugins and subagents. Its shell sandbox is not universal isolation for all tools. [Official overview](https://code.claude.com/docs/en/overview), [extensions](https://code.claude.com/docs/en/features-overview), [sandbox scope](https://code.claude.com/docs/en/sandboxing).

Codex CLI supports repository execution, reusable instructions/plugins, MCP, session recovery, review and configurable permissions. [Official CLI documentation](https://learn.chatgpt.com/docs/codex/cli). Its noninteractive mode provides structured events and final-answer files used by the evaluation adapter. [Noninteractive mode](https://learn.chatgpt.com/docs/non-interactive-mode).

ResearchPi's proposed value is an integrated scientific evidence workflow. Both alternatives can be adapted to the same research problems. A comparison must distinguish a built-in feature, an extension/custom workflow and a verified result; absence from this table is not evidence that a competitor cannot do it.

Use the [evaluation protocol](benchmarks.md) to separate same-model harness tests from product comparisons with different models. A fluent answer, feature count, passing offline fixture or a single live response is insufficient to claim better research quality.
