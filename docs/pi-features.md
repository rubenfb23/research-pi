# Pi capabilities and conversations

ResearchPi 1.4.0 embeds Pi SDK 1.0.0 and uses its native interactive interface, session runtime and resource discovery. The mandatory research, manuscript and web policies remain composed into each session, including new conversations, forks, reloads and project switches. Original Pi code is consumed as a dependency, with its licenses and notices retained.

## Start and manage conversations

```sh
repi
repi --new "Causal representation study"
repi chats list
repi chats list --all --query "representation"
repi chats new "Ablation study"
repi chats open CONVERSATION_ID
repi chats rename CONVERSATION_ID "Revised study"
repi chats show CONVERSATION_ID --tree
repi chats fork CONVERSATION_ID --name "Alternative hypothesis"
repi --session CONVERSATION_ID
```

In the interactive interface, use `/new`, `/chats [search text]`, `/resume`, `/name`, `/fork`, `/clone`, `/tree`, `/session`, `/export` and `/import`. `/chats` searches and opens conversations across visited projects. `/resume` is Pi's searchable selector with project/all-project views. `/tree` navigates branches, while `/fork` creates another conversation from an earlier user message. `/clone` duplicates the active conversation position. Names, history, branches and selected models use Pi's JSONL session format.

Sessions retain their project directory. Opening another project's conversation recreates the tools and resource loader for that project. A new conversation does not reset that project's datasets, protocols, measurements or web sources. Start another project directory for an independent evidence store. Short IDs are accepted by CLI commands only when an eight-character-or-longer prefix or suffix is unambiguous.

`chats new` explicitly persists an empty conversation. The interactive `/new` follows Pi's lazy persistence: it becomes a stored conversation after the first submitted message. Names and transcripts are local plaintext, never automatically shared. `/share` and `/bug` are native Pi actions with their documented external destinations; they run only when explicitly invoked.

## Activated capabilities

| Capability | Integration |
| --- | --- |
| File tools | Native read, write, edit, grep, find and ls |
| Local execution | Native bash, plus PowerShell on Windows; requested Python can be run through these tools |
| Codemode | Native JavaScript composition of registered tools, activated alongside direct tools |
| Tool discovery | Native tool_search loads deferred tools |
| MCP | Native MCP extension connects configured stdio/HTTP servers and provides `/mcp` |
| Resources | Project/user skills, extensions, prompt templates, themes, context files and configured Pi packages |
| Context | Automatic compaction plus manual `/compact`, with scientific state outside the transcript |
| Recovery | Two model retries by default; recorded experimental failures still require explicit `run --retry` |
| Input during generation | Enter steers the current run; Alt+Enter queues a follow-up |
| Terminal | Native completion, file references, input history, multiline editor, model/settings selectors and themes |
| Programmatic modes | One-shot streamed answers, JSONL events and native JSONL RPC |

Use `/hotkeys` for the complete native keyboard map. Ctrl+T toggles provider-exposed reasoning; `/thinking` selects supported effort. `/settings` controls theme, context/retry behavior and other Pi settings. `/model` selects available registered models, `/login` configures provider authentication and `/logout` removes it. The compatibility `/connect [provider]` command prepares the native `/login` command in the editor; press Enter to open authentication. Existing `repi connect` onboarding remains available.

These are integrated capabilities, not a claim that every provider, third-party extension or external server has been verified. Native model catalogs do not guarantee account access. Tool execution uses the local user's permissions. Pi's general tools are not confined to the scientific worker and can modify ordinary project files; the previous restricted agent authority no longer applies. The bounded frozen runner still enforces its supported ten-seed protocol and audit checks. Arbitrary Python or shell experiments need retained per-run evidence and scientific review; they do not automatically receive runner receipts or certification. See [integrity](integrity.md).

## Resources and configuration

Run `repi resources` to inspect active tools, loaded resources, diagnostics and the agent directory. This initializes SDK extensions and configured MCP connections without requesting an inference response.

Global resources live in `<ResearchPi data>/pi/`: `settings.json`, `models.json`, `mcp.json`, `extensions/`, `skills/`, `prompts/` and `themes/`. Project resources use Pi's conventional `<project>/.pi/` equivalents, plus supported `AGENTS.md`/`CLAUDE.md` context and `.agents/skills` discovery. ResearchPi uses its own global directory rather than importing another application's credentials or configuration. Native `/trust` decisions are retained; a saved denial or global `defaultProjectTrust: "never"` prevents loading executable project resources. By default, an explicitly selected project is treated as trusted for this invocation, matching the requested activation of project resources.

A local MCP example:

```json
{
  "mcpServers": {
    "research-data": {
      "command": "/absolute/path/to/your/mcp-server",
      "args": [],
      "exposure": "deferred"
    }
  }
}
```

No MCP server is installed or configured automatically. Restart or `/reload` after changing resources. Skill bodies are loaded when their workflow is invoked; the mandatory scientific/editorial policies are always present independently of skill selection. Upstream Pi resource formats and package settings are supported; ResearchPi does not replicate Pi's standalone package-installation CLI.

Conversations now live in `<ResearchPi data>/pi/conversations/`. On visiting an existing project, its legacy `.research-pi/sessions/` files are copied into this shared SDK store without deleting or overwriting the originals. Its session pointer is updated when used. Legacy conversations from other projects become discoverable after visiting those project directories once. Reopening a continued imported chat uses the shared copy and does not replace it with the older original. Uninstallation preserves user data. Source checkouts retain checkout-local data; native packages use the [per-user installation directories](installation.md).

## Simple and programmatic modes

```sh
repi --plain
repi chat "Inspect the research project"
repi chat --json "Inspect the research project" > events.jsonl
repi rpc
```

`--plain` retains the previous scrolling interface and its project input history, including double-Tab lists, Up/Down recall and hidden credential entry. It is also selected automatically for piped input/output. Conversation commands and model tooling work there, but native theme selectors, custom extension UI and interactive MCP authentication require the native terminal interface. Use `/login` and `/settings` in native mode, or `repi connect` for simple onboarding.

JSON mode writes actual SDK events, not one JSON answer object. RPC accepts Pi's native JSONL commands for prompting, steering, follow-ups, tools, model state and sessions. Closing stdin shuts RPC down. `--offline` enables the deterministic test transport, which provides no scientific reasoning or inference-account validation.

## Verification

Integration tests execute real file mutations and shell code, codemode, a locally spawned MCP fixture, deferred discovery, resource loading/reloading, automatic compaction, retries, steering/follow-up queues, JSON and RPC. Tests cover legacy import, empty creation, search, renaming, forks and cross-project SDK rebinding with mandatory policy preservation. POSIX pseudo-terminal checks exercise the actual native and simple interfaces. Installed-runtime smoke checks exercise file tools, codemode and conversation new/resume on each packaging platform. Native Windows keyboard behavior and real external MCP/provider accounts remain separately unverified.

Primary implementation contracts are the bundled Pi 1.0.0 documentation: [SDK](https://github.com/earendil-works/pi/blob/v1.0.0/packages/coding-agent/docs/sdk.md), [sessions](https://github.com/earendil-works/pi/blob/v1.0.0/packages/coding-agent/docs/sessions.md), [extensions](https://github.com/earendil-works/pi/blob/v1.0.0/packages/coding-agent/docs/extensions.md), [settings](https://github.com/earendil-works/pi/blob/v1.0.0/packages/coding-agent/docs/settings.md), and [CLI integration](https://github.com/earendil-works/pi/blob/v1.0.0/packages/coding-agent/docs/cli-integration.md).
