import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { ROOT } from '../src/paths.js';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { connect, connectionRuntime, type ConnectionUI, type AgentConfig } from '../src/connections.js';
import { openResearchSession } from '../src/agent.js';
import { researchTools } from '../src/tools.js';

const fakeKey = 'opencode-test-key-never-send';
const text = 'Simulated OpenCode HTTP response';
const ui: ConnectionUI = {
  choose: async (_title, options) => options.find(o => o.id === 'reuse')?.id ?? options[0]!.id,
  message: value => assert(!value.includes(fakeKey)),
  interaction: { prompt: async () => fakeKey, notify: () => {} },
};
const sse = (events: object[], named = false) => new Response(events.map(event =>
  `${named ? `event: ${(event as { type: string }).type}\n` : ''}data: ${JSON.stringify(event)}\n\n`).join(''),
  { headers: { 'Content-Type': 'text/event-stream' } });
function completions(tool = false) {
  return sse([{ id: 'chat-test', object: 'chat.completion.chunk', choices: [{ index: 0, delta: tool
    ? { role: 'assistant', tool_calls: [{ index: 0, id: 'call_status', type: 'function', function: { name: 'project_status', arguments: '{}' } }] }
    : { role: 'assistant', content: text }, finish_reason: null }] },
  { id: 'chat-test', object: 'chat.completion.chunk', choices: [{ index: 0, delta: {}, finish_reason: tool ? 'tool_calls' : 'stop' }],
    usage: { prompt_tokens: 10, completion_tokens: 4, total_tokens: 14 } }]);
}
function anthropic() {
  return sse([
    { type: 'message_start', message: { id: 'msg_test', type: 'message', role: 'assistant', content: [], model: 'test', stop_reason: null, usage: { input_tokens: 10, output_tokens: 0 } } },
    { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
    { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text } },
    { type: 'content_block_stop', index: 0 },
    { type: 'message_delta', delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 4 } },
    { type: 'message_stop' },
  ], true);
}
function responses() {
  const item = { id: 'msg_test', type: 'message', role: 'assistant', content: [{ type: 'output_text', text, annotations: [] }] };
  return sse([
    { type: 'response.created', response: { id: 'resp_test', status: 'in_progress', output: [] } },
    { type: 'response.output_item.added', output_index: 0, item: { ...item, content: [] } },
    { type: 'response.content_part.added', item_id: item.id, output_index: 0, content_index: 0, part: { type: 'output_text', text: '', annotations: [] } },
    { type: 'response.output_text.delta', item_id: item.id, output_index: 0, content_index: 0, delta: text },
    { type: 'response.output_item.done', output_index: 0, item },
    { type: 'response.completed', response: { id: 'resp_test', status: 'completed', output: [item], usage: { input_tokens: 10, output_tokens: 4, total_tokens: 14 } } },
  ], true);
}

test('Zen/Go onboarding stores separate keys, reuses them and preserves previous selection on cancellation', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'repi-opencode-auth-'));
  const authPath = join(directory, 'auth.json');
  try {
    const runtime = await connectionRuntime(authPath);
    let saved: AgentConfig | undefined;
    for (const name of ['opencode', 'opencode-go'] as const) {
      const config = await connect(directory, name, ui, 'glm-5.3', runtime, value => { saved = value; });
      assert.equal(config.provider, name); assert.equal(config.authMode, 'api_key'); assert.equal(saved?.provider, name);
    }
    const keys = JSON.parse(readFileSync(authPath, 'utf8'));
    assert.equal(keys.opencode.key, fakeKey); assert.equal(keys['opencode-go'].key, fakeKey);
    assert.equal(statSync(authPath).mode & 0o777, 0o600);
    const noPrompt = { ...ui, interaction: { ...ui.interaction, prompt: async () => { throw new Error('reuse must not prompt'); } } };
    await connect(directory, 'opencode', noPrompt, 'claude-sonnet-4-6', runtime, value => { saved = value; });
    assert.equal(saved?.model, 'claude-sonnet-4-6');
    const cancelled = { ...ui, choose: async () => 'replace', interaction: { ...ui.interaction, prompt: async () => { throw new Error('cancelled'); } } };
    await assert.rejects(connect(directory, 'opencode-go', cancelled, 'glm-5.3', runtime, value => { saved = value; }), /Connection setup did not complete/);
    assert.equal(saved?.provider, 'opencode');
    await runtime.logout('opencode'); assert.equal(await runtime.checkAuth('opencode'), undefined);
    assert((await runtime.checkAuth('opencode-go'))?.type === 'api_key');
    await assert.rejects(connect(directory, 'opencode-go', ui, 'claude-sonnet-4-6', runtime), /Unknown model/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('Native OpenCode adapters stream using the correct routes, API key, client identity and session header', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'repi-opencode-http-'));
  const originalFetch = globalThis.fetch;
  try {
    const runtime = await connectionRuntime(join(directory, 'auth.json'));
    const cases = [
      ['opencode', 'glm-5.3', '/zen/v1/chat/completions', completions],
      ['opencode', 'claude-sonnet-4-6', '/zen/v1/messages', anthropic],
      ['opencode', 'gpt-5.3-codex', '/zen/v1/responses', responses],
      ['opencode', 'gemini-3.1-pro', '/zen/v1/models/gemini-3.1-pro:streamGenerateContent', () => sse([{ candidates: [{ content: { role: 'model', parts: [{ text }] }, finishReason: 'STOP' }], usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 4, totalTokenCount: 14 } }])],
      ['opencode-go', 'glm-5.3', '/zen/go/v1/chat/completions', completions],
      ['opencode-go', 'minimax-m3', '/zen/go/v1/messages', anthropic],
      ['opencode-go', 'gpt-6-luna', '/zen/go/v1/responses', responses],
    ] as const;
    for (const [provider, modelId, path, response] of cases) {
      await runtime.setRuntimeApiKey(provider, fakeKey);
      let requested = false;
      globalThis.fetch = async (input, init) => {
        const req = new Request(input, init); const url = new URL(req.url);
        requested = true; assert.equal(url.origin, 'https://opencode.ai'); assert.equal(url.pathname, path);
        assert.match(req.headers.get('user-agent') ?? '', /^ResearchPi\//);
        assert.equal(req.headers.get('x-opencode-client'), 'ResearchPi');
        assert.equal(req.headers.get('x-opencode-session'), 'test-conversation');
        assert([req.headers.get('authorization'), req.headers.get('x-api-key'), req.headers.get('x-goog-api-key')].some(value => value?.includes(fakeKey)));
        assert.equal((await req.json()).model ?? modelId, modelId);
        return response();
      };
      const model = runtime.getModel(provider, modelId)!;
      const result = await runtime.completeSimple(model, { messages: [{ role: 'user', content: 'Test', timestamp: Date.now() }] },
        { sessionId: 'test-conversation', transport: 'sse', maxRetries: 0 });
      assert(requested, `${provider}/${modelId} did not send a request: ${result.errorMessage}`);
      assert.equal(result.stopReason, 'stop', result.errorMessage);
      assert(result.content.some(value => value.type === 'text' && value.text === text));
    }
  } finally { globalThis.fetch = originalFetch; rmSync(directory, { recursive: true, force: true }); }
});

test('OpenCode session executes a bounded research tool and retains its routing ID when resumed', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'repi-opencode-session-'));
  const originalFetch = globalThis.fetch;
  const oldData = process.env.RESEARCH_PI_DATA_DIR, oldKey = process.env.OPENCODE_API_KEY;
  process.env.RESEARCH_PI_DATA_DIR = join(directory, 'data'); process.env.OPENCODE_API_KEY = fakeKey;
  try {
    for (const provider of ['opencode', 'opencode-go']) {
      const project = join(directory, provider);
      const ids: string[] = []; let requests = 0;
      globalThis.fetch = async (input, init) => {
        const req = new Request(input, init);
        assert.equal(new URL(req.url).pathname, provider === 'opencode' ? '/zen/v1/chat/completions' : '/zen/go/v1/chat/completions');
        assert.equal(req.headers.get('authorization'), `Bearer ${fakeKey}`);
        assert.match(req.headers.get('user-agent') ?? '', /^ResearchPi\//);
        assert.equal(req.headers.get('x-opencode-client'), 'ResearchPi');
        ids.push(req.headers.get('x-opencode-session')!); assert(ids.at(-1));
        const body = await req.json(); assert(body.tools.some((tool: any) => tool.function.name === 'project_status'));
        requests++; return completions(requests === 1);
      };
      const config: AgentConfig = { provider, model: 'glm-5.3', authMode: 'api_key' };
      const opened = await openResearchSession(project, config, researchTools(project));
      try {
        await opened.session.prompt('Check project status'); opened.savePointer();
        assert(opened.session.messages.some(m => m.role === 'toolResult' && m.toolName === 'project_status' && !m.isError));
        assert.equal(requests, 2);
      } finally { opened.session.dispose(); }
      const resumed = await openResearchSession(project, config, researchTools(project));
      try { await resumed.session.prompt('Resume'); } finally { resumed.session.dispose(); }
      assert.equal(requests, 3); assert(ids.every(id => id === ids[0]));
    }
  } finally {
    globalThis.fetch = originalFetch;
    if (oldData === undefined) delete process.env.RESEARCH_PI_DATA_DIR; else process.env.RESEARCH_PI_DATA_DIR = oldData;
    if (oldKey === undefined) delete process.env.OPENCODE_API_KEY; else process.env.OPENCODE_API_KEY = oldKey;
    rmSync(directory, { recursive: true, force: true });
  }
});

test('CLI exposes Zen/Go catalogs, connects with environment credentials, switches models and refuses piped keys', () => {
  const directory = mkdtempSync(join(tmpdir(), 'repi-opencode-cli-'));
  const env = { ...process.env, RESEARCH_PI_DATA_DIR: join(directory, 'data'), OPENCODE_API_KEY: fakeKey };
  const run = (args: string[], input = '', key = true) => {
    const selectedEnv = { ...env };
    if (!key) delete (selectedEnv as NodeJS.ProcessEnv).OPENCODE_API_KEY;
    return spawnSync(process.execPath, [join(ROOT, 'dist/cli.js'), '--project', directory, ...args],
      { encoding: 'utf8', input, env: selectedEnv, timeout: 20000 });
  };
  try {
    for (const provider of ['opencode', 'opencode-go']) {
      const models = run(['models', provider]); assert.equal(models.status, 0, models.stderr);
      assert(JSON.parse(models.stdout).some((model: { id: string }) => model.id === 'glm-5.3'));
      const connected = run(['connect', provider, '--model', 'glm-5.3'], 'reuse\n');
      assert.equal(connected.status, 0, connected.stderr); assert(!connected.stderr.includes(fakeKey));
      const state = JSON.parse(run(['connection']).stdout);
      assert.equal(state.selected.provider, provider); assert.equal(state.credentialsConfigured, true);
      assert.equal(run(['model', 'glm-5.3-flash']).status, 0);
      assert.equal(JSON.parse(run(['connection']).stdout).selected.model, 'glm-5.3-flash');
      assert.equal(run(['disconnect', provider]).status, 0);
      const refused = run(['connect', provider, '--model', 'glm-5.3'], fakeKey + '\n', false);
      assert.equal(refused.status, 1); assert.match(refused.stderr, /Connection setup did not complete/);
      assert(![refused.stdout, refused.stderr].join('').includes(fakeKey));
      assert.equal(JSON.parse(run(['connection']).stdout).selected.model, 'glm-5.3-flash');
    }
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
