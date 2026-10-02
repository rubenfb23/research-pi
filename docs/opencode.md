# OpenCode Zen and Go

Reviewed on **October 2, 2026**. ResearchPi integrates the providers from Pi SDK packages `@earendil-works/pi-ai` and `@earendil-works/pi-coding-agent` **1.0.0**, pinned in [package-lock.json](../package-lock.json). It does not require the OpenCode application or an `opencode serve` server.

## Connect

Zen provides API access to selected models and bills requests. Go provides usage plans with an API key. Obtain your key from the OpenCode console and choose the product available in your account. [Zen](https://opencode.ai/docs/zen/), [Go](https://opencode.ai/docs/go/).

```bash
# OpenCode Zen
repi connect opencode
repi

# OpenCode Go
repi connect opencode-go
repi
```

The wizard asks for the key without displaying it and lets you choose a model. To inspect the catalog or select a model explicitly:

```bash
repi models opencode
repi connect opencode --model claude-sonnet-4-6

repi models opencode-go
repi connect opencode-go --model glm-5.3-flash
```

These identifiers are present in the reviewed SDK catalog. Their appearance in `models` **does not certify access in your account**: connecting saves your selection and credentials; the first real response checks authentication, availability, and permissions. The installed catalog may differ from the current service. [Zen catalog](https://opencode.ai/zen/v1/models), [Go catalog](https://opencode.ai/zen/go/v1/models), [pinned SDK sources](#sdk-sources).

## Credentials

Both SDK providers recognize exactly **`OPENCODE_API_KEY`**. They do not define `OPENCODE_GO_API_KEY` or `OPENCODE_ZEN_API_KEY`. When that environment variable is set, both can use its value. A stored key for a provider takes precedence over the environment variable. [Pinned SDK sources](#sdk-sources).

ResearchPi stores authentication entries under the distinct identifiers `opencode` and `opencode-go`. Connecting or disconnecting one must therefore preserve the other provider's stored credential. This local separation does not mean that OpenCode requires two different keys: its documentation does not establish such a requirement. [Pinned SDK sources](#sdk-sources), [ResearchPi connections](connections.md).

## Routes and formats

The SDK preserves each model's API format; it does not treat every model as using a single OpenAI-compatible API. The documented service routes are:

| Service | Anthropic Messages | Chat Completions | Responses |
| --- | --- | --- | --- |
| Zen | `https://opencode.ai/zen/v1/messages` | `https://opencode.ai/zen/v1/chat/completions` | `https://opencode.ai/zen/v1/responses` |
| Go | `https://opencode.ai/zen/go/v1/messages` | `https://opencode.ai/zen/go/v1/chat/completions` | `https://opencode.ai/zen/go/v1/responses` |

Zen also publishes models using the Google format under `/zen/v1/models/<model>`. [Official Zen endpoints](https://opencode.ai/docs/zen/#endpoints), [official Go endpoints](https://opencode.ai/docs/go/#endpoints).

In the Pi catalog, Anthropic models have a `baseUrl` without `/v1` (`https://opencode.ai/zen` or `https://opencode.ai/zen/go`); their adapter appends the appropriate route. The reviewed OpenAI and Google models have bases including `/v1`. Preserve this configuration when using the SDK. [Pinned SDK sources](#sdk-sources).

Go asks clients to identify themselves with their own `User-Agent` and send a stable conversation identifier in `x-opencode-session`. It is intended for typical coding-agent requests; this integration does not establish that the provider accepts every research use. ResearchPi sends `User-Agent: ResearchPi/<version>` and `x-opencode-client: ResearchPi`; Pi adds the session header using the conversation identifier, preserved when resuming. [Go client requirements](https://opencode.ai/docs/go/#where-can-i-use-it), [pinned SDK sources](#sdk-sources).

## Verification and limitations

The SDK review confirmed 79 Zen chat models and 29 Go chat models in the installed catalog, their formats, their bases, and API-key resolution. This is a local check without real credentials. Tests using simulated HTTP responses check selection, routes for seven provider/format combinations, headers, separate storage, tool calls, and stable sessions on resume. They do not establish successful inference against OpenCode.

Without a valid API key, real authentication, real responses, and tool use with each model remain unverified. Check limits, balances, availability, and policies in your provider account. Go lets you configure use of your Zen balance after reaching its quota; that option belongs to the console and ResearchPi does not enable it. [Go](https://opencode.ai/docs/go/#usage-beyond-limits).

## SDK sources

Primary sources inspected in the installation pinned by [package-lock.json](../package-lock.json), inside `node_modules` after `npm ci`:

- `@earendil-works/pi-ai/dist/providers/opencode.js` and `opencode-go.js`: identifiers, authentication, and adapters.
- `@earendil-works/pi-ai/dist/providers/data/opencode.json` and `opencode-go.json`: catalog, format, and base for each model.
- `@earendil-works/pi-ai/dist/auth/helpers.js`: stored key takes precedence over the environment variable; prompt has type `secret`.
- `@earendil-works/pi-ai/dist/env-api-keys.js`: both providers use `OPENCODE_API_KEY`.
- `@earendil-works/pi-ai/dist/providers/opencode-headers.js`: `x-opencode-session` from `sessionId`.
- `@earendil-works/pi-coding-agent/dist/core/auth-storage.js`: storage indexed by provider identifier.

The pinned version makes this review reproducible. Updating Pi requires reviewing these details again and running the integration tests.
