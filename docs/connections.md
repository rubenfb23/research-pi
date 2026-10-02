# Startup and model connections

Native [installers](installation.md) and `npm run install:cli` provide the `repi` command. From a source checkout, use `node repi` or `npm start` with Node >=22.19 and npm. The launcher installs pinned dependencies when missing and rebuilds changed code. Native packages already include the runtime, dependencies and compiled CLI.

ResearchPi's interface, prompts, errors, scientific resources and generated paper scaffolds use English, independently of terminal locale. Model instructions request English responses. User-supplied text and existing evidence are retained verbatim for provenance.

Python 3.14 with venv support is needed only for `demo`, `run` and experiment tools. ResearchPi creates the isolated environment and installs `requirements.lock` when needed. Prepare it explicitly with `repi setup --experiments`. The source launcher does not install Node or system packages and does not use sudo.

## Claude

`repi connect claude` lists Anthropic models and requests an API key without echoing it. Obtain a key from [Claude Console](https://platform.claude.com/settings/keys). Calls are billed to that API key. Setup does not validate it over the network; the first successful response verifies authentication, balance and model access.

`ANTHROPIC_API_KEY` and `RESEARCH_PI_API_KEY` are supported for execution without storing a key. Use `config --provider anthropic --model <id>` for explicit environment-based configuration. Onboarding can reuse credentials discovered by Pi.

ResearchPi does not offer Claude Pro/Max subscription login or extract Claude Code tokens. [Anthropic's policy](https://code.claude.com/docs/en/legal-and-compliance) directs custom applications to API keys or supported cloud providers.

## Codex / OpenAI with ChatGPT

`repi connect codex` uses **Sign in with ChatGPT**, implemented by Pi 1.0.0's `openai` provider. It opens a browser and resumes terminal setup after authorization. Open the displayed link manually if needed. If the local callback cannot reach the process, paste the complete redirect URL when requested; this input is hidden.

Pi handles PKCE, OAuth state, exchange, credential storage and refresh. ResearchPi supplies a stable installation identifier. The local callback uses `127.0.0.1:1455`; the SDK offers manual URL entry if that port is occupied.

ResearchPi does not read or copy `~/.codex/auth.json`. This connects to OpenAI through Pi and the Responses API; it does not launch Codex CLI or integrate its tools. Pi displays its own name in the authorization flow.

Availability depends on authorization, account plan and model. The installed catalog is a selector, not an access test. Only a successful real response verifies access. See [Sign in with ChatGPT](https://developers.openai.com/siwc/) and [models and inference](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference). Live authenticated integration remains unverified until tested with a real account.

`repi connect openai` provides API-key authentication with API billing as an alternative. It shares the `openai` credential entry with `codex`; changing accounts or authentication methods replaces that entry.

## OpenCode Zen / Go

Use `repi connect opencode` for Zen or `repi connect opencode-go` for Go. Both accept an OpenCode Console API key. `repi models opencode` and `repi models opencode-go` show their installed SDK catalogs.

Stored credentials are scoped separately by provider. Both support `OPENCODE_API_KEY` for environment-based authentication. Model switching, status, disconnect and `/connect` work with both. See the [OpenCode guide](opencode.md) for endpoints, client identity, Go's usage scope and verification limits.

## Daily use and data

`repi` resumes the chat; `repi chat '<question>'` submits a prompt and exits. `models <connection>` lists models; `model` opens the picker; `model <id>` switches without deleting history or reconnecting. Chat provides `/model` and `/models` too. `connect <connection> --model <id>` skips model selection.

`connection` reports the selected model and whether credentials are configured. It sends no model request. `disconnect <connection>` removes the locally stored credential without revoking it at the provider; environment credentials remain active until removed separately.

Each project keeps its selected model and conversation under `<project>/.research-pi/`. New projects inherit the installation default. Switching providers retains conversation history, which may be sent to the newly selected provider on the next prompt. Scientific protocol and results are stored separately.

Source-checkout credentials live at `<checkout>/.research-pi/connections/auth.json`. Native packages use the [per-user installation directory](installation.md#data-and-usage). Files are excluded from Git and created with mode 0600 on POSIX; directories use 0700. Credentials are stored without encryption. They are not exposed as command arguments or scientific artifacts; the model has no credential-reading tool. Legacy project credentials remain supported through advanced configurations without `authMode`. A new clone needs its own connection.

For CI, use environment variables and explicit configuration. Piped secret entry is rejected. `chat --offline` and `--offline` test the harness without provider calls; simulated transport does not verify real authentication or inference.

Cancelled or failed connection setup leaves the previous selection intact. Retry `connect` and check browser authorization. Inference errors identify HTTP authentication, quota, server and known workspace-policy failures without displaying raw provider responses. For inference errors, check account access, balance, network and the selected model. Login errors do not print provider token responses.

After changing code, run demos in a new project, for example `repi --project examples/demo-v3 demo`. Earlier evidence remains intact and its audit reports incompatibility with the new code fingerprint. The launcher does not rewrite evidence to hide that change.

Sources reviewed on 2026-10-02: [Pi providers](https://pi.dev/docs/latest/providers), [Codex authentication](https://developers.openai.com/codex/auth), [Sign in with ChatGPT and app-server](https://developers.openai.com/siwc/token-sharing-open-source/codex-app-server), [Claude credentials policy](https://code.claude.com/docs/en/legal-and-compliance), [OpenCode](opencode.md).
