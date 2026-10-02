import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ModelRuntime } from '@earendil-works/pi-coding-agent';
import { connect, connectionName, deviceId, type AgentConfig, type ConnectionUI } from '../src/connections.js';

async function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'researchpi-auth-'));
  const authPath = join(dir, 'auth.json');
  const runtime = await ModelRuntime.create({ authPath, modelsPath: null, refreshOnCreate: false });
  const messages: string[] = [];
  let persisted: AgentConfig | undefined;
  const ui: ConnectionUI = {
    choose: async (_title, options) => options.find(o => o.id === 'replace')?.id ?? options[0]!.id,
    message: text => messages.push(text),
    interaction: { prompt: async () => 'researchpi-fake-api-key', notify: () => {} },
  };
  return { dir, authPath, runtime, ui, messages, persist: (config: AgentConfig) => { persisted = config; },
    get persisted() { return persisted; }, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

test('Claude onboarding stores an API key through Pi, private permissions and no secret in output', async () => {
  const f = await fixture();
  try {
    const config = await connect(f.dir, 'claude', f.ui, 'claude-sonnet-4-6', f.runtime, f.persist);
    assert.deepEqual(f.persisted, config);
    assert.equal(config.authMode, 'api_key');
    assert.equal(JSON.parse(readFileSync(f.authPath, 'utf8')).anthropic.key, 'researchpi-fake-api-key');
    assert.equal(statSync(f.authPath).mode & 0o777, 0o600);
    assert(!f.messages.join('\n').includes('researchpi-fake-api-key'));
    assert.match(f.messages.join('\n'), /first real response/);
  } finally { f.cleanup(); }
});

test('Codex uses current OpenAI ChatGPT OAuth SDK flow with PKCE and persists the resulting credential', async () => {
  const f = await fixture();
  const originalFetch = globalThis.fetch;
  let url: URL | undefined, exchanged = false;
  try {
    globalThis.fetch = async (input, init) => {
      assert.equal(String(input), 'https://auth.openai.com/api/accounts/oauth/token');
      const body = new URLSearchParams(String(init?.body));
      assert.equal(body.get('grant_type'), 'authorization_code');
      assert.equal(body.get('code'), 'test-code');
      assert(body.get('code_verifier'));
      exchanged = true;
      return new Response(JSON.stringify({ access_token: 'test-access', refresh_token: 'test-refresh',
        id_token: 'test-id-token', expires_in: 3600, scope: 'openid chatgpt.tokens.use.direct' }), { status: 200 });
    };
    f.ui.interaction = {
      notify: event => { if (event.type === 'auth_url') url = new URL(event.url); },
      prompt: async prompt => {
        assert.equal(prompt.type, 'manual_code'); assert(url);
        assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
        assert.equal(url.searchParams.get('resource'), 'https://api.openai.com/v1');
        assert.equal(url.searchParams.get('ext_agent_host_id'), 'urn:uuid:' + deviceId());
        return `http://127.0.0.1:1455/auth/callback?code=test-code&state=${url.searchParams.get('state')}&client_id=test-client`;
      },
    };
    const config = await connect(f.dir, 'codex', f.ui, 'gpt-5.3-codex', f.runtime, f.persist);
    assert(exchanged); assert.equal(config.provider, 'openai'); assert.equal(config.authMode, 'oauth');
    const credential = JSON.parse(readFileSync(f.authPath, 'utf8')).openai;
    assert.equal(credential.access, 'test-access'); assert.equal(credential.clientId, 'test-client');
    assert.equal(statSync(f.authPath).mode & 0o777, 0o600);
    assert(!JSON.stringify(f.persisted).includes('test-access'));
  } finally { globalThis.fetch = originalFetch; f.cleanup(); }
});

test('Invalid OAuth state and cancelled login do not commit a new model configuration or credential', async () => {
  const f = await fixture();
  let tokensRequested = false;
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => { tokensRequested = true; throw new Error('unexpected token request'); };
    f.ui.interaction.prompt = async () => 'http://127.0.0.1:1455/auth/callback?code=test&state=wrong&client_id=test';
    await assert.rejects(connect(f.dir, 'codex', f.ui, 'gpt-5.3-codex', f.runtime, f.persist), /Connection setup did not complete/);
    assert(!tokensRequested); assert.equal(f.persisted, undefined);
    assert.equal(await f.runtime.checkAuth('openai'), undefined);
    f.ui.interaction.prompt = async () => { throw new Error('cancelled'); };
    await assert.rejects(connect(f.dir, 'claude', f.ui, 'claude-sonnet-4-6', f.runtime, f.persist), /Connection setup did not complete/);
    assert.equal(f.persisted, undefined);
  } finally { globalThis.fetch = originalFetch; f.cleanup(); }
});

test('Unknown models are rejected before login; existing credentials can be reused', async () => {
  const f = await fixture();
  let prompts = 0;
  try {
    f.ui.interaction.prompt = async () => { prompts++; return 'test-key'; };
    await assert.rejects(connect(f.dir, 'claude', f.ui, 'imaginary-model', f.runtime, f.persist), /Unknown model/);
    assert.equal(prompts, 0);
    await connect(f.dir, 'claude', f.ui, 'claude-sonnet-4-6', f.runtime, f.persist);
    f.ui.choose = async (_title, options) => options.find(o => o.id === 'reuse')!.id;
    await connect(f.dir, 'claude', f.ui, 'claude-haiku-4-5', f.runtime, f.persist);
    assert.equal(prompts, 1); assert.equal(f.persisted?.model, 'claude-haiku-4-5');
    assert.throws(() => connectionName('other'), /Choose/);
    assert.equal(deviceId(), deviceId());
  } finally { f.cleanup(); }
});
